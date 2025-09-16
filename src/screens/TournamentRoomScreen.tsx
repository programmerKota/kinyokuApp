import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    StatusBar,
    TouchableOpacity,
    FlatList,
    Alert,
    Image,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Button from '../components/Button';
import MessageBubble from '../components/MessageBubble';
import MessageInput from '../components/MessageInput';
import KeyboardAwareScrollView from '../components/KeyboardAwareScrollView';
import { TournamentStackParamList } from '../navigation/TournamentStackNavigator';
import { TournamentService, FirestoreTournamentMessage, FirestoreTournamentParticipant, handleFirestoreError } from '../services/firestore';
import { useAuth } from '../contexts/AuthContext';
import { colors, spacing, typography, shadows } from '../theme';
import UserService from '../services/userService';
import { navigateToUserDetail } from '../utils';
import UserProfileWithRank from '../components/UserProfileWithRank';
import { UserStatsService } from '../services/userStatsService';
import { getRankByDays } from '../services/rankService';

type TournamentRoomScreenNavigationProp = StackNavigationProp<TournamentStackParamList, 'TournamentRoom'>;

interface Message {
    id: string;
    authorId: string;
    authorName: string;
    text: string;
    timestamp: Date;
    type: 'text' | 'system';
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
    const { tournamentId } = route.params;
    const [activeTab, setActiveTab] = useState<'chat' | 'participants'>('chat');
    const { user } = useAuth();

    // 状態管理
    const [messages, setMessages] = useState<Message[]>([]);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [tournament, setTournament] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [userAverageDays, setUserAverageDays] = useState<Map<string, number>>(new Map());

    // メッセージの購読
    useEffect(() => {
        if (!user) return;

        const unsubscribe = TournamentService.subscribeToMessages(
            tournamentId,
            (firestoreMessages: FirestoreTournamentMessage[]) => {
                const convertedMessages: Message[] = firestoreMessages
                    .filter(msg => (msg as any).moderation?.status !== 'blocked')
                    .map(msg => ({
                        id: msg.id,
                        authorId: msg.authorId,
                        authorName: msg.authorName,
                        text: ((msg as any).moderation?.status === 'flagged' || (msg as any).moderation?.status === 'pending')
                            ? '審査中のため本文を非表示'
                            : msg.text,
                        timestamp: (msg.createdAt as any).toDate ? (msg.createdAt as any).toDate() : (msg.createdAt as any),
                        type: msg.type,
                        avatar: msg.authorAvatar,
                    }));
                setMessages(convertedMessages);
                setLoading(false);
            }
        );

        return unsubscribe;
    }, [tournamentId, user]);

    // 大会情報と参加者の購読
    useEffect(() => {
        let unsubscribeParticipants: undefined | (() => void);
        const init = async () => {
            try {
                const tournamentData = await TournamentService.getTournament(tournamentId);
                setTournament(tournamentData);
                // オーナー情報を取得（Firestore優先、なければローカルにフォールバック）
                let ownerDisplayName: string | undefined;
                let ownerAvatarUrl: string | undefined;
                try {
                    if (tournamentData?.ownerId) {
                        const owner = await (await import('../services/firestore')).FirestoreUserService.getUserById(tournamentData.ownerId);
                        ownerDisplayName = owner?.displayName;
                        ownerAvatarUrl = owner?.photoURL;
                    }
                } catch { }
                if (!ownerDisplayName) {
                    const userService = UserService.getInstance();
                    ownerDisplayName = tournamentData?.ownerId === user?.uid ? (user?.displayName || undefined) : (await userService.getUserName());
                }
                if (!ownerAvatarUrl) {
                    const userService = UserService.getInstance();
                    ownerAvatarUrl = tournamentData?.ownerId === user?.uid ? (user?.avatarUrl || undefined) : (await userService.getAvatarUrl());
                }

                unsubscribeParticipants = TournamentService.subscribeToParticipants(tournamentId, async (list) => {
                    // オーナーが含まれていなければ追加
                    const ownerExists = list.some(p => p.userId === tournamentData?.ownerId);
                    const all = ownerExists || !tournamentData?.ownerId ? list : [{
                        id: 'owner-participant',
                        tournamentId,
                        userId: tournamentData.ownerId,
                        userName: ownerDisplayName || 'ユーザー',
                        userAvatar: ownerAvatarUrl,
                        status: 'joined',
                        joinedAt: tournamentData.createdAt,
                        progressPercent: 0,
                        currentDay: 0,
                    } as any, ...list];

                    const converted: Participant[] = all.map(p => ({
                        id: p.userId,
                        name: (p as any).userName,
                        avatar: (p as any).userAvatar,
                        role: p.userId === tournamentData?.ownerId ? 'owner' : 'member',
                        status: p.status,
                        progressPercent: p.progressPercent,
                        currentDay: p.currentDay,
                    }));

                    setParticipants(converted);

                    // 参加者の平均日数を取得
                    const averageDaysMap = new Map<string, number>();
                    for (const participant of converted) {
                        try {
                            const averageDays = await UserStatsService.getUserAverageDaysForRank(participant.id);
                            averageDaysMap.set(participant.id, averageDays);
                        } catch (error) {
                            console.error('ユーザーの平均日数取得に失敗:', participant.id, error);
                            averageDaysMap.set(participant.id, 0);
                        }
                    }
                    setUserAverageDays(averageDaysMap);
                });
            } catch (e) {
                console.error('大会データの購読初期化に失敗しました:', e);
                Alert.alert('エラー', '大会データの取得に失敗しました');
            }
        };
        init();
        return () => {
            if (unsubscribeParticipants) unsubscribeParticipants();
        };
    }, [tournamentId]);

    const handleSendMessage = async (text: string) => {
        if (!text.trim()) return;

        try {
            // メッセージポートエラー対策のため、タイムアウトを設定
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('メッセージ送信がタイムアウトしました')), 10000);
            });

            const sendPromise = TournamentService.sendMessage(
                tournamentId,
                undefined,
                undefined,
                text.trim(),
                user?.avatarUrl
            );

            await Promise.race([sendPromise, timeoutPromise]);
        } catch (error) {
            console.error('メッセージの送信に失敗しました:', error);

            // メッセージポートエラーの場合は特別な処理
            if (error instanceof Error && error.message.includes('message port')) {
                console.warn('メッセージポートエラーが発生しましたが、メッセージは送信された可能性があります');
                return; // エラーを表示せずに処理を続行
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
            />
        );
    };

    const handleParticipantPress = (participant: Participant) => {
        navigateToUserDetail(navigation, participant.id, participant.name, participant.avatar);
    };

    const handleKick = async (p: Participant) => {
        if (!tournament || user?.uid !== tournament.ownerId || p.role === 'owner') return;
        const doKick = async () => {
            try {
                await TournamentService.kickParticipant(tournamentId, p.id);
            } catch (e) {
                const err = handleFirestoreError(e);
                Alert.alert('エラー', err.message);
            }
        };
        if (Platform.OS === 'web') {
            if (window.confirm(`${p.name} を退会させますか？`)) await doKick();
        } else {
            Alert.alert('確認', `${p.name} を退会させますか？`, [
                { text: 'キャンセル', style: 'cancel' },
                { text: '退会', style: 'destructive', onPress: () => { doKick(); } },
            ]);
        }
    };

    const renderParticipant = ({ item }: { item: Participant }) => (
        <TouchableOpacity
            style={styles.participantItem}
            onPress={() => handleParticipantPress(item)}
            activeOpacity={0.8}
        >
            <UserProfileWithRank
                userName={item.name}
                userAvatar={item.avatar}
                averageDays={userAverageDays.get(item.id) || 0}
                size="medium"
                showRank={false}
                showTitle={true}
                title={getRankByDays(userAverageDays.get(item.id) || 0).title}
                style={styles.userProfileContainer}
            />
            {tournament && user?.uid === tournament.ownerId && item.role !== 'owner' && (
                <Button title="退会" variant="danger" size="small" onPress={() => handleKick(item)} />
            )}
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
                <Text style={styles.headerTitle}>大会ルーム</Text>
                {tournament && user?.uid === tournament.ownerId ? (
                    <TouchableOpacity
                        onPress={async () => {
                            const doDelete = async () => {
                                try {
                                    await TournamentService.deleteTournament(tournamentId);
                                    navigation.goBack();
                                } catch (e) {
                                    const err = handleFirestoreError(e);
                                    Alert.alert('エラー', err.message);
                                }
                            };
                            if (Platform.OS === 'web') {
                                if (window.confirm('大会を削除しますか？ この操作は取り消せません。')) await doDelete();
                            } else {
                                Alert.alert('確認', '大会を削除しますか？ この操作は取り消せません。', [
                                    { text: 'キャンセル', style: 'cancel' },
                                    { text: '削除', style: 'destructive', onPress: () => { doDelete(); } },
                                ]);
                            }
                        }}
                        style={styles.headerAction}
                    >
                        <Ionicons name="trash" size={22} color={colors.error} />
                    </TouchableOpacity>
                ) : (
                    <View style={styles.placeholder} />
                )}
            </View>

            {/* タブ */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'chat' && styles.activeTab]}
                    onPress={() => setActiveTab('chat')}
                >
                    <Text style={[styles.tabText, activeTab === 'chat' && styles.activeTabText]}>
                        トーク
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'participants' && styles.activeTab]}
                    onPress={() => setActiveTab('participants')}
                >
                    <Text style={[styles.tabText, activeTab === 'participants' && styles.activeTabText]}>
                        参加者一覧
                    </Text>
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
                <FlatList
                    data={participants}
                    renderItem={renderParticipant}
                    keyExtractor={(item) => item.id}
                    style={styles.participantsList}
                    contentContainerStyle={styles.participantsContent}
                    showsVerticalScrollIndicator={false}
                />
            )}
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
        marginRight: spacing.md,
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
