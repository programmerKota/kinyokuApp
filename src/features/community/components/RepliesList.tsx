import React, { useState, useEffect } from "react";
import { View, StyleSheet } from "react-native";

import { CommunityService } from "@core/services/firestore/communityService";
import { UserStatsService } from "@core/services/userStatsService";
import { colors, spacing } from "@shared/theme";
import { CONTENT_LEFT_MARGIN } from "@shared/utils/nameUtils";
import type { CommunityComment } from "@project-types";

import ReplyCard from "@features/community/components/ReplyCard";

interface RepliesListProps {
  postId: string;
  onUserPress: (userId: string, userName: string) => void;
}

const RepliesList: React.FC<RepliesListProps> = ({ postId, onUserPress }) => {
  const [replies, setReplies] = useState<CommunityComment[]>([]);
  const [userAverageDays, setUserAverageDays] = useState<Map<string, number>>(
    new Map(),
  );

  useEffect(() => {
    const unsubscribe = CommunityService.subscribeToPostReplies(
      postId,
      (repliesList: CommunityComment[]) => {
        setReplies(repliesList);
        // 返信の作者の平均日数を取得
        void initializeUserAverageDays(repliesList);
      },
    );
    return unsubscribe;
  }, [postId]);

  const initializeUserAverageDays = async (replies: CommunityComment[]) => {
        const averageDaysMap = new Map<string, number>();

    // 重複するユーザーIDを取得
    const uniqueUserIds = new Set(replies.map((reply) => reply.authorId));

        for (const userId of uniqueUserIds) {
          try {
        const days =
          await UserStatsService.getUserCurrentDaysForRank(userId);
        averageDaysMap.set(userId, days);
          } catch {
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
    // Align reply avatar left edge to the end of the post avatar (60px from post content left padding).
    // Desired left = 16 (post card padding) + 60 (avatar width)
    // Actual left = RepliesList.paddingLeft + 16 (ReplyCard paddingHorizontal)
    // => paddingLeft = 60 = CONTENT_LEFT_MARGIN.medium (68) - spacing.sm (8)
    paddingLeft: CONTENT_LEFT_MARGIN.medium - spacing.sm,
    paddingBottom: spacing.sm,
  },
});

export default RepliesList;
