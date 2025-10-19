import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  ScrollView,
  RefreshControl,
  TextInput,
  Alert,
  InteractionManager,
} from "react-native";

import { useAuth } from "@app/contexts/AuthContext";
import { supabase, supabaseConfig } from "@app/config/supabase.config";
import { ChallengeService, DiaryService } from "@core/services/firestore";
import type { UserProfileLite } from "@core/services/profileCache";
import ProfileCache from "@core/services/profileCache";
import { UserStatsService } from "@core/services/userStatsService";
import DayCard from "@features/diary/components/DayCard";
import Modal from "@shared/components/Modal";
import DiaryCard from "@features/diary/components/DiaryCard";
import { useBlockedIds } from "@shared/state/blockStore";
import { useAuthPrompt } from "@shared/auth/AuthPromptProvider";
import { spacing, typography, useAppTheme } from "@shared/theme";
import AppStatusBar from "@shared/theme/AppStatusBar";
import { formatDateTimeJP } from "@shared/utils/date";
import { navigateToUserDetail } from "@shared/utils/navigation";

interface DayDiaryItem {
  id: string;
  userId: string;
  content: string;
  createdAt: Date | string | { toDate?: () => Date };
  authorName?: string;
  authorAvatar?: string;
}

// NOTE: Defining row component OUTSIDE the screen component keeps the
// component identity stable across renders and prevents unnecessary
// re-mount/re-render of every row. Previously, defining this inside the
// component recreated the component type on each render, causing churn.
const DiaryItemRow: React.FC<{
  item: DayDiaryItem;
  authorName?: string;
  authorAvatar?: string;
  averageDays: number;
  onAuthorPress: (uid: string, uname?: string) => void;
}> = React.memo(
  ({ item, authorName, authorAvatar, averageDays, onAuthorPress }) => (
    <View style={{ marginBottom: spacing.sm }}>
      <DiaryCard
        authorId={item.userId}
        authorName={authorName ?? 'ユーザー'}
        authorAvatar={authorAvatar}
        averageDays={averageDays}
        content={item.content}
        createdAt={item.createdAt}
        onAuthorPress={() => onAuthorPress(item.userId, authorName)}
      />
    </View>
  ),
  (prev, next) =>
    prev.item.id === next.item.id &&
    prev.item.content === next.item.content &&
    String(prev.item.createdAt) === String(next.item.createdAt) &&
    prev.authorName === next.authorName &&
    prev.authorAvatar === next.authorAvatar &&
    prev.averageDays === next.averageDays,
);

const DiaryByDayScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const { mode } = useAppTheme();
  const { colorSchemes } = require("@shared/theme/colors");
  const colors = useMemo(() => colorSchemes[mode], [mode]);
  const styles = useMemo(() => createStyles(mode), [mode]);

  const [day, setDay] = useState<number>(1);
  const [items, setItems] = useState<DayDiaryItem[]>([]);
  const [userAverageDays, setUserAverageDays] = useState<Map<string, number>>(
    new Map(),
  );
  const [profilesMap, setProfilesMap] = useState<Map<string, UserProfileLite | undefined>>(new Map());
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const blockedSet = useBlockedIds();
  const { requireAuth } = useAuthPrompt();
  const [showAdd, setShowAdd] = useState<boolean>(false);
  const [addText, setAddText] = useState<string>("");
  const [activeDay, setActiveDay] = useState<number | null>(null);
  const [alreadyPosted, setAlreadyPosted] = useState<boolean>(false);

  useEffect(() => {
    void (async () => {
      if (user?.uid) {
        const active = await ChallengeService.getActiveChallenge(user.uid);
        if (active) {
          const startedAt =
            (active.startedAt as any)?.toDate?.() || (active.startedAt as any);
          const now = new Date();
          const d =
            Math.floor(
              (now.getTime() - startedAt.getTime()) / (24 * 3600 * 1000),
            ) + 1;
          if (d > 0) {
            setDay(d);
            setActiveDay(d);
          }
        } else {
          setActiveDay(null);
        }
      }
    })();
  }, [user?.uid]);

  // blockedSet subscription is global; no need for Firestore here

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const list = await DiaryService.getDiariesByDay(day, 200);
        const mapped = list
          .map((d) => ({
            id: d.id,
            userId: (d as any).userId,
            content: d.content,
            createdAt: (d.createdAt as any)?.toDate?.() || (d.createdAt as any),
          }))
          .filter((it) => !blockedSet.has(it.userId));
        setItems(mapped);
        // ユーザー名・アバターは各行コンポーネント側でライブ解決（useDisplayProfile）
        // prefetch averageDays for ranks (bulk)
        try {
          const ids = Array.from(new Set(mapped.map((m) => m.userId)));
          const next = new Map(userAverageDays);
          const missing = ids.filter((uid) => !next.has(uid));
          if (missing.length > 0) {
            const map = await UserStatsService.getManyUsersCurrentDaysForRank(missing);
            map.forEach((days, uid) => next.set(uid, Math.max(0, days)));
          }
          setUserAverageDays(next);
        } catch { }
      } finally {
        setLoading(false);
      }
    };
    const task = InteractionManager.runAfterInteractions(() => {
      void fetch();
    });
    return () => {
      try { (task as any)?.cancel?.(); } catch { }
    };
  }, [day, blockedSet]);

  // Prefetch and live-merge author profiles (name/avatar) similar to community screens
  useEffect(() => {
    const ids = Array.from(new Set(items.map((it) => it.userId)));
    if (ids.length === 0) {
      setProfilesMap(new Map());
      return;
    }
    const unsub = ProfileCache.getInstance().subscribeMany(ids, (map) => {
      setProfilesMap(map);
    });
    return () => { try { unsub?.(); } catch { } };
  }, [items]);

  // 選択中の「日」のみRealtime購読して差分適用（負荷抑制）
  useEffect(() => {
    if (!supabaseConfig?.isConfigured) return;
    let active = true;
    const channel = supabase
      .channel(`realtime:diaries:day:${day}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "diaries", filter: `day=eq.${day}` },
        (payload) => {
          const row = (payload.new || payload.old) as any;
          if (!row) return;
          // 受信データを画面の型に合わせる
          const mapped = {
            id: row.id as string,
            userId: row.userId as string,
            content: row.content as string,
            createdAt:
              (row.createdAt as any)?.toDate?.() ||
              (typeof row.createdAt === "string" ? new Date(row.createdAt) : row.createdAt),
          } as DayDiaryItem;

          setItems((prev) => {
            let next = prev;
            // ブロックユーザーの項目は表示しない
            const visible = !blockedSet.has(mapped.userId);

            if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
              // 既存を置換 or 先頭に追加
              const idx = next.findIndex((it) => it.id === mapped.id);
              if (!visible) {
                // 可視条件を満たさない場合は削除扱い
                if (idx !== -1) {
                  next = [...next.slice(0, idx), ...next.slice(idx + 1)];
                }
                return next;
              }
              if (idx === -1) {
                next = [mapped, ...next];
              } else {
                next = [...next];
                next[idx] = mapped;
              }
              // createdAt 降順を維持
              next = next.slice().sort((a, b) => (new Date(b.createdAt as any).getTime() - new Date(a.createdAt as any).getTime()));
              return next;
            }
            if (payload.eventType === "DELETE") {
              const idx = next.findIndex((it) => it.id === mapped.id);
              if (idx !== -1) {
                next = [...next.slice(0, idx), ...next.slice(idx + 1)];
              }
              return next;
            }
            return next;
          });
        },
      );

    channel.subscribe();

    return () => {
      active = false;
      try { supabase.removeChannel(channel); } catch { }
    };
  }, [day, blockedSet]);

  // プロフィール購読は各行に委譲（画面側では保持しない）

  // Check if user already posted for the selected day (only matters on active day)
  useEffect(() => {
    void (async () => {
      if (!user?.uid || activeDay === null || day !== activeDay) {
        setAlreadyPosted(false);
        return;
      }
      try {
        const exists = await DiaryService.hasDiaryForActiveChallengeDay(
          user.uid,
          day,
        );
        setAlreadyPosted(exists);
      } catch {
        setAlreadyPosted(false);
      }
    })();
  }, [user?.uid, day, activeDay]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const list = await DiaryService.getDiariesByDay(day, 200);
      const mapped = list
        .map((d) => ({
          id: d.id,
          userId: (d as any).userId,
          content: d.content,
          createdAt: (d.createdAt as any)?.toDate?.() || (d.createdAt as any),
        }))
        .filter((it) => !blockedSet.has(it.userId));
      setItems(mapped);
      try {
        const ids = Array.from(new Set(mapped.map((m) => m.userId)));
        const next = new Map(userAverageDays);
        const missing = ids.filter((uid) => !next.has(uid));
        if (missing.length > 0) {
          const map = await UserStatsService.getManyUsersCurrentDaysForRank(missing);
          map.forEach((days, uid) => next.set(uid, Math.max(0, days)));
        }
        setUserAverageDays(next);
      } catch { }
    } finally {
      setRefreshing(false);
    }
  };

  // day selection is controlled via card taps; chevron selector removed

  const renderItem = React.useCallback(
    ({ item }: { item: DayDiaryItem }) => {
      const avgDays = userAverageDays.get(item.userId) ?? 0;
      const prof = profilesMap.get(item.userId);
      const authorName = prof?.displayName ?? item.authorName;
      const authorAvatar = prof?.photoURL ?? item.authorAvatar;
      return (
        <DiaryItemRow
          item={item}
          authorName={authorName}
          authorAvatar={authorAvatar}
          averageDays={avgDays}
          onAuthorPress={(uid, uname) =>
            navigateToUserDetail(
              navigation as any,
              uid,
              uname ?? undefined,
              undefined,
            )
          }
        />
      );
    },
    [userAverageDays, profilesMap, navigation],
  );

  const canPostForSelectedDay =
    activeDay !== null && day === activeDay && !alreadyPosted;
  const postDisabledReason =
    activeDay === null
      ? "アクティブなチャレンジがありません"
      : day !== activeDay
        ? "日記は現在のチャレンジ日（当日）のみ投稿できます。"
        : alreadyPosted
          ? "本日は既に投稿済みです。明日また書きましょう。"
          : "";

  // days data for horizontal day selector (virtualized)
  const daysData = useMemo(() => Array.from({ length: 365 }, (_, i) => i + 1), []);
  const dayListRef = useRef<FlatList<number>>(null);

  return (
    <SafeAreaView style={styles.container}>
      <AppStatusBar />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.iconBtn}
        >
          <Ionicons name="arrow-back" size={22} color={colors.gray800} />
        </TouchableOpacity>
        <Text style={styles.title}>みんなの日記</Text>
        <TouchableOpacity
          onPress={async () => {
            const ok = await requireAuth();
            if (!ok) return;
            if (!canPostForSelectedDay) {
              Alert.alert("投稿できません", postDisabledReason);
              return;
            }
            setAddText("");
            setShowAdd(true);
          }}
          style={styles.iconBtn}
        >
          <Ionicons
            name="create-outline"
            size={22}
            color={canPostForSelectedDay ? colors.primary : colors.gray400}
          />
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        style={styles.list}
        contentContainerStyle={{ padding: spacing.lg }}
        initialNumToRender={8}
        windowSize={7}
        maxToRenderPerBatch={12}
        removeClippedSubviews
        ListEmptyComponent={
          <View style={{ alignItems: "center", padding: spacing.lg }}>
            <Ionicons
              name={loading ? "time-outline" : "book-outline"}
              size={48}
              color={colors.textSecondary}
            />
            <Text
              style={{ color: colors.textSecondary, marginTop: spacing.sm }}
            >
              {loading ? "読み込み中..." : "この日の記録はまだありません"}
            </Text>
          </View>
        }
        ListHeaderComponent={
          <View>
            <FlatList
              ref={dayListRef}
              data={daysData}
              keyExtractor={(d) => String(d)}
              horizontal
              showsHorizontalScrollIndicator={false}
              renderItem={({ item: d }) => (
                <DayCard
                  day={d}
                  selected={d === day}
                  posted={activeDay !== null && d === activeDay && alreadyPosted}
                  onPress={(sel) => setDay(sel)}
                />
              )}
              contentContainerStyle={styles.cardsRow}
              initialNumToRender={24}
              windowSize={5}
              maxToRenderPerBatch={24}
              removeClippedSubviews
            />
            <Text style={styles.helperText}>
              {activeDay === null && "チャレンジを開始すると日記を投稿できます"}
              {activeDay !== null &&
                day !== activeDay &&
                "日記は当日分のみ投稿できます"}
              {activeDay !== null &&
                day === activeDay &&
                alreadyPosted &&
                "本日は投稿済みです。明日また書きましょう"}
              {activeDay !== null &&
                day === activeDay &&
                !alreadyPosted &&
                "今日の日記を投稿しましょう"}
            </Text>
          </View>
        }
        stickyHeaderIndices={[0]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      />

      <TouchableOpacity
        style={[
          styles.fab,
          !canPostForSelectedDay && { backgroundColor: colors.gray300 },
        ]}
        onPress={() => {
          if (!canPostForSelectedDay) {
            Alert.alert("投稿できません", postDisabledReason);
            return;
          }
          setAddText("");
          setShowAdd(true);
        }}
      >
        <Ionicons name="create-outline" size={22} color={colors.white} />
      </TouchableOpacity>

      <Modal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        title={`${day}日目に追加`}
      >
        <View>
          <TextInput
            placeholder="いまの気付きや変化を書きましょう"
            placeholderTextColor={colors.textSecondary}
            value={addText}
            onChangeText={setAddText}
            multiline
            autoFocus
            style={styles.modalInput}
          />
          <View style={styles.modalButtons}>
            <TouchableOpacity
              onPress={() => setShowAdd(false)}
              style={styles.modalCancel}
            >
              <Text style={styles.modalCancelText}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={async () => {
                const ok = await requireAuth();
                if (!ok) return;
                if (!user?.uid || !addText.trim()) return;
                try {
                  await DiaryService.addDiaryForActiveChallenge(
                    user.uid,
                    addText.trim(),
                    { day },
                  );

                  // 日記追加成功後の処理
                  setShowAdd(false);
                  setAddText("");

                  // 現在の日のリストをリフレッシュ
                  try {
                    const list = await DiaryService.getDiariesByDay(day, 200);
                    const mapped = list.map((d) => ({
                      id: d.id,
                      userId: (d as any).userId,
                      content: d.content,
                      createdAt:
                        (d.createdAt as any)?.toDate?.() || (d.createdAt as any),
                    }));
                    setItems(mapped);
                    if (activeDay !== null && day === activeDay)
                      setAlreadyPosted(true);
                  } catch (refreshError) {
                    console.warn("日記リストのリフレッシュに失敗しました:", refreshError);
                  }
                } catch (e: any) {
                  Alert.alert(
                    "投稿できません",
                    e?.message || "条件を満たしていません。",
                  );
                  return;
                }
              }}
              style={[
                styles.modalSubmit,
                (!addText.trim() || !canPostForSelectedDay) &&
                styles.modalSubmitDisabled,
              ]}
              disabled={!addText.trim() || !canPostForSelectedDay}
            >
              <Text style={styles.modalSubmitText}>追加</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const createStyles = (mode: "light" | "dark") => {
  const { colorSchemes } = require("@shared/theme/colors");
  const colors = colorSchemes[mode];

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.backgroundTertiary },
    list: {
      backgroundColor: colors.backgroundTertiary,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      backgroundColor: colors.backgroundSecondary,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderPrimary,
    },
    iconBtn: { padding: spacing.sm },
    title: {
      flex: 1,
      textAlign: "center",
      fontSize: typography.fontSize.lg,
      fontWeight: "bold",
      color: colors.gray800,
    },
    daySelector: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: spacing.md,
      backgroundColor: colors.backgroundSecondary,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderPrimary,
    },
    dayBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.xs },
    dayText: {
      fontSize: typography.fontSize.base,
      fontWeight: "700",
      color: colors.textPrimary,
    },
    // card-related styles removed; use DiaryCard component for consistent look with posts
    cardsRow: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
    fab: {
      position: "absolute",
      right: spacing.lg,
      bottom: spacing.lg,
      backgroundColor: colors.primary,
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: "center",
      justifyContent: "center",
    },
    modalInput: {
      minHeight: 140,
      borderWidth: 1,
      borderColor: colors.borderPrimary,
      borderRadius: 12,
      padding: spacing.md,
      color: colors.textPrimary,
      textAlignVertical: "top",
      backgroundColor: colors.backgroundSecondary,
    },
    modalButtons: {
      flexDirection: "row",
      justifyContent: "flex-end",
      alignItems: "center",
      marginTop: spacing.md,
      gap: spacing.md,
    },
    modalCancel: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
    modalCancelText: { color: colors.textSecondary },
    modalSubmit: {
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: 20,
    },
    modalSubmitDisabled: { backgroundColor: colors.gray300 },
    modalSubmitText: { color: colors.white, fontWeight: "600" },
    helperText: {
      color: colors.textSecondary,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
    },
  });
};

export default DiaryByDayScreen;
