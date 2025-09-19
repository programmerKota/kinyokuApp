import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar, FlatList, ScrollView, RefreshControl, TextInput, Alert } from 'react-native';

import { useAuth } from '@app/contexts/AuthContext';
import { ChallengeService, DiaryService, BlockService } from '@core/services/firestore';
import { useProfile } from '@shared/hooks/useProfile';
import UserProfileWithRank from '@shared/components/UserProfileWithRank';
import { colors, spacing, typography, shadows } from '@shared/theme';
import Modal from '@shared/components/Modal';
import { formatDateTimeJP } from '@shared/utils/date';
import DayCard from '@features/diary/components/DayCard';

interface DayDiaryItem {
  id: string;
  userId: string;
  content: string;
  createdAt: Date | { toDate?: () => Date };
}

const DiaryByDayScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [day, setDay] = useState<number>(1);
  const [items, setItems] = useState<DayDiaryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [showAdd, setShowAdd] = useState<boolean>(false);
  const [addText, setAddText] = useState<string>('');
  const [activeDay, setActiveDay] = useState<number | null>(null);
  const [alreadyPosted, setAlreadyPosted] = useState<boolean>(false);

  useEffect(() => {
    void (async () => {
      if (user?.uid) {
        const active = await ChallengeService.getActiveChallenge(user.uid);
        if (active) {
          const startedAt = (active.startedAt as any)?.toDate?.() || (active.startedAt as any);
          const now = new Date();
          const d = Math.floor((now.getTime() - startedAt.getTime()) / (24 * 3600 * 1000)) + 1;
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

  // subscribe blocked ids
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = BlockService.subscribeBlockedIds(user.uid, (ids) => {
      setBlockedIds(new Set(ids));
    });
    return unsub;
  }, [user?.uid]);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const list = await DiaryService.getDiariesByDay(day, 200);
        const mapped = list.map((d) => ({
          id: d.id,
          userId: (d as any).userId,
          content: d.content,
          createdAt: (d.createdAt as any)?.toDate?.() || (d.createdAt as any),
        })).filter((it) => !blockedIds.has(it.userId));
        setItems(mapped);
      } finally {
        setLoading(false);
      }
    };
    void fetch();
  }, [day, blockedIds]);

  // Check if user already posted for the selected day (only matters on active day)
  useEffect(() => {
    void (async () => {
      if (!user?.uid || activeDay === null || day !== activeDay) {
        setAlreadyPosted(false);
        return;
      }
      try {
        const exists = await DiaryService.hasDiaryForActiveChallengeDay(user.uid, day);
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
      const mapped = list.map((d) => ({
        id: d.id,
        userId: (d as any).userId,
        content: d.content,
        createdAt: (d.createdAt as any)?.toDate?.() || (d.createdAt as any),
      })).filter((it) => !blockedIds.has(it.userId));
      setItems(mapped);
    } finally {
      setRefreshing(false);
    }
  };

  // day selection is controlled via card taps; chevron selector removed

  const DiaryItemRow: React.FC<{ item: DayDiaryItem }> = ({ item }) => {
    const prof = useProfile(item.userId);
    return (
      <View style={[styles.card, styles.cardShadow]}>
        <UserProfileWithRank
          userName={prof?.displayName ?? 'ユーザー'}
          userAvatar={prof?.photoURL}
          averageDays={0}
          onPress={() => { }}
          size="medium"
          showRank={false}
          showTitle={true}
          style={{ marginBottom: spacing.xs }}
        />
        <Text style={styles.content}>{item.content}</Text>
        <Text style={styles.date}>{formatDateTimeJP((item.createdAt as any) as Date)}</Text>
      </View>
    );
  };

  const renderItem = ({ item }: { item: DayDiaryItem }) => <DiaryItemRow item={item} />;

  const canPostForSelectedDay = activeDay !== null && day === activeDay && !alreadyPosted;
  const postDisabledReason = activeDay === null
    ? 'アクティブなチャレンジがありません'
    : day !== activeDay
      ? '日記は現在のチャレンジ日（当日）のみ投稿できます。'
      : alreadyPosted
        ? '本日は既に投稿済みです。明日また書きましょう。'
        : '';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.backgroundTertiary} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.gray800} />
        </TouchableOpacity>
        <Text style={styles.title}>みんなの日記</Text>
        <TouchableOpacity
          onPress={() => {
            if (!canPostForSelectedDay) {
              Alert.alert('投稿できません', postDisabledReason);
              return;
            }
            setAddText('');
            setShowAdd(true);
          }}
          style={styles.iconBtn}
        >
          <Ionicons name="create-outline" size={22} color={canPostForSelectedDay ? colors.primary : colors.gray400} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: spacing.lg }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', padding: spacing.lg }}>
            <Ionicons name={loading ? 'time-outline' : 'book-outline'} size={48} color={colors.textSecondary} />
            <Text style={{ color: colors.textSecondary, marginTop: spacing.sm }}>
              {loading ? '読み込み中...' : 'この日の記録はまだありません'}
            </Text>
          </View>
        }
        ListHeaderComponent={
          <View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardsRow}>
              {Array.from({ length: 30 }, (_, i) => i + 1).map((d) => (
                <DayCard
                  key={d}
                  day={d}
                  selected={d === day}
                  posted={activeDay !== null && d === activeDay && alreadyPosted}
                  onPress={(sel) => { setDay(sel); }}
                />
              ))}
            </ScrollView>
            <Text style={styles.helperText}>
              {activeDay === null && 'チャレンジを開始すると日記を投稿できます'}
              {activeDay !== null && day !== activeDay && '日記は当日分のみ投稿できます'}
              {activeDay !== null && day === activeDay && alreadyPosted && '本日は投稿済みです。明日また書きましょう'}
              {activeDay !== null && day === activeDay && !alreadyPosted && '今日の日記を投稿しましょう'}
            </Text>
          </View>
        }
        stickyHeaderIndices={[0]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      />

      <TouchableOpacity
        style={[styles.fab, styles.cardShadow, !canPostForSelectedDay && { backgroundColor: colors.gray300 }]}
        onPress={() => {
          if (!canPostForSelectedDay) {
            Alert.alert('投稿できません', postDisabledReason);
            return;
          }
          setAddText('');
          setShowAdd(true);
        }}
      >
        <Ionicons name="create-outline" size={22} color={colors.white} />
      </TouchableOpacity>

      <Modal visible={showAdd} onClose={() => setShowAdd(false)} title={`${day}日目に追加`}>
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
            <TouchableOpacity onPress={() => setShowAdd(false)} style={styles.modalCancel}>
              <Text style={styles.modalCancelText}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={async () => {
                if (!user?.uid || !addText.trim()) return;
                try {
                  await DiaryService.addDiaryForActiveChallenge(user.uid, addText.trim(), { day });
                } catch (e: any) {
                  Alert.alert('投稿できません', e?.message || '条件を満たしていません。');
                  return;
                }
                setShowAdd(false);
                setAddText('');
                // refresh current day list
                try {
                  const list = await DiaryService.getDiariesByDay(day, 200);
                  const mapped = list.map((d) => ({
                    id: d.id,
                    userId: (d as any).userId,
                    content: d.content,
                    createdAt: (d.createdAt as any)?.toDate?.() || (d.createdAt as any),
                  }));
                  setItems(mapped);
                  if (activeDay !== null && day === activeDay) setAlreadyPosted(true);
                } catch {}
              }}
              style={[styles.modalSubmit, (!addText.trim() || !canPostForSelectedDay) && styles.modalSubmitDisabled]}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundTertiary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderPrimary,
  },
  iconBtn: { padding: spacing.sm },
  title: { flex: 1, textAlign: 'center', fontSize: typography.fontSize.lg, fontWeight: 'bold', color: colors.gray800 },
  daySelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.md, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.borderPrimary },
  dayBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.xs },
  dayText: { fontSize: typography.fontSize.base, fontWeight: '700', color: colors.textPrimary },
  card: { backgroundColor: colors.white, borderRadius: 12, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.borderPrimary },
  cardShadow: { shadowColor: shadows.md.shadowColor, shadowOffset: shadows.md.shadowOffset, shadowOpacity: shadows.md.shadowOpacity, shadowRadius: shadows.md.shadowRadius, elevation: shadows.md.elevation },
  content: { fontSize: typography.fontSize.base, color: colors.textPrimary, lineHeight: typography.fontSize.base * 1.6 },
  date: { fontSize: typography.fontSize.xs, color: colors.textSecondary, marginTop: spacing.xs },
  cardsRow: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  fab: { position: 'absolute', right: spacing.lg, bottom: spacing.lg, backgroundColor: colors.primary, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  modalInput: { minHeight: 140, borderWidth: 1, borderColor: colors.borderPrimary, borderRadius: 12, padding: spacing.md, color: colors.textPrimary, textAlignVertical: 'top', backgroundColor: colors.white },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: spacing.md, gap: spacing.md },
  modalCancel: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  modalCancelText: { color: colors.textSecondary },
  modalSubmit: { backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: 20 },
  modalSubmitDisabled: { backgroundColor: colors.gray300 },
  modalSubmitText: { color: colors.white, fontWeight: '600' },
  helperText: { color: colors.textSecondary, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
});

export default DiaryByDayScreen;
