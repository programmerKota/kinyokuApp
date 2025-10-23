import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import React, { useState, useEffect, useRef, useMemo, memo, useCallback } from "react";
import { Alert, View, Text, StyleSheet, TouchableOpacity, FlatList } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import AppStatusBar from "@shared/theme/AppStatusBar";

import { useAuth } from "@app/contexts/AuthContext";
import type { TournamentStackParamList } from "@app/navigation/TournamentStackNavigator";
import {
  TournamentService,
  handleFirestoreError,
} from "@core/services/firestore";
import UserService from "@core/services/userService";
import { UserStatsService } from "@core/services/userStatsService";
import MessageBubble from "@features/tournaments/components/MessageBubble";
import MessageInput from "@features/tournaments/components/MessageInput";
import Button from "@shared/components/Button";
import ConfirmDialog from "@shared/components/ConfirmDialog";
import KeyboardAwareScrollView from "@shared/components/KeyboardAwareScrollView";
import UserProfileWithRank from "@shared/components/UserProfileWithRank";
import { useDisplayProfile } from "@shared/hooks/useDisplayProfile";
import { spacing, typography, shadows, useAppTheme } from "@shared/theme";
import { toDate } from "@shared/utils/date";
import { navigateToUserDetail } from "@shared/utils/navigation";

type TournamentRoomScreenNavigationProp = StackNavigationProp<
  TournamentStackParamList,
  "TournamentRoom"
>;

interface Message {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  timestamp: Date;
  type: "text" | "system";
  avatar?: string;
}

interface Participant {
  id: string;
  name: string;
  avatar?: string;
  role: "owner" | "member";
  status: "joined" | "left" | "kicked" | "completed" | "failed";
  progressPercent?: number;
  currentDay?: number;
}

// FlatList の renderItem 内でフックを呼ぶと "Invalid hook call" になるため、
// 個別行をコンポーネント化してここでフックを使う。
const ParticipantRow: React.FC<{
  item: Participant;
  avgDays: number;
  onPress: (p: Participant) => void;
  canKick: boolean;
  onKick: (p: Participant) => void;
  styles: any;
  colors: any;
}> = memo(({ item, avgDays, onPress, canKick, onKick, styles, colors }) => {
  const { name, avatar } = useDisplayProfile(item.id, item.name, item.avatar);
  return (
    <TouchableOpacity
      style={styles.participantItem}
      onPress={() => onPress(item)}
      activeOpacity={0.8}
    >
      {canKick ? (
        <TouchableOpacity
          onPress={() => onKick(item)}
          activeOpacity={0.8}
          style={styles.kickIconButton}
          accessibilityLabel="削除"
        >
          <Ionicons name="close" size={18} color={colors.white} />
        </TouchableOpacity>
      ) : (
        <View style={{ width: 0 }} />
      )}
      <UserProfileWithRank
        userName={name}
        userAvatar={avatar}
        averageDays={avgDays}
        size="small"
        showRank={false}
        showTitle={true}
        style={styles.userProfileContainer}
      />
    </TouchableOpacity>
  );
});

interface JoinRequest {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
}

interface TournamentRoomScreenProps {
  route: {
    params: {
      tournamentId: string;
    };
  };
}

const TournamentRoomScreen: React.FC<TournamentRoomScreenProps> = ({
  route,
}) => {
  const navigation = useNavigation<TournamentRoomScreenNavigationProp>();
  const { mode } = useAppTheme();
  const { colorSchemes } = require("@shared/theme/colors");
  const colors = useMemo(() => colorSchemes[mode], [mode]);
  const styles = useMemo(() => createStyles(mode), [mode]);

  const { tournamentId } = route.params;
  const [activeTab, setActiveTab] = useState<"chat" | "participants">("chat");
  const { user } = useAuth();

  // チャットメッセージ
  const [messages, setMessages] = useState<Message[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [tournament, setTournament] = useState<{ ownerId?: string } | null>(
    null,
  );
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  // const [loading, setLoading] = useState(true);
  const [userAverageDays, setUserAverageDays] = useState<Map<string, number>>(
    new Map(),
  );

  // スクロール制御
  const listRef = useRef<FlatList<Message>>(null);
  const [initialScrolled, setInitialScrolled] = useState(false);
  // チャットは常に最新が最下部になるよう inverted を使用

  // 初期100件 + 新着の随時取得
  useEffect(() => {
    let unsubNew: undefined | (() => void);
    let cancelled = false;
    (async () => {
      try {
        // 最新から100件取得（desc）→ asc に並べ替えて状態に保存
        const { items, nextCursor } = await TournamentService.getRecentMessages(
          tournamentId,
          100,
        );
        const latestDesc = items; // already desc (newest first)
        if (cancelled) return;
        setMessages(
          latestDesc.map((msg) => ({
            id: msg.id,
            authorId: msg.authorId,
            authorName: msg.authorName,
            text: msg.text,
            timestamp: toDate(msg.createdAt),
            type: msg.type,
            avatar: msg.authorAvatar,
          })),
        );
        // 新着を購読（最新のcreatedAt以降）
        const latestTs = latestDesc[0]?.createdAt as any;
        if (latestTs) {
          unsubNew = TournamentService.subscribeToNewMessages(
            tournamentId,
            latestTs,
            (news) => {
              if (!news || news.length === 0) return;
              setMessages((prev) => {
                const existing = new Set(prev.map((p) => p.id));
                // news is asc; convert to desc and put at start
                const appended = [...news]
                  .reverse()
                  .map((msg) => ({
                    id: msg.id,
                    authorId: msg.authorId,
                    authorName: msg.authorName,
                    text: msg.text,
                    timestamp: toDate(msg.createdAt),
                    type: msg.type,
                    avatar: msg.authorAvatar,
                  }))
                  .filter((m) => !existing.has(m.id));
                if (appended.length === 0) return prev;
                return [...appended, ...prev];
              });
            },
          );
        }
        // keep cursor for older loads
        setOlderCursor(nextCursor);
      } catch (e) {
        console.warn("failed to init chat messages:", e);
      }
    })();
    return () => {
      cancelled = true;
      if (unsubNew) unsubNew();
    };
  }, [tournamentId]);

  const [olderCursor, setOlderCursor] = useState<any | undefined>(undefined);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadOlder = async () => {
    if (loadingMore || !olderCursor) return;
    setLoadingMore(true);
    try {
      const { items, nextCursor } = await TournamentService.getRecentMessages(
        tournamentId,
        50,
        olderCursor,
      );
      // items are older (desc). Keep desc and append to tail
      const olderDesc = items.map((msg) => ({
        id: msg.id,
        authorId: msg.authorId,
        authorName: msg.authorName,
        text: msg.text,
        timestamp: toDate(msg.createdAt),
        type: msg.type,
        avatar: msg.authorAvatar,
      }));
      setMessages((prev) => [...prev, ...olderDesc]);
      setOlderCursor(nextCursor);
    } finally {
      setLoadingMore(false);
    }
  };

  // 大会情報と参加者の購読
  useEffect(() => {
    let unsubscribeParticipants: undefined | (() => void);
    let unsubscribeRequests: undefined | (() => void);
    const init = async () => {
      try {
        const tournamentData =
          await TournamentService.getTournament(tournamentId);
        setTournament(tournamentData);
        // オーナー情報を取得。Firestore優先、なければローカルにフォールバック
        let ownerDisplayName: string | undefined;
        let ownerAvatarUrl: string | undefined;
        try {
          if (tournamentData?.ownerId) {
            const owner = await (
              await import("@core/services/firestore")
            ).FirestoreUserService.getUserById(tournamentData.ownerId);
            ownerDisplayName = owner?.displayName;
            ownerAvatarUrl = owner?.photoURL ?? undefined;
          }
        } catch {
          // noop
        }
        if (!ownerDisplayName) {
          const userService = UserService.getInstance();
          ownerDisplayName =
            tournamentData?.ownerId === user?.uid
              ? user?.displayName || undefined
              : await userService.getUserName();
        }
        if (!ownerAvatarUrl) {
          const userService = UserService.getInstance();
          ownerAvatarUrl =
            tournamentData?.ownerId === user?.uid
              ? user?.avatarUrl || undefined
              : await userService.getAvatarUrl();
        }

        unsubscribeParticipants = TournamentService.subscribeToParticipants(
          tournamentId,
          async (list) => {
            // オーナーが含まれていなければ追加
            const ownerExists = list.some(
              (p) => p.userId === tournamentData?.ownerId,
            );
            const all =
              ownerExists || !tournamentData?.ownerId
                ? list
                : [
                  {
                    id: "owner-participant",
                    tournamentId,
                    userId: tournamentData.ownerId,
                    userName: ownerDisplayName || "ユーザー",
                    userAvatar: ownerAvatarUrl,
                    status: "joined",
                    joinedAt: tournamentData.createdAt,
                    progressPercent: 0,
                    currentDay: 0,
                  },
                  ...list,
                ];

            const converted: Participant[] = all.map((p) => ({
              id: p.userId,
              name: p.userName,
              avatar: p.userAvatar,
              role: p.userId === tournamentData?.ownerId ? "owner" : "member",
              status: p.status as Participant["status"],
              progressPercent: p.progressPercent,
              currentDay: p.currentDay,
            }));

            setParticipants(converted);
            // 参加者ごとの平均日数を一括取得（N+1回クエリを回避）
            try {
              const ids = converted.map((p) => p.id);
              const daysMap = await UserStatsService.getManyUsersCurrentDaysForRank(ids);
              setUserAverageDays(daysMap);
            } catch (error) {
              console.error("平均日数の一括取得に失敗", error);
              const fallback = new Map<string, number>();
              converted.forEach((p) => fallback.set(p.id, 0));
              setUserAverageDays(fallback);
            }
          },
        );

        // 参加申請の購読（オーナーのみ表示用）
        unsubscribeRequests = TournamentService.subscribeToJoinRequests(
          tournamentId,
          (reqs) => {
            const pending = reqs.filter((r) => r.status === "pending");
            const mapped: JoinRequest[] = pending.map((r) => ({
              id: r.id,
              userId: r.userId,
              userName: r.userName,
              userAvatar: r.userAvatar ?? undefined,
            }));
            setJoinRequests(mapped);
          },
        );
      } catch (e) {
        console.error("トーナメントの参加者取得でエラーが発生しました:", e);
        Alert.alert("エラー", "トーナメントの参加者取得でエラーが発生しました");
      }
    };
    void init();
    return () => {
      if (unsubscribeParticipants) unsubscribeParticipants();
      if (unsubscribeRequests) unsubscribeRequests();
    };
  }, [tournamentId]);

  const handleApprove = async (requestId: string) => {
    try {
      await TournamentService.approveJoinRequest(requestId);
    } catch (e) {
      const err = handleFirestoreError(e);
      setConfirm({
        visible: true,
        title: "エラー",
        message: err.message,
        onConfirm: () => setConfirm({ visible: false }),
      });
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      await TournamentService.rejectJoinRequest(requestId);
    } catch (e) {
      const err = handleFirestoreError(e);
      setConfirm({
        visible: true,
        title: "エラー",
        message: err.message,
        onConfirm: () => setConfirm({ visible: false }),
      });
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    // 楽観的にメッセージを1件だけ即時追加（他のUIは触らない）
    const localId = `local-${Date.now()}`;
    const optimistic: Message = {
      id: localId,
      authorId: user?.uid || "me",
      authorName: user?.displayName || "あなた",
      text: text.trim(),
      timestamp: new Date(),
      type: "text",
      avatar: user?.avatarUrl || undefined,
    };
    // desc: newest first → 先頭に追加
    setMessages((prev) => [optimistic, ...prev]);

    try {
      // メッセージポートエラー対策のため、タイムアウトを設定
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error("メッセージ送信がタイムアウトしました")),
          10000,
        );
      });

      const sendPromise = TournamentService.sendMessage(
        tournamentId,
        text.trim(),
      );

      const newId = (await Promise.race([
        sendPromise,
        timeoutPromise,
      ])) as string;
      // サーバIDに置き換え。既に同IDのサーバメッセージが来ていれば重複除去
      setMessages((prev) => {
        const mapped = prev.map((m) =>
          m.id === localId ? { ...m, id: newId } : m,
        );
        const seen = new Set<string>();
        const dedup: Message[] = [];
        for (const m of mapped) {
          if (seen.has(m.id)) continue;
          seen.add(m.id);
          dedup.push(m);
        }
        return dedup;
      });
    } catch (error) {
      // 失敗時は楽観的メッセージを除去
      setMessages((prev) => prev.filter((m) => m.id !== localId));
      console.error("メッセージの送信でエラーが発生しました:", error);

      // メッセージポートエラーの場合の特別な処理
      if (error instanceof Error && error.message.includes("message port")) {
        console.warn(
          "メッセージポートエラーが発生しましたが、メッセージは送信された可能性があります",
        );
        return; // エラーを表示せずに処理を継続
      }

      const firestoreError = handleFirestoreError(error);
      Alert.alert("エラー", firestoreError.message);
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwn = user ? item.authorId === user.uid : false;

    return (
      <MessageBubble
        message={item}
        isOwn={isOwn}
        onUserPress={(uid, uname, uavatar) =>
          navigateToUserDetail(navigation, uid, uname, uavatar)
        }
      />
    );
  };

  const handleParticipantPress = (participant: Participant) => {
    navigateToUserDetail(
      navigation,
      participant.id,
      participant.name,
      participant.avatar,
    );
  };

  const [confirm, setConfirm] = useState<{
    visible: boolean;
    title?: string;
    message?: string;
    onConfirm?: () => void;
    loading?: boolean;
  }>({ visible: false });

  const handleKick = (p: Participant) => {
    if (!tournament || user?.uid !== tournament.ownerId || p.role === "owner")
      return;
    const doKick = async () => {
      try {
        await TournamentService.kickParticipant(tournamentId, p.id);
      } catch (e) {
        const err = handleFirestoreError(e);
        setConfirm({
          visible: true,
          title: "エラー",
          message: err.message,
          onConfirm: () => setConfirm({ visible: false }),
        });
      }
    };
    setConfirm({
      visible: true,
      title: "参加者を削除",
      message: `「${p.name}」を参加者から削除します。よろしいですか？`,
      onConfirm: async () => {
        setConfirm((s) => ({ ...s, loading: true }));
        await doKick();
        setConfirm({ visible: false });
      },
    });
  };

  const renderParticipant = useCallback(
    ({ item }: { item: Participant }) => (
      <ParticipantRow
        item={item}
        avgDays={userAverageDays.get(item.id) || 0}
        onPress={handleParticipantPress}
        canKick={!!(tournament && user?.uid === tournament.ownerId && item.role !== "owner")}
        onKick={handleKick}
        styles={styles}
        colors={colors}
      />
    ),
    [styles, colors, userAverageDays, tournament, user],
  );

  return (
    <SafeAreaView style={styles.container}>
      <AppStatusBar />

      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.gray800} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>トーナメント</Text>
        <View style={styles.placeholder} />
      </View>

      {/* タブ */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "chat" && styles.activeTab]}
          onPress={() => setActiveTab("chat")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "chat" && styles.activeTabText,
            ]}
          >
            チャット
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "participants" && styles.activeTab]}
          onPress={() => setActiveTab("participants")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "participants" && styles.activeTabText,
            ]}
          >
            参加者
          </Text>
        </TouchableOpacity>
      </View>

      {/* コンテンツ */}
      {activeTab === "chat" ? (
        <KeyboardAwareScrollView style={styles.chatContainer}>
          <FlatList
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            style={styles.messagesList}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ref={listRef}
            inverted
            onEndReachedThreshold={0.2}
            onEndReached={() => {
              // inverted: end reached means top of history
              void loadOlder();
            }}
            onContentSizeChange={() => {
              if (!initialScrolled) {
                listRef.current?.scrollToEnd({ animated: false });
                setInitialScrolled(true);
              }
            }}
          />

          {(() => {
            const canSend = Boolean(
              user &&
              ((tournament && tournament.ownerId === user.uid) ||
                participants.some(
                  (p) => p.id === user.uid && p.status === "joined",
                )),
            );
            return canSend ? (
              <MessageInput onSend={handleSendMessage} />
            ) : (
              <View
                style={{
                  padding: spacing.lg,
                  backgroundColor: colors.backgroundSecondary,
                  borderTopWidth: 1,
                  borderTopColor: colors.borderPrimary,
                }}
              >
                <Text style={{ color: colors.textSecondary }}>
                  参加者のみメッセージを送信できます
                </Text>
              </View>
            );
          })()}
        </KeyboardAwareScrollView>
      ) : (
        <View style={styles.participantsList}>
          {tournament &&
            user?.uid === tournament.ownerId &&
            joinRequests.length > 0 ? (
            <View style={styles.requestsSection}>
              <Text style={styles.requestsTitle}>参加申請</Text>
              {joinRequests.map((r) => (
                <View key={r.id} style={styles.requestRow}>
                  <UserProfileWithRank
                    userName={r.userName}
                    userAvatar={r.userAvatar}
                    averageDays={0}
                    size="small"
                    showRank={false}
                    showTitle={false}
                    style={styles.requestProfile}
                  />
                  <View style={styles.requestActions}>
                    <Button
                      title="承認"
                      size="small"
                      variant="primary"
                      onPress={() => {
                        void handleApprove(r.id);
                      }}
                    />
                    <Button
                      title="却下"
                      size="small"
                      variant="danger"
                      onPress={() => {
                        void handleReject(r.id);
                      }}
                    />
                  </View>
                </View>
              ))}
            </View>
          ) : null}
          <FlatList
            data={participants}
            renderItem={renderParticipant}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.participantsContent}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}
      <ConfirmDialog
        visible={confirm.visible}
        title={confirm.title || ""}
        message={confirm.message}
        confirmText={confirm.title === "参加者を削除" ? "削除" : "OK"}
        cancelText={"キャンセル"}
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
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      backgroundColor: colors.backgroundSecondary,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderPrimary,
    },
    backButton: {
      padding: spacing.sm,
    },
    headerTitle: {
      flex: 1,
      fontSize: typography.fontSize.lg,
      fontWeight: "bold",
      color: colors.gray800,
      textAlign: "center",
    },
    placeholder: {
      width: 40,
    },
    headerAction: {
      padding: spacing.sm,
    },
    tabContainer: {
      flexDirection: "row",
      backgroundColor: colors.backgroundSecondary,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderPrimary,
    },
    tab: {
      flex: 1,
      paddingVertical: spacing.lg,
      alignItems: "center",
    },
    activeTab: {
      borderBottomWidth: 2,
      borderBottomColor: colors.info,
    },
    tabText: {
      fontSize: typography.fontSize.base,
      fontWeight: "600",
      color: colors.textSecondary,
    },
    activeTabText: {
      color: colors.info,
    },
    chatContainer: {
      flex: 1,
    },
    messagesList: {
      flex: 1,
    },
    participantsList: {
      flex: 1,
    },
    participantsContent: {
      padding: spacing.lg,
    },
    requestsSection: {
      padding: spacing.lg,
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 12,
      marginHorizontal: spacing.lg,
      marginTop: spacing.lg,
      ...shadows.base,
    },
    requestsTitle: {
      fontSize: typography.fontSize.base,
      fontWeight: "700",
      color: colors.gray800,
      marginBottom: spacing.md,
    },
    requestRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.borderPrimary,
    },
    requestProfile: {
      flex: 1,
    },
    requestActions: {
      flexDirection: "row",
      gap: spacing.sm,
    },
    participantItem: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.backgroundSecondary,
      padding: spacing.lg,
      marginBottom: spacing.md,
      borderRadius: 12,
      ...shadows.base,
    },
    userProfileContainer: {
      marginLeft: spacing.md,
    },
    kickIconButton: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.error,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      fontSize: typography.fontSize.base,
      fontWeight: "bold",
      color: colors.white,
    },
    participantInfo: {
      flex: 1,
    },
    participantHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: spacing.sm,
    },
    participantName: {
      fontSize: typography.fontSize.base,
      fontWeight: "600",
      color: colors.gray800,
    },
    progressText: {
      fontSize: typography.fontSize.sm,
      color: colors.textSecondary,
    },
  });
};

export default TournamentRoomScreen;

