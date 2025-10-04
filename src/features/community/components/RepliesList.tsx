import React, { useState, useEffect } from "react";
import { View, StyleSheet } from "react-native";

import { CommunityService } from "@core/services/firestore/communityService";
import { UserStatsService } from "@core/services/userStatsService";
import ReplyCard from "@features/community/components/ReplyCard";
import type { CommunityComment } from "@project-types";
import { colors, spacing } from "@shared/theme";
import { ReplyEventBus } from "@shared/state/replyEventBus";
import { CONTENT_LEFT_MARGIN } from "@shared/utils/nameUtils";

interface RepliesListProps {
  postId: string;
  onUserPress: (userId: string, userName: string) => void;
  allowBlockedReplies?: boolean;
}

const RepliesList: React.FC<RepliesListProps> = ({
  postId,
  onUserPress,
  allowBlockedReplies = false,
}) => {
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
            prev.every(
              (r, i) =>
                r.id === repliesList[i]?.id &&
                r.content === repliesList[i]?.content,
            )
          ) {
            return prev;
          }
          return repliesList;
        });
        void initializeUserAverageDays(repliesList);
      },
    );
    return unsubscribe;
  }, [postId, allowBlockedReplies]);

  // Local fallback: if a reply was added from this client but Realtime is delayed,
  // nudge refresh by fetching the latest replies on emit.
  useEffect(() => {
    const unsub = ReplyEventBus.subscribe(postId, () => {
      void (async () => {
        try {
          const list = await CommunityService.getPostReplies(postId);
          setReplies((prev) => {
            if (
              prev.length === list.length &&
              prev.every((r, i) => r.id === list[i]?.id && r.content === list[i]?.content)
            ) {
              return prev;
            }
            return list;
          });
          void initializeUserAverageDays(list);
        } catch {}
      })();
    });
    return unsub;
  }, [postId]);

  const initializeUserAverageDays = async (replies: CommunityComment[]) => {
    const averageDaysMap = new Map<string, number>();

    // 重複するユーザーIDを取得
    const uniqueUserIds = new Set(replies.map((reply) => reply.authorId));

    for (const userId of uniqueUserIds) {
      try {
        const days = await UserStatsService.getUserCurrentDaysForRank(userId);
        averageDaysMap.set(userId, Math.max(0, days));
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
