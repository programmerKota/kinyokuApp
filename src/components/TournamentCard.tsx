import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Image,
} from 'react-native';
import Button from './Button';
import { colors, spacing, typography, shadows } from '../theme';
import uiStyles from '../ui/styles';

interface Tournament {
    id: string;
    name: string;
    description: string;
    participantCount: number;
    status: 'active' | 'completed' | 'cancelled';
    isJoined: boolean;
    ownerId: string;
}

interface TournamentCardProps {
    tournament: Tournament & { ownerName?: string; ownerAvatar?: string };
    onJoin: (tournamentId: string) => void;
    onView: (tournamentId: string) => void;
}

const TournamentCard: React.FC<TournamentCardProps> = ({
    tournament,
    onJoin,
    onView,
}) => {
    const canJoin = !tournament.isJoined && tournament.status === 'active';

    return (
        <TouchableOpacity style={styles.card} onPress={() => onView(tournament.id)}>
            <View style={[uiStyles.rowBetween, styles.header]}>
                <Text style={styles.title}>{tournament.name}</Text>
                <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>{tournament.participantCount}人参加中</Text>
                </View>
            </View>

            <Text style={styles.description} numberOfLines={2}>
                {tournament.description}
            </Text>

            <View style={[uiStyles.rowBetween, styles.footer]}>
                <View style={[uiStyles.row, styles.leftInfo]}>
                    <View style={[uiStyles.row, styles.ownerRow]}>
                        <TouchableOpacity
                            style={styles.ownerAvatarWrap}
                            onPress={() => onView(`user:${tournament.ownerId}` as any)}
                            activeOpacity={0.8}
                        >
                            {tournament.ownerAvatar ? (
                                <View style={styles.ownerAvatarWrap}>
                                    <Image source={{ uri: tournament.ownerAvatar }} style={styles.ownerAvatarImage} />
                                </View>
                            ) : (
                                <View style={styles.ownerAvatar}>
                                    <Text style={styles.ownerAvatarText}>{(tournament.ownerName || 'U').charAt(0)}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                        <Text style={styles.ownerText}>作成者: {tournament.ownerName || 'ユーザー'}</Text>
                    </View>
                </View>

                {canJoin ? (
                    <Button
                        title="参加"
                        onPress={() => onJoin(tournament.id)}
                        size="small"
                        style={styles.joinButton}
                    />
                ) : (
                    <View style={styles.joinedBadge}>
                        <Text style={styles.joinedText}>参加済み</Text>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: spacing.lg,
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: colors.borderPrimary,
        ...shadows.lg,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing.sm,
    },
    title: {
        fontSize: typography.fontSize.xl,
        fontWeight: typography.fontWeight.bold as any,
        color: colors.textPrimary,
        flex: 1,
        marginRight: spacing.sm,
        lineHeight: 28,
    },
    countBadge: {
        backgroundColor: colors.success,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: 16,
    },
    countBadgeText: {
        fontSize: typography.fontSize.xs,
        fontWeight: typography.fontWeight.semibold as any,
        color: colors.white,
    },
    description: {
        fontSize: typography.fontSize.sm,
        color: colors.textSecondary,
        lineHeight: 22,
        marginBottom: spacing.lg,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    leftInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    ownerRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    ownerAvatarWrap: {
        width: 32,
        height: 32,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: colors.backgroundSecondary,
        marginRight: spacing.sm,
    },
    ownerAvatarImage: {
        width: '100%',
        height: '100%',
    },
    ownerAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.info,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.sm,
    },
    ownerAvatarText: {
        color: colors.white,
        fontWeight: typography.fontWeight.semibold as any,
        fontSize: typography.fontSize.sm,
    },
    ownerText: {
        fontSize: typography.fontSize.sm,
        color: colors.textSecondary,
        fontWeight: typography.fontWeight.medium as any,
    },
    joinButton: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: 12,
    },
    joinedBadge: {
        backgroundColor: colors.warning,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: 12,
    },
    joinedText: {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.semibold as any,
        color: colors.white,
    },
});

export default TournamentCard;
