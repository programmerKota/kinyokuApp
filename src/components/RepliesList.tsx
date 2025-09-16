import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, spacing } from '../theme';
import { CommunityComment } from '../types';
import { CommunityService } from '../services/firestore';
import { UserStatsService } from '../services/userStatsService';
import ReplyCard from './ReplyCard';

interface RepliesListProps {
    postId: string;
    onUserPress: (userId: string, userName: string) => void;
}

const RepliesList: React.FC<RepliesListProps> = ({ postId, onUserPress }) => {
    const [replies, setReplies] = useState<CommunityComment[]>([]);
    const [userAverageDays, setUserAverageDays] = useState<Map<string, number>>(new Map());

    useEffect(() => {
        const unsubscribe = CommunityService.subscribeToPostReplies(postId, (repliesList) => {
            setReplies(repliesList);
            // 返信の作者の平均日数を取得
            initializeUserAverageDays(repliesList);
        });
        return unsubscribe;
    }, [postId]);

    const initializeUserAverageDays = async (replies: CommunityComment[]) => {
        const averageDaysMap = new Map<string, number>();

        // 重複するユーザーIDを取得
        const uniqueUserIds = new Set(replies.map(reply => reply.authorId));

        for (const userId of uniqueUserIds) {
            try {
                const averageDays = await UserStatsService.getUserAverageDaysForRank(userId);
                averageDaysMap.set(userId, averageDays);
            } catch (error) {
                console.error('ユーザーの平均日数取得に失敗:', userId, error);
                averageDaysMap.set(userId, 0);
            }
        }

        setUserAverageDays(averageDaysMap);
    };

    if (replies.length === 0) {
        return null;
    }

    return (
        <View style={styles.container}>
            {replies.map((reply) => (
                <ReplyCard
                    key={reply.id}
                    reply={reply}
                    onPress={() => onUserPress(reply.authorId, reply.authorName)}
                    authorAverageDays={userAverageDays.get(reply.authorId) || 0}
                />
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.white,
        paddingLeft: 0, // インデントを削除
        paddingBottom: spacing.sm, // 下部に余白を追加
    },
});

export default RepliesList;
