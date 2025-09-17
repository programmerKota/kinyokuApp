import React, { useState, useEffect } from "react";
import { View, StyleSheet } from "react-native";

import { CommunityService } from "../services/firestore";
import { UserStatsService } from "../services/userStatsService";
import { colors, spacing } from "../theme";
import type { CommunityComment } from "../types";
import ReplyCard from "./ReplyCard";
import { CONTENT_LEFT_MARGIN } from "../utils/nameUtils";

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
        const averageDays =
          await UserStatsService.getUserAverageDaysForRank(userId);
        averageDaysMap.set(userId, averageDays);
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
    // 親Postの本文開始位置（アバター+余白）に揃える
    // PostCardは本文ブロックに marginLeft=CONTENT_LEFT_MARGIN.medium を適用している。
    // ReplyCardは内部に paddingLeft=spacing.lg を持つため、その差分だけ親側で詰める。
    // 68 - 16 = 52
    paddingLeft: CONTENT_LEFT_MARGIN.medium - spacing.lg,
    paddingBottom: spacing.sm, // 下部に余白を追加
  },
});

export default RepliesList;
