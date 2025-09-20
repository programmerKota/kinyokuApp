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
        setReplies((prev) => {
          // Avoid needless state updates when identical
          if (
            prev.length === repliesList.length &&
            prev.every((r, i) => r.id === repliesList[i]?.id && r.content === repliesList[i]?.content)
          ) {
            return prev;
          }
          return repliesList;
        });
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
            let days = await UserStatsService.getUserCurrentDaysForRank(userId);
            if (!days || days <= 0) {
              days = await UserStatsService.getUserAverageDaysForRank(userId);
            }
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
    // Align left start with PostCard content start.
    // PostCard content start = postContent.paddingLeft (spacing.lg) + CONTENT_LEFT_MARGIN.medium.
    // ReplyCard has paddingHorizontal: spacing.lg, so make
    //   RepliesList.paddingLeft + spacing.lg = spacing.lg + CONTENT_LEFT_MARGIN.medium
    // => RepliesList.paddingLeft = CONTENT_LEFT_MARGIN.medium
    paddingLeft: CONTENT_LEFT_MARGIN.medium,
    paddingBottom: spacing.sm,
  },
});

export default RepliesList;
