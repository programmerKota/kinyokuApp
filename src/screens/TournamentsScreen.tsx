import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    StatusBar,
    FlatList,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import UserService from '../services/userService';
import { StackNavigationProp } from '@react-navigation/stack';
import TournamentCard from '../components/TournamentCard';
import CreateTournamentModal from '../components/CreateTournamentModal';
import { TournamentStackParamList } from '../navigation/TournamentStackNavigator';
import { TournamentService, FirestoreTournament, handleFirestoreError, FirestoreUserService } from '../services/firestore';
import { useAuth } from '../contexts/AuthContext';
import { colors, spacing, typography, shadows } from '../theme';
import { navigateToUserDetail } from '../utils';

type TournamentsScreenNavigationProp = StackNavigationProp<TournamentStackParamList, 'TournamentsList'>;

interface Tournament {
    id: string;
    name: string;
    description: string;
    participantCount: number;
    status: 'active' | 'completed' | 'cancelled';
    isJoined: boolean;
    ownerId: string;
    ownerName: string;
    ownerAvatar?: string;
}

const TournamentsScreen: React.FC = () => {
    const navigation = useNavigation<TournamentsScreenNavigationProp>();
    const { user } = useAuth();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [loading, setLoading] = useState(true);
    // 各大会の参加者購読を管理
    const participantsUnsubRef = useRef<Record<string, () => void>>({});

    // 大会一覧の購読
    useEffect(() => {
        if (!user) return;
        setLoading(true);
        const unsubscribe = TournamentService.subscribeToTournaments(async (firestoreTournaments) => {
            try {
                const currentUserId = await FirestoreUserService.getCurrentUserId();
                const convertedTournaments: Tournament[] = await Promise.all(
                    firestoreTournaments.map(async (tournament) => {
                        const participants = await TournamentService.getTournamentParticipants(tournament.id);
                        const isJoined = tournament.ownerId === currentUserId || participants.some(p => p.userId === currentUserId);
                        const participantCount = participants.some(p => p.userId === tournament.ownerId) ? participants.length : participants.length + 1;
                        // オーナー情報はFirestore優先。失敗時はローカルにフォールバック（自分がオーナーの場合）。
                        let owner = await FirestoreUserService.getUserById(tournament.ownerId);
                        if (!owner && tournament.ownerId === currentUserId) {
                            // 自分がオーナーならローカルのプロフィールを使用
                            const userService = UserService.getInstance();
                            owner = {
                                displayName: user?.displayName || (await userService.getUserName()),
                                photoURL: user?.avatarUrl || (await userService.getAvatarUrl()),
                            } as any;
                        }
                        return {
                            id: tournament.id,
                            name: tournament.name,
                            description: tournament.description,
                            participantCount,
                            status: tournament.status,
                            isJoined,
                            ownerId: tournament.ownerId,
                            ownerName: owner?.displayName ?? 'ユーザー',
                            ownerAvatar: owner?.photoURL,
                        };
                    })
                );
                setTournaments(convertedTournaments);

                // 既存の購読をクリーンアップして張り直す
                Object.values(participantsUnsubRef.current).forEach(unsub => {
                    try { unsub(); } catch { }
                });
                participantsUnsubRef.current = {};

                // 各大会の参加者変更を購読し、isJoined/participantCount をリアルタイム反映
                for (const t of firestoreTournaments) {
                    const unsub = TournamentService.subscribeToParticipants(t.id, async (parts) => {
                        const uid = await FirestoreUserService.getCurrentUserId();
                        setTournaments(prev => prev.map(item => {
                            if (item.id !== t.id) return item;
                            const joined = t.ownerId === uid || parts.some(p => p.userId === uid);
                            const count = parts.some(p => p.userId === t.ownerId) ? parts.length : parts.length + 1;
                            if (item.isJoined === joined && item.participantCount === count) return item;
                            return { ...item, isJoined: joined, participantCount: count };
                        }));
                    });
                    participantsUnsubRef.current[t.id] = unsub;
                }
            } catch (error) {
                const firestoreError = handleFirestoreError(error);
                Alert.alert('エラー', firestoreError.message);
            } finally {
                setLoading(false);
            }
        });
        return () => {
            unsubscribe();
            Object.values(participantsUnsubRef.current).forEach(unsub => {
                try { unsub(); } catch { }
            });
            participantsUnsubRef.current = {};
        };
    }, [user]);

    const handleJoinTournament = async (tournamentId: string) => {
        try {
            await TournamentService.joinTournament(tournamentId);
            // 楽観的更新で即時UI反映
            setTournaments(prev => prev.map(t => {
                if (t.id !== tournamentId) return t;
                if (t.isJoined) return t;
                return { ...t, isJoined: true, participantCount: t.participantCount + 1 };
            }));
            Alert.alert('参加完了', '大会に参加しました！');
        } catch (error) {
            console.error('大会への参加に失敗しました:', error);
            const firestoreError = handleFirestoreError(error);
            Alert.alert('エラー', firestoreError.message);
        }
    };

    const handleViewTournament = (idOrUserKey: string) => {
        if (idOrUserKey.startsWith('user:')) {
            const ownerId = idOrUserKey.replace('user:', '');
            const t = tournaments.find(t => t.ownerId === ownerId);
            navigateToUserDetail(navigation, ownerId, t?.ownerName, t?.ownerAvatar);
            return;
        }
        navigation.navigate('TournamentRoom', { tournamentId: idOrUserKey });
    };

    const handleCreateTournament = async (data: { name: string; description: string }) => {
        try {
            const now = new Date();
            const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30日後

            const tournamentId = await TournamentService.createTournament({
                name: data.name,
                description: data.description,
                ownerId: await FirestoreUserService.getCurrentUserId(),
                maxParticipants: 0, // 上限廃止
                entryFee: 0, // TODO: エントリーフィー機能を実装
                prizePool: 0, // TODO: 賞金プール機能を実装
                status: 'upcoming',
                startDate: now,
                endDate: endDate,
            });

            // 作成者を参加者として追加（購読によりUIへ反映）
            await TournamentService.joinTournament(tournamentId);
            Alert.alert('作成完了', '大会を作成しました！');
        } catch (error) {
            console.error('大会の作成に失敗しました:', error);
            const firestoreError = handleFirestoreError(error);
            Alert.alert('エラー', firestoreError.message);
        }
    };

    const renderTournament = ({ item }: { item: Tournament }) => (
        <TournamentCard
            tournament={item}
            onJoin={handleJoinTournament}
            onView={handleViewTournament}
        />
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.backgroundTertiary} />

            <View style={styles.header}>
                <Text style={styles.title}>大会一覧</Text>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>読み込み中...</Text>
                </View>
            ) : (
                <FlatList
                    data={tournaments}
                    renderItem={renderTournament}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                />
            )}

            {/* フローティングアクションボタン */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => setShowCreateModal(true)}
            >
                <Ionicons name="add" size={24} color={colors.white} />
            </TouchableOpacity>

            <CreateTournamentModal
                visible={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onCreate={handleCreateTournament}
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
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
        backgroundColor: colors.backgroundPrimary,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderPrimary,
    },
    title: {
        fontSize: typography.fontSize['2xl'],
        fontWeight: typography.fontWeight.bold as any,
        color: colors.textPrimary,
        textAlign: 'center',
    },
    fab: {
        position: 'absolute',
        bottom: spacing.xl,
        right: spacing.xl,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.info,
        justifyContent: 'center',
        alignItems: 'center',
        ...shadows.lg,
    },
    list: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        paddingBottom: spacing.xl,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: typography.fontSize.base,
        color: colors.textSecondary,
    },
});

export default TournamentsScreen;
