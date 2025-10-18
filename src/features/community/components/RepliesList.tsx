import React, { useState, useEffect, useCallback, memo, useMemo } from "react";
import { View, StyleSheet, FlatList } from "react-native";

import { CommunityService } from "@core/services/firestore/communityService";
import { UserStatsService } from "@core/services/userStatsService";
import ReplyCard from "@features/community/components/ReplyCard";
import type { CommunityComment } from "@project-types";
import { spacing, useAppTheme } from "@shared/theme";
import { ReplyEventBus } from "@shared/state/replyEventBus";
import { useBlockedIds } from "@shared/state/blockStore";
import { ReplyCountStore } from "@shared/state/replyStore";
import { CONTENT_LEFT_MARGIN } from "@shared/utils/nameUtils";

interface RepliesListProps {
  postId: string;
  onUserPress: (userId: string, userName: string, userAvatar?: string) => void;
  allowBlockedReplies?: boolean;
}

type RowProps = {
  reply: CommunityComment;
  avgDays: number;
  onUserPress: (userId: string, userName: string, userAvatar?: string) => void;
};

const ReplyRow: React.FC<RowProps> = memo(({ reply, avgDays, onUserPress }) => (
  <ReplyCard
    reply={reply}
    onPress={(uid, uname, uavatar) => onUserPress(uid, uname, uavatar)}
    authorAverageDays={avgDays}
  />
));

const RepliesList: React.FC<RepliesListProps> = ({
  postId,
  onUserPress,
  allowBlockedReplies = false,
}) => {
  const { mode } = useAppTheme();
  const { colorSchemes } = require("@shared/theme/colors");
  const colors = useMemo(() => colorSchemes[mode], [mode]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [replies, setReplies] = useState<CommunityComment[]>([]);
  const blockedSet = useBlockedIds();
  const [userAverageDays, setUserAverageDays] = useState<Map<string, number>>(
    new Map(),
  );

  useEffect(() => {
    const unsubscribe = CommunityService.subscribeToPostReplies(
      postId,
      (repliesList: CommunityComment[]) => {
        const visible = allowBlockedReplies
          ? repliesList
          : repliesList.filter((r) => !blockedSet.has(r.authorId));
        setReplies((prev) => {
          if (
            prev.length === visible.length &&
            prev.every((r, i) => r.id === visible[i]?.id && r.content === visible[i]?.content)
          ) {
            return prev;
          }
          return visible;
        });
        // keep bubble count in sync with visible items
        try { ReplyCountStore.set(postId, visible.length); } catch { }
        void initializeUserAverageDays(visible);
      },
    );
    return unsubscribe;
  }, [postId, allowBlockedReplies, blockedSet]);

  // Local fallback: if a reply was added from this client but Realtime is delayed,
  // nudge refresh by fetching the latest replies on emit.
  useEffect(() => {
    const unsub = ReplyEventBus.subscribe(postId, () => {
      void (async () => {
        try {
          const list = await CommunityService.getPostReplies(postId);
          const visible = allowBlockedReplies
            ? list
            : list.filter((r) => !blockedSet.has(r.authorId));
          setReplies((prev) => {
            if (
              prev.length === visible.length &&
              prev.every((r, i) => r.id === visible[i]?.id && r.content === visible[i]?.content)
            ) {
              return prev;
            }
            return visible;
          });
          try { ReplyCountStore.set(postId, visible.length); } catch { }
          void initializeUserAverageDays(visible);
        } catch { }
      })();
    });
    return unsub;
  }, [postId, allowBlockedReplies, blockedSet]);

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

  const renderItem = useCallback(({ item }: { item: CommunityComment }) => (
    <ReplyRow
      reply={item}
      avgDays={userAverageDays.get(item.authorId) || 0}
      onUserPress={onUserPress}
    />
  ), [userAverageDays, onUserPress]);

  if (replies.length === 0) return null;

  return (
    <FlatList
      data={replies}
      keyExtractor={(r) => r.id}
      renderItem={renderItem}
      contentContainerStyle={styles.container}
      initialNumToRender={6}
      windowSize={9}
      maxToRenderPerBatch={10}
      removeClippedSubviews
    />
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    // 前の余白と背景に戻す（従来のレイアウトを維持）
    backgroundColor: colors.white,
    // ReplyInputBar「返信を書く」テキスト開始位置に合わせた従来の padding
    // container.padding (spacing.lg) + submitBtn.paddingHorizontal (spacing.lg) + 微調整(spacing.md)
    paddingLeft: spacing.lg + spacing.lg + spacing.md,
    paddingBottom: spacing.sm,
  },
});

export default RepliesList;
