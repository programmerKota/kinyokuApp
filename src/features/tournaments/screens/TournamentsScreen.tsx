import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
// Firebase Timestamp は使用せず Date を利用
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  Alert,
  Text,
  View,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppStatusBar from "@shared/theme/AppStatusBar";

import { supabase } from "@app/config/supabase.config";
import { useAuth } from "@app/contexts/AuthContext";
import type { TournamentStackParamList } from "@app/navigation/TournamentStackNavigator";
import {
  TournamentService,
  FirestoreUserService,
} from "@core/services/firestore";
import UserService from "@core/services/userService";
import CreateTournamentModal from "@features/tournaments/components/CreateTournamentModal";
import MemoizedTournamentCard from "@features/tournaments/components/MemoizedTournamentCard";
import VirtualizedList from "@features/tournaments/components/VirtualizedList";
import useTournamentParticipants from "@features/tournaments/hooks/useTournamentParticipants";
import ConfirmDialog from "@shared/components/ConfirmDialog";
import useErrorHandler from "@shared/hooks/useErrorHandler";
import {
  spacing,
  typography,
  shadows,
  useAppTheme,
  useThemedStyles,
} from "@shared/theme";
import { createUiStyles } from "@shared/ui/styles";
import { navigateToUserDetail } from "@shared/utils/navigation";
import ProfileCache from "@core/services/profileCache";

type TournamentsScreenNavigationProp = StackNavigationProp<
  TournamentStackParamList,
  "TournamentsList"
>;

interface Tournament {
  id: string;
  name: string;
  description: string;
  participantCount: number;
  status: "upcoming" | "active" | "completed" | "cancelled";
  isJoined: boolean;
  ownerId: string;
  ownerName: string;
  ownerAvatar?: string;
  recruitmentOpen?: boolean;
  requestPending?: boolean;
}

const TournamentsScreen: React.FC = () => {
  const navigation = useNavigation<TournamentsScreenNavigationProp>();
  const { user } = useAuth();
  const { handleError } = useErrorHandler();
  const { mode } = useAppTheme();
  const uiStyles = useThemedStyles(createUiStyles);
  const styles = useMemo(() => createStyles(mode), [mode]);

  const [, participantsActions] = useTournamentParticipants();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [myIds, setMyIds] = useState<Set<string>>(new Set());
  const [profilesMap, setProfilesMap] = useState<
    Map<string, import("@core/services/profileCache").UserProfileLite | undefined>
  >(new Map());
  const [profilesUnsub, setProfilesUnsub] = useState<(() => void) | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [confirm, setConfirm] = useState<{
    visible: boolean;
    title?: string;
    message?: string;
    onConfirm?: () => void;
    loading?: boolean;
  }>({ visible: false });

  // 表示フィルター: すべて / 参加中
  const [filter, setFilter] = useState<"all" | "joined">("all");

  // プロフィール情報でトーナメント情報を enrichする
  const enrichedTournaments = useMemo(() => {
    if (!tournaments || tournaments.length === 0) return tournaments;
    return tournaments.map((t) => {
      const prof = profilesMap.get(t.ownerId);
      if (!prof) return t;
      return {
        ...t,
        ownerName: prof.displayName ?? t.ownerName,
        ownerAvatar: prof.photoURL ?? t.ownerAvatar,
      } as Tournament;
    });
  }, [tournaments, profilesMap]);

  const visibleTournaments = useMemo(
    () =>
      filter === "joined"
        ? enrichedTournaments.filter((t) => t.isJoined)
        : enrichedTournaments,
    [filter, enrichedTournaments],
  );

  // トーナメント一覧の購読
  useEffect(() => {
    if (!user) {
      // 未ログイン時にスピナーが出続けないよう抑止
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = TournamentService.subscribeToTournaments(
      (firestoreTournaments) => {
        void (async () => {
          try {
            const currentUserId = await FirestoreUserService.getCurrentUserId();

            // 参加者情報のキャッシュを更新
            const tournamentIds = firestoreTournaments.map((t) => t.id);
            await participantsActions.refreshParticipants(tournamentIds);

            const convertedTournaments: Tournament[] = await Promise.all(
              firestoreTournaments.map(async (tournament) => {
                const participants = participantsActions.getParticipants(
                  tournament.id,
                );
                const isJoined =
                  myIds.has(tournament.ownerId) ||
                  participants.some((p) => myIds.has(p.userId));
                const participantCount = participants.some(
                  (p) => p.userId === tournament.ownerId,
                )
                  ? participants.length
                  : participants.length + 1;
                // オーナー情報は Firestore を優先。なければローカルにフォールバック
                let owner = await FirestoreUserService.getUserById(
                  tournament.ownerId,
                );
                if (!owner && tournament.ownerId === currentUserId) {
                  // 現ユーザーの情報をローカルから取得
                  const userService = UserService.getInstance();
                  owner = {
                    displayName:
                      user?.displayName || (await userService.getUserName()),
                    photoURL:
                      user?.avatarUrl || (await userService.getAvatarUrl()),
                  };
                }
                // 参加申請が pending かチェック
                let requestPending = false;
                try {
                  const { data: reqRows, error: reqErr } = await supabase
                    .from("tournament_join_requests")
                    .select("id")
                    .eq("tournamentId", tournament.id)
                    .eq("userId", currentUserId)
                    .eq("status", "pending")
                    .limit(1);
                  if (reqErr) throw reqErr;
                  requestPending = Array.isArray(reqRows) && reqRows.length > 0;
                } catch {
                  /* noop */
                }

                // 追加フォールバック: 参加者スナップショットから作成者名/アバターを補完
                if (!owner) {
                  try {
                    const ownerPart = participants.find(
                      (p) => p.userId === tournament.ownerId,
                    );
                    if (ownerPart) {
                      owner = {
                        displayName: ownerPart.userName,
                        photoURL: ownerPart.userAvatar ?? undefined,
                      };
                    }
                  } catch {
                    /* noop */
                  }
                }

                return {
                  id: tournament.id,
                  name: tournament.name,
                  description: tournament.description,
                  participantCount,
                  status: tournament.status,
                  isJoined,
                  ownerId: tournament.ownerId,
                  ownerName: owner?.displayName ?? "ユーザー",
                  ownerAvatar: owner?.photoURL ?? undefined,
                  recruitmentOpen: tournament.recruitmentOpen ?? true,
                  requestPending,
                };
              }),
            );
            setTournaments(convertedTournaments);
            // プロフィールをリアルタイム購読
            try {
              const ids = Array.from(
                new Set(convertedTournaments.map((t) => t.ownerId)),
              );
              if (ids.length > 0) {
                const unsub = ProfileCache.getInstance().subscribeMany(
                  ids,
                  (map) => {
                    setProfilesMap(map);
                  },
                );
                setProfilesUnsub((prev) => {
                  try {
                    prev?.();
                  } catch {}
                  return unsub;
                });
              }
            } catch {}
          } catch (error) {
            handleError(
              error,
              {
                component: "TournamentsScreen",
                action: "loadTournaments",
              },
              {
                fallbackMessage: "トーナメント一覧の取得に失敗しました",
              },
            );
          } finally {
            setLoading(false);
          }
        })();
      },
    );
    return () => {
      unsubscribe();
    };
  }, [user, participantsActions, handleError]);

  const handleJoinTournament = useCallback(
    async (tournamentId: string) => {
      try {
        const t = tournaments.find((x) => x.id === tournamentId);
        if (t && t.ownerId === user?.uid) {
          Alert.alert(
            "トーナメント作成者",
            "あなたが作成したトーナメントには参加できません。",
          );
          return;
        }
        if (t && t.recruitmentOpen === false) {
          Alert.alert("募集停止中", "現在このトーナメントは募集停止中です。");
          return;
        }
        // 参加申請
        await TournamentService.requestJoin(tournamentId);
        // UI のペンディング表示を更新
        setTournaments((prev) =>
          prev.map((t) => {
            if (t.id !== tournamentId) return t;
            if (t.isJoined) return t;
            return { ...t, requestPending: true };
          }),
        );
        Alert.alert(
          "申請しました",
          "参加申請を送信しました。オーナーの承認をお待ちください。",
        );
      } catch (error) {
        handleError(
          error,
          {
            component: "TournamentsScreen",
            action: "joinTournament",
          },
          {
            fallbackMessage: "トーナメントへの参加申請に失敗しました",
          },
        );
      }
    },
    [tournaments, user?.uid, handleError],
  );

  const handleViewTournament = useCallback(
    (idOrUserKey: string) => {
      if (idOrUserKey.startsWith("user:")) {
        const ownerId = idOrUserKey.replace("user:", "");
        const t = tournaments.find((t) => t.ownerId === ownerId);
        navigateToUserDetail(navigation, ownerId, t?.ownerName, t?.ownerAvatar);
        return;
      }
      navigation.navigate("TournamentRoom", { tournamentId: idOrUserKey });
    },
    [tournaments, navigation],
  );

  const handleCreateTournament = useCallback(
    async (data: { name: string; description: string }) => {
      try {
        const now = new Date();
        const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30日間
        const tournamentId = await TournamentService.createTournament({
          name: data.name,
          description: data.description,
          ownerId: await FirestoreUserService.getCurrentUserId(),
          // maxParticipants / entryFee / prizePool は未使用のため送らない
          status: "upcoming",
          recruitmentOpen: true,
          startDate: now,
          endDate: endDate,
        });

        // 作成者を参加者へ追加して UI を更新
        await TournamentService.joinTournament(tournamentId);
        Alert.alert("作成完了", "トーナメントを作成しました。");
      } catch (error) {
        handleError(
          error,
          {
            component: "TournamentsScreen",
            action: "createTournament",
          },
          {
            fallbackMessage: "トーナメントの作成に失敗しました",
          },
        );
      }
    },
    [handleError],
  );

  const handleToggleRecruitment = useCallback(
    async (id: string, open: boolean) => {
      let previousOpen: boolean | undefined;
      setTournaments((prev) =>
        prev.map((t) => {
          if (t.id !== id) return t;
          previousOpen = t.recruitmentOpen;
          return { ...t, recruitmentOpen: open };
        }),
      );
      try {
        await TournamentService.setRecruitmentOpen(id, open);
      } catch (error) {
        setTournaments((prev) =>
          prev.map((t) =>
            t.id === id ? { ...t, recruitmentOpen: previousOpen } : t,
          ),
        );
        handleError(
          error,
          {
            component: "TournamentsScreen",
            action: "toggleRecruitment",
          },
          {
            fallbackMessage: "募集状態の切り替えに失敗しました",
          },
        );
      }
    },
    [handleError],
  );

  const handleDeleteTournament = useCallback(
    (id: string) => {
      setConfirm({
        visible: true,
        title: "トーナメントを削除",
        message: "この操作は取り消せません。削除しますか？",
        onConfirm: () => {
          void (async () => {
            setConfirm((s) => ({ ...s, loading: true }));
            try {
              await TournamentService.deleteTournament(id);
              setTournaments((prev) => prev.filter((t) => t.id !== id));
            } catch (error) {
              handleError(
                error,
                {
                  component: "TournamentsScreen",
                  action: "deleteTournament",
                },
                {
                  fallbackMessage: "トーナメントの削除に失敗しました",
                },
              );
            } finally {
              setConfirm({ visible: false });
            }
          })();
        },
      });
    },
    [handleError],
  );

  useEffect(() => {
    const ids = new Set<string>();
    if (user?.uid) ids.add(user.uid);
    (async () => {
      try {
        const legacy = await (
          await import("@core/services/supabase/userService")
        ).FirestoreUserService.getCurrentUserId();
        if (legacy) ids.add(legacy);
      } catch {}
      setMyIds(ids);
    })();
  }, [user?.uid]);
  const renderTournament = useCallback(
    ({ item }: { item: Tournament }) => (
      <MemoizedTournamentCard
        tournament={item}
        onJoin={(id) => {
          void handleJoinTournament(id);
        }}
        onView={handleViewTournament}
        onToggleRecruitment={(id, open) => {
          void handleToggleRecruitment(id, open);
        }}
        showDelete={myIds.has(item.ownerId)}
        onDelete={(id) => {
          void handleDeleteTournament(id);
        }}
      />
    ),
    [
      handleJoinTournament,
      handleViewTournament,
      handleToggleRecruitment,
      handleDeleteTournament,
      user?.uid,
    ],
  );

  return (
    <SafeAreaView style={styles.container}>
      <AppStatusBar />

      {/* ヘッダー削除（リクエストにより非表示） */}

      {/* フィルター: 参加中 / すべて */}
      <FilterTabs
        active={filter}
        onChange={(v) => setFilter(v)}
        mode={mode}
        uiStyles={uiStyles}
      />

      <VirtualizedList
        data={visibleTournaments}
        renderItem={renderTournament}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        loading={loading}
        hasMore={false} // 今はページング未対応
        emptyMessage={
          filter === "joined"
            ? "参加中のトーナメントがありません"
            : "トーナメントがありません"
        }
        itemHeight={200} // カード高さの目安
        maxToRenderPerBatch={5}
        windowSize={10}
        initialNumToRender={10}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              void (async () => {
                try {
                  setRefreshing(true);
                  // 最新一覧取得
                  const firestoreTournaments = await TournamentService.getTournaments();
                  // 参加者キャッシュ更新
                  const tournamentIds = firestoreTournaments.map((t) => t.id);
                  try {
                    await participantsActions.refreshParticipants(tournamentIds);
                  } catch {}
                  // 自分のID
                  let currentUserId: string | undefined;
                  try {
                    currentUserId = await FirestoreUserService.getCurrentUserId();
                  } catch {}
                  // 画面表示用に整形
                  const converted: Tournament[] = await Promise.all(
                    firestoreTournaments.map(async (t) => {
                      const participants = participantsActions.getParticipants(t.id);
                      const isJoined = !!(
                        (currentUserId && t.ownerId === currentUserId) ||
                        participants.some((p) => p.userId === currentUserId)
                      );
                      const participantCount = participants.some((p) => p.userId === t.ownerId)
                        ? participants.length
                        : participants.length + 1;
                      let ownerName: string | undefined;
                      let ownerAvatar: string | undefined;
                      try {
                        const owner = await FirestoreUserService.getUserById(t.ownerId);
                        if (owner) {
                          ownerName = owner.displayName || ownerName;
                          ownerAvatar = owner.photoURL || ownerAvatar;
                        } else {
                          const ownerPart = participants.find((p) => p.userId === t.ownerId);
                          if (ownerPart) {
                            ownerName = ownerPart.userName || ownerName;
                            ownerAvatar = ownerPart.userAvatar || ownerAvatar;
                          }
                        }
                      } catch {
                        const ownerPart = participants.find((p) => p.userId === t.ownerId);
                        if (ownerPart) {
                          ownerName = ownerPart.userName || ownerName;
                          ownerAvatar = ownerPart.userAvatar || ownerAvatar;
                        }
                      }
                      return {
                        id: t.id,
                        name: t.name,
                        description: t.description,
                        participantCount,
                        status: t.status,
                        isJoined,
                        ownerId: t.ownerId,
                        ownerName: (ownerName ?? "ユーザー"),
                        ownerAvatar,
                        recruitmentOpen: t.recruitmentOpen ?? true,
                        requestPending: false,
                      } as Tournament;
                    }),
                  );
                  setTournaments(converted);
                } catch (error) {
                  handleError(
                    error,
                    { component: "TournamentsScreen", action: "pullToRefresh" },
                    { fallbackMessage: "更新に失敗しました" },
                  );
                } finally {
                  setRefreshing(false);
                }
              })();
            }}
          />
        }
      />

      {/* 作成ボタン（アクションボタン） */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowCreateModal(true)}
      >
        <Ionicons name="add" size={24} color="white" />
      </TouchableOpacity>

      <CreateTournamentModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={(data) => {
          void handleCreateTournament(data);
        }}
      />
      <ConfirmDialog
        visible={confirm.visible}
        title={confirm.title || ""}
        message={confirm.message}
        confirmText="削除"
        cancelText="キャンセル"
        onConfirm={confirm.onConfirm || (() => setConfirm({ visible: false }))}
        onCancel={() => setConfirm({ visible: false })}
        loading={!!confirm.loading}
      />
    </SafeAreaView>
  );
};

const createStyles = (mode: "light" | "dark") => {
  const { colorSchemes } = require("@shared/theme/colors");
  const colors = colorSchemes[mode];

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.backgroundTertiary,
    },
    header: {
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.lg,
      backgroundColor: colors.backgroundPrimary,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderPrimary,
    },
    title: {
      fontSize: typography.fontSize["2xl"],
      fontWeight: typography.fontWeight.bold,
      color: colors.textPrimary,
      textAlign: "center",
    },
    fab: {
      position: "absolute",
      bottom: spacing.xl,
      right: spacing.xl,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.info,
      justifyContent: "center",
      alignItems: "center",
      ...shadows.lg,
    },
    list: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.xl,
    },
  });
};

export default TournamentsScreen;

// 投稿画面と同じデザインのタブ（参加中 / すべて）
const FilterTabs: React.FC<{
  active: "all" | "joined";
  onChange: (v: "all" | "joined") => void;
  mode: "light" | "dark";
  uiStyles: ReturnType<typeof createUiStyles>;
}> = ({ active, onChange, mode, uiStyles }) => {
  const { colorSchemes } = require("@shared/theme/colors");
  const colors = colorSchemes[mode];

  return (
    <View style={{ backgroundColor: colors.backgroundTertiary }}>
      <View style={uiStyles.tabBar}>
        <TouchableOpacity
          style={[uiStyles.tab, active === "joined" && uiStyles.tabActive]}
          onPress={() => onChange("joined")}
        >
          <Text
            style={[
              uiStyles.tabText,
              active === "joined" && uiStyles.tabTextActive,
            ]}
          >
            参加中
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[uiStyles.tab, active === "all" && uiStyles.tabActive]}
          onPress={() => onChange("all")}
        >
          <Text
            style={[
              uiStyles.tabText,
              active === "all" && uiStyles.tabTextActive,
            ]}
          >
            すべて
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
