import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { useProfile } from '../hooks/useProfile';
import { colors, spacing } from '../theme';
import type { CommunityComment } from '../types';
import UserProfileWithRank from './UserProfileWithRank';
import { uiStyles } from '../ui/styles';
import { formatRelative } from '../utils';
import type { DateLike } from '../utils/date';
import { getContentStyle, CONTENT_LEFT_MARGIN, getBlockLeftMargin } from '../utils/nameUtils';

// 共通の左マージン値は nameUtils.ts からインポート

interface ReplyCardProps {
  reply: CommunityComment;
  onPress: () => void;
  authorAverageDays?: number;
}

const ReplyCard: React.FC<ReplyCardProps> = ({ reply, onPress, authorAverageDays = 0 }) => {
  const formatDate = (date: DateLike) => formatRelative(date, { showSeconds: false });
  const liveProfile = useProfile(reply.authorId);
  const displayName = liveProfile?.displayName ?? reply.authorName;
  const displayAvatar = liveProfile?.photoURL ?? reply.authorAvatar;

  return (
    <View style={styles.container}>
      <View style={styles.replyContent}>
        <View style={[uiStyles.rowStart, styles.header]}>
          <UserProfileWithRank
            userName={displayName}
            userAvatar={displayAvatar}
            averageDays={authorAverageDays}
            onPress={onPress}
            size="small"
            showRank={false}
            showTitle={true}
            style={styles.userProfileContainer}
          />
          <Text style={uiStyles.timestampRight}>{formatDate(reply.createdAt)}</Text>
        </View>

        {reply.moderation?.status !== 'blocked' && (
          <View style={styles.content}>
            {reply.moderation?.status === 'flagged' || reply.moderation?.status === 'pending' ? (
              <Text style={styles.pendingText}>審査中のため本文を非表示</Text>
            ) : (
              <Text style={[styles.text, getContentStyle('small')]}>{reply.content}</Text>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    marginBottom: 0,
  },
  replyContent: {
    padding: spacing.lg,
    // 返信プロフィール（アバター+名前）の開始位置を「返信を書く」ボタンの開始位置と合わせる
    // PostCard.replyButtonSpacer と同じ幅
    marginLeft: CONTENT_LEFT_MARGIN.medium,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 0,
    width: '100%',
  },
  userProfileContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },

  content: {
    marginBottom: spacing.sm,
    // 返信本文の開始位置を「名前の開始位置」に合わせる
    marginLeft: getBlockLeftMargin('small'),
  },
  text: {
    // 共通関数でスタイルを管理するため、基本スタイルのみ
  },
  pendingText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
});

export default ReplyCard;
