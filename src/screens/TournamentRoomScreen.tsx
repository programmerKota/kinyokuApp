import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import React, { useState, useEffect } from 'react';
import { Alert, View, Text, StyleSheet, SafeAreaView, StatusBar, TouchableOpacity, FlatList } from 'react-native';

import Button from '../components/Button';
import ConfirmDialog from '../components/ConfirmDialog';
import KeyboardAwareScrollView from '../components/KeyboardAwareScrollView';
import MessageBubble from '../components/MessageBubble';
import MessageInput from '../components/MessageInput';
import UserProfileWithRank from '../components/UserProfileWithRank';
import { useAuth } from '../contexts/AuthContext';
import type { TournamentStackParamList } from '../navigation/TournamentStackNavigator';
import type { FirestoreTournamentMessage } from '../services/firestore';
import { TournamentService, handleFirestoreError } from '../services/firestore';
// import { getRankByDays } from '../services/rankService';
import UserService from '../services/userService';
import { UserStatsService } from '../services/userStatsService';
import { colors, spacing, typography, shadows } from '../theme';
import { navigateToUserDetail } from '../utils/navigation';
import { toDate } from '../utils/date';

type TournamentRoomScreenNavigationProp = StackNavigationProp<
  TournamentStackParamList,
  'TournamentRoom'
>;

interface Message {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  timestamp: Date;
  type: 'text' | 'system';
  avatar?: string;
}

interface Participant {
  id: string;
  name: string;
  avatar?: string;
  role: 'owner' | 'member';
  status: 'joined' | 'left' | 'kicked' | 'completed' | 'failed';
  progressPercent?: number;
  currentDay?: number;
}

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

const TournamentRoomScreen: React.FC<TournamentRoomScreenProps> = ({ route }) => {
  const navigation = useNavigation<TournamentRoomScreenNavigationProp>();
  const { tournamentId } = route.params;
  const [activeTab, setActiveTab] = useState<'chat' | 'participants'>('chat');
  const { user } = useAuth();

  // チャットメッセージ
  const [messages, setMessages] = useState<Message[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [tournament, setTournament] = useState<{ ownerId?: string } | null>(null);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  // const [loading, setLoading] = useState(true);
  const [userAverageDays, setUserAverageDays] = useState<Map<string, number>>(new Map());

  // チャットの購読
  useEffect(() => {
    if (!user) return;

    const unsubscribe = TournamentService.subscribeToMessages(
      tournamentId,
      (firestoreMessages: FirestoreTournamentMessage[]) => {
        const convertedMessages: Message[] = firestoreMessages.map((msg) => ({
          id: msg.id,
          authorId: msg.authorId,
          authorName: msg.authorName,
          text: msg.text,
          timestamp: toDate(msg.createdAt),
          type: msg.type,
          avatar: msg.authorAvatar,
        })).filter((m) => m.type !== 'text' || (m.text ?? '').trim().length > 0);
        setMessages(convertedMessages);
        // setLoading(false);
      },
    );

    return unsubscribe;
  }, [tournamentId, user]);

  // 大会情報と参加者の購読
  useEffect(() => {
    let unsubscribeParticipants: undefined | (() => void);
    let unsubscribeRequests: undefined | (() => void);
    const init = async () => {
      try {
        const tournamentData = await TournamentService.getTournament(tournamentId);
        setTournament(tournamentData);
        // オーナー情報を取得。Firestore優先、なければローカルにフォールバック
        let ownerDisplayName: string | undefined;
        let ownerAvatarUrl: string | undefined;
        try {
          if (tournamentData?.ownerId) {
            const owner = await (
              await import('../services/firestore')
            ).FirestoreUserService.getUserById(tournamentData.ownerId);
            ownerDisplayName = owner?.displayName;
            ownerAvatarUrl = owner?.photoURL;
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
            const ownerExists = list.some((p) => p.userId === tournamentData?.ownerId);
            const all =
              ownerExists || !tournamentData?.ownerId
                ? list
                : [
                  {
                    id: 'owner-participant',
                    tournamentId,
                    userId: tournamentData.ownerId,
                    userName: ownerDisplayName || 'ユーザー',
                    userAvatar: ownerAvatarUrl,
                    status: 'joined',
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
              role: p.userId === tournamentData?.ownerId ? 'owner' : 'member',
              status: p.status as Participant['status'],
              progressPercent: p.progressPercent,
              currentDay: p.currentDay,
            }));

            setParticipants(converted);

            // 参加者ごとの平均日数を取得
            const averageDaysMap = new Map<string, number>();
            for (const participant of converted) {
              try {
                const averageDays = await UserStatsService.getUserAverageDaysForRank(
                  participant.id,
                );
                averageDaysMap.set(participant.id, averageDays);
              } catch (error) {
                console.error('ユーザーの平均日数取得に失敗', participant.id, error);
                averageDaysMap.set(participant.id, 0);
              }
            }
            setUserAverageDays(averageDaysMap);
          },
        );

        // 参加申請の購読（オーナーのみ表示用）
        unsubscribeRequests = TournamentService.subscribeToJoinRequests(
          tournamentId,
          (reqs) => {
            const pending = reqs.filter((r) => r.status === 'pending');
            const mapped: JoinRequest[] = pending.map((r) => ({
              id: r.id,
              userId: r.userId,
              userName: r.userName,
              userAvatar: r.userAvatar,
            }));
            setJoinRequests(mapped);
          },
        );
} catch (e) {
  console.error('トーナメントの参加者取得でエラーが発生しました:', e);
  Alert.alert('エラー', 'トーナメントの参加者取得でエラーが発生しました');
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
    setConfirm({ visible: true, title: 'エラー', message: err.message, onConfirm: () => setConfirm({ visible: false }) });
  }
};

const handleReject = async (requestId: string) => {
  try {
    await TournamentService.rejectJoinRequest(requestId);
  } catch (e) {
    const err = handleFirestoreError(e);
    setConfirm({ visible: true, title: 'エラー', message: err.message, onConfirm: () => setConfirm({ visible: false }) });
  }
};

const handleSendMessage = async (text: string) => {
  if (!text.trim()) return;

  try {
    // メッセージポートエラー対策のため、タイムアウトを設定
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('メッセージ送信がタイムアウトしました')), 10000);
    });

  const sendPromise = TournamentService.sendMessage(
    tournamentId,
    text.trim(),
  );

  await Promise.race([sendPromise, timeoutPromise]);
} catch (error) {
  console.error('メッセージの送信でエラーが発生しました:', error);

  // メッセージポートエラーの場合の特別な処理
  if (error instanceof Error && error.message.includes('message port')) {
    console.warn('メッセージポートエラーが発生しましたが、メッセージは送信された可能性があります');
    return; // エラーを表示せずに処理を継続
  }

  const firestoreError = handleFirestoreError(error);
  Alert.alert('エラー', firestoreError.message);
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
  navigateToUserDetail(navigation, participant.id, participant.name, participant.avatar);
};

const [confirm, setConfirm] = useState<{ visible: boolean; title?: string; message?: string; onConfirm?: () => void; loading?: boolean }>({ visible: false });

const handleKick = async (p: Participant) => {
  if (!tournament || user?.uid !== tournament.ownerId || p.role === 'owner') return;
  const doKick = async () => {
    try {
      await TournamentService.kickParticipant(tournamentId, p.id);
    } catch (e) {
      const err = handleFirestoreError(e);
      setConfirm({ visible: true, title: 'エラー', message: err.message, onConfirm: () => setConfirm({ visible: false }) });
    }
  };
  setConfirm({
    visible: true,
    title: '参加者を削除',
    message: `「${p.name}」を参加者から削除します。よろしいですか？`,
      onConfirm: async () => {
        setConfirm((s) => ({ ...s, loading: true }));
        await doKick();
        setConfirm({ visible: false });
      },
    });
  };

  const renderParticipant = ({ item }: { item: Participant }) => (
    <TouchableOpacity
      style={styles.participantItem}
      onPress={() => handleParticipantPress(item)}
      activeOpacity={0.8}
    >
      {tournament && user?.uid === tournament.ownerId && item.role !== 'owner' ? (
        <TouchableOpacity
          onPress={() => handleKick(item)}
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
        userName={item.name}
        userAvatar={item.avatar}
        averageDays={userAverageDays.get(item.id) || 0}
        size="medium"
        showRank={false}
        showTitle={true}
        style={styles.userProfileContainer}
      />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.backgroundTertiary} />

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
          style={[styles.tab, activeTab === 'chat' && styles.activeTab]}
          onPress={() => setActiveTab('chat')}
        >
          <Text style={[styles.tabText, activeTab === 'chat' && styles.activeTabText]}>チャット</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'participants' && styles.activeTab]}
          onPress={() => setActiveTab('participants')}
        >
          <Text style={[styles.tabText, activeTab === 'participants' && styles.activeTabText]}>参加者</Text>
        </TouchableOpacity>
      </View>

      {/* コンテンツ */}
      {activeTab === 'chat' ? (
        <KeyboardAwareScrollView style={styles.chatContainer}>
          <FlatList
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            style={styles.messagesList}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />

          <MessageInput onSend={handleSendMessage} />
        </KeyboardAwareScrollView>
      ) : (
        <View style={styles.participantsList}>
          {tournament && user?.uid === tournament.ownerId && joinRequests.length > 0 ? (
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
                    <Button title="承認" size="small" variant="primary" onPress={() => { void handleApprove(r.id); }} />
                    <Button title="却下" size="small" variant="danger" onPress={() => { void handleReject(r.id); }} style={styles.requestReject} />
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
        title={confirm.title || ''}
        message={confirm.message}
        confirmText={confirm.title === '参加者を削除' ? '削除' : 'OK'}
        cancelText={'キャンセル'}
        onConfirm={confirm.onConfirm || (() => setConfirm({ visible: false }))}
        onCancel={() => setConfirm({ visible: false })}
        loading={!!confirm.loading}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundTertiary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderPrimary,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    flex: 1,
    fontSize: typography.fontSize.lg,
    fontWeight: 'bold',
    color: colors.gray800,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  headerAction: {
    padding: spacing.sm,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderPrimary,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: colors.info,
  },
  tabText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
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
    backgroundColor: colors.white,
    borderRadius: 12,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    ...shadows.base,
  },
  requestsTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '700',
    color: colors.gray800,
    marginBottom: spacing.md,
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderPrimary,
  },
  requestProfile: {
    flex: 1,
  },
  requestActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: typography.fontSize.base,
    fontWeight: 'bold',
    color: colors.white,
  },
  participantInfo: {
    flex: 1,
  },
  participantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  participantName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.gray800,
  },
  progressText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
});

export default TournamentRoomScreen;
