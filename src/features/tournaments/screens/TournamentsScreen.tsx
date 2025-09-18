import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Timestamp } from 'firebase/firestore';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, StatusBar, FlatList, TouchableOpacity, Alert } from 'react-native';

import { useAuth } from '@app/contexts/AuthContext';
import type { TournamentStackParamList } from '@app/navigation/TournamentStackNavigator';
import {
    TournamentService,
    handleFirestoreError,
    FirestoreUserService,
} from '@core/services/firestore';
import UserService from '@core/services/userService';
import ConfirmDialog from '@shared/components/ConfirmDialog';
import useErrorHandler from '@shared/hooks/useErrorHandler';
import { colors, spacing, typography, shadows } from '@shared/theme';
import { navigateToUserDetail } from '@shared/utils/navigation';

import CreateTournamentModal from '@features/tournaments/components/CreateTournamentModal';
import MemoizedTournamentCard from '@features/tournaments/components/MemoizedTournamentCard';
import VirtualizedList from '@features/tournaments/components/VirtualizedList';
import useTournamentParticipants from '@features/tournaments/hooks/useTournamentParticipants';

type TournamentsScreenNavigationProp = StackNavigationProp<
    TournamentStackParamList,
    'TournamentsList'
>;

interface Tournament {
    id: string;
    name: string;
    description: string;
    participantCount: number;
    status: 'upcoming' | 'active' | 'completed' | 'cancelled';
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
    const [participantsState, participantsActions] = useTournamentParticipants();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [loading, setLoading] = useState(true);
    const [confirm, setConfirm] = useState<{ visible: boolean; title?: string; message?: string; onConfirm?: () => void; loading?: boolean }>({ visible: false });

    // トーナメント一覧の購読
    useEffect(() => {
        if (!user) {
            // 未ログイン時にスピナーが出続けないよう抑止
            setLoading(false);
            return;
        }
        setLoading(true);
        const unsubscribe = TournamentService.subscribeToTournaments(async (firestoreTournaments) => {
            try {
                const currentUserId = await FirestoreUserService.getCurrentUserId();

                // 参加者情報のキャッシュを更新
                const tournamentIds = firestoreTournaments.map(t => t.id);
                await participantsActions.refreshParticipants(tournamentIds);

                const convertedTournaments: Tournament[] = await Promise.all(
                    firestoreTournaments.map(async (tournament) => {
                        const participants = participantsActions.getParticipants(tournament.id);
                        const isJoined =
                            tournament.ownerId === currentUserId ||
                            participants.some((p) => p.userId === currentUserId);
                        const participantCount = participants.some((p) => p.userId === tournament.ownerId)
                            ? participants.length
                            : participants.length + 1;
                        // オーナー情報は Firestore を優先。なければローカルにフォールバック
                        let owner = await FirestoreUserService.getUserById(tournament.ownerId);
                        if (!owner && tournament.ownerId === currentUserId) {
                            // 現ユーザーの情報をローカルから取得
                            const userService = UserService.getInstance();
                            owner = {
                                displayName: user?.displayName || (await userService.getUserName()),
                                photoURL: user?.avatarUrl || (await userService.getAvatarUrl()),
                            };
                        }
                        // 参加申請が pending かチェック
                        let requestPending = false;
                        try {
                            const { getDocs, collection, query, where } = await import('firebase/firestore');
                            const { db } = await import('@app/config/firebase.config');
                            const qReq = query(
                                collection(db, 'tournamentJoinRequests'),
                                where('tournamentId', '==', tournament.id),
                                where('userId', '==', currentUserId),
                                where('status', '==', 'pending'),
                            );
                            const reqSnap = await getDocs(qReq);
                            requestPending = !reqSnap.empty;
                        } catch { }

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
                            recruitmentOpen: tournament.recruitmentOpen ?? true,
                            requestPending,
                        };
                    }),
                );
                setTournaments(convertedTournaments);
            } catch (error) {
                handleError(error, {
                    component: 'TournamentsScreen',
                    action: 'loadTournaments',
                }, {
                    fallbackMessage: 'トーナメント一覧の取得に失敗しました',
                });
            } finally {
                setLoading(false);
            }
        });
        return () => {
            unsubscribe();
        };
    }, [user, participantsActions, handleError]);

    const handleJoinTournament = useCallback(async (tournamentId: string) => {
        try {
            const t = tournaments.find((x) => x.id === tournamentId);
            if (t && t.ownerId === user?.uid) {
                Alert.alert('トーナメント作成者', 'あなたが作成したトーナメントには参加できません。');
                return;
            }
            if (t && t.recruitmentOpen === false) {
                Alert.alert('募集停止中', '現在このトーナメントは募集停止中です。');
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
            Alert.alert('申請完了', '参加申請を送信しました。主催者の承認をお待ちください。');
        } catch (error) {
            handleError(error, {
                component: 'TournamentsScreen',
                action: 'joinTournament',
            }, {
                fallbackMessage: 'トーナメントへの参加申請に失敗しました',
            });
        }
    }, [tournaments, user?.uid, handleError]);

    const handleViewTournament = useCallback((idOrUserKey: string) => {
        if (idOrUserKey.startsWith('user:')) {
            const ownerId = idOrUserKey.replace('user:', '');
            const t = tournaments.find((t) => t.ownerId === ownerId);
            navigateToUserDetail(navigation, ownerId, t?.ownerName, t?.ownerAvatar);
            return;
        }
        navigation.navigate('TournamentRoom', { tournamentId: idOrUserKey });
    }, [tournaments, navigation]);

    const handleCreateTournament = useCallback(async (data: { name: string; description: string }) => {
        try {
            const now = new Date();
            const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30日間
            const tournamentId = await TournamentService.createTournament({
                name: data.name,
                description: data.description,
                ownerId: await FirestoreUserService.getCurrentUserId(),
                maxParticipants: 0, // 無制限
                entryFee: 0, // TODO: エントリー料金対応
                prizePool: 0, // TODO: 賞金対応
                status: 'upcoming',
                recruitmentOpen: true,
                startDate: Timestamp.fromDate(now),
                endDate: Timestamp.fromDate(endDate),
            });

            // 作成者を参加者へ追加して UI を更新
            await TournamentService.joinTournament(tournamentId);
            Alert.alert('作成完了', 'トーナメントを作成しました。');
        } catch (error) {
            handleError(error, {
                component: 'TournamentsScreen',
                action: 'createTournament',
            }, {
                fallbackMessage: 'トーナメントの作成に失敗しました',
            });
        }
    }, [handleError]);

    const handleToggleRecruitment = useCallback(async (id: string, open: boolean) => {
        try {
            await TournamentService.setRecruitmentOpen(id, open);
            setTournaments((prev) => prev.map((t) => (t.id === id ? { ...t, recruitmentOpen: open } : t)));
        } catch (error) {
            handleError(error, {
                component: 'TournamentsScreen',
                action: 'toggleRecruitment',
            }, {
                fallbackMessage: '募集状態の切り替えに失敗しました',
            });
        }
    }, [handleError]);

    const handleDeleteTournament = useCallback((id: string) => {
        setConfirm({
            visible: true,
            title: 'トーナメントを削除',
            message: 'この操作は取り消せません。削除しますか？',
            onConfirm: async () => {
                setConfirm((s) => ({ ...s, loading: true }));
                try {
                    await TournamentService.deleteTournament(id);
                    setTournaments((prev) => prev.filter((t) => t.id !== id));
                } catch (error) {
                    handleError(error, {
                        component: 'TournamentsScreen',
                        action: 'deleteTournament',
                    }, {
                        fallbackMessage: 'トーナメントの削除に失敗しました',
                    });
                } finally {
                    setConfirm({ visible: false });
                }
            },
        });
    }, [handleError]);

    const renderTournament = useCallback(({ item }: { item: Tournament }) => (
        <MemoizedTournamentCard
            tournament={item}
            onJoin={handleJoinTournament}
            onView={handleViewTournament}
            onToggleRecruitment={handleToggleRecruitment}
            showDelete={user?.uid === item.ownerId}
            onDelete={handleDeleteTournament}
        />
    ), [handleJoinTournament, handleViewTournament, handleToggleRecruitment, handleDeleteTournament, user?.uid]);

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.backgroundTertiary} />

            <View style={styles.header}>
                <Text style={styles.title}>トーナメント一覧</Text>
            </View>

            <VirtualizedList
                data={tournaments}
                renderItem={renderTournament}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                loading={loading}
                hasMore={false} // 今はページング未対応
                emptyMessage="トーナメントがありません"
                itemHeight={200} // カード高さの目安
                maxToRenderPerBatch={5}
                windowSize={10}
                initialNumToRender={10}
            />

            {/* 作成ボタン（アクションボタン） */}
            <TouchableOpacity style={styles.fab} onPress={() => setShowCreateModal(true)}>
                <Ionicons name="add" size={24} color={colors.white} />
            </TouchableOpacity>

            <CreateTournamentModal
                visible={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onCreate={handleCreateTournament}
            />
            <ConfirmDialog
                visible={confirm.visible}
                title={confirm.title || ''}
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
        fontWeight: typography.fontWeight.bold,
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
});

export default TournamentsScreen;
