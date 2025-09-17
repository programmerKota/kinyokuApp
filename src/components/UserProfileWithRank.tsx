import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

import AvatarImage from './AvatarImage';
import { getRankByDays, getRankDisplayByDays } from '../services/rankService';
import { StatsService } from '../services/statsService';
import { colors, spacing, typography } from '../theme';
import { getUserNameStyle, getUserNameContainerStyle, getTitleStyle } from '../utils/nameUtils';

interface UserProfileWithRankProps {
  userName: string;
  userAvatar?: string;
  averageDays: number;
  onPress?: () => void;
  showRank?: boolean;
  showAverageTime?: boolean;
  showTitle?: boolean;
  size?: 'small' | 'medium' | 'large';
  style?: { [key: string]: unknown };
  textStyle?: { [key: string]: unknown };
}

const UserProfileWithRank: React.FC<UserProfileWithRankProps> = ({
  userName,
  userAvatar,
  averageDays,
  onPress,
  showRank = true,
  showAverageTime = false,
  showTitle = false,
  size = 'medium',
  style,
  textStyle,
}) => {
  const rank = getRankByDays(averageDays);

  const getSizeConfig = () => {
    switch (size) {
      case 'small':
        return {
          avatarSize: showTitle ? 40 : 32,
          fontSize: typography.fontSize.sm,
          rankFontSize: typography.fontSize.xs,
        };
      case 'large':
        return {
          avatarSize: showTitle ? 72 : 64,
          fontSize: typography.fontSize.base,
          rankFontSize: typography.fontSize.xs,
        };
      default: // medium
        return {
          avatarSize: showTitle ? 60 : 40,
          fontSize: typography.fontSize.base,
          rankFontSize: typography.fontSize.xs,
        };
    }
  };

  const sizeConfig = getSizeConfig();

  const ProfileContent = () => (
    <View style={[styles.container, style]}>
      {userAvatar ? (
        <AvatarImage uri={userAvatar} size={sizeConfig.avatarSize} style={styles.avatar} />
      ) : (
        <View
          style={[
            styles.avatarPlaceholder,
            {
              width: sizeConfig.avatarSize,
              height: sizeConfig.avatarSize,
              borderRadius: sizeConfig.avatarSize / 2,
            },
          ]}
        >
          <Ionicons name="person" size={sizeConfig.avatarSize * 0.5} color={colors.textSecondary} />
        </View>
      )}

      <View style={styles.userInfo}>
        <View style={[styles.nameRow, getUserNameContainerStyle()]}>
          <Text
            style={[
              styles.userName,
              getUserNameStyle({ fontSize: sizeConfig.fontSize }),
              textStyle,
            ]}
          >
            {userName}
          </Text>
          {showRank && (
            <View style={[styles.rankBadge, { backgroundColor: rank.color + '20' }]}>
              <Text
                style={[styles.rankText, { fontSize: sizeConfig.rankFontSize, color: rank.color }]}
              >
                {rank.title}
              </Text>
            </View>
          )}
        </View>
        {showTitle && (
          <Text style={[styles.userTitle, getTitleStyle(size)]}>
            {getRankDisplayByDays(averageDays)}
          </Text>
        )}
        {showAverageTime &&
          averageDays > 0 &&
          (() => {
            // StatsService.formatDuration expects seconds
            const averageTimeSeconds = averageDays * 24 * 60 * 60;
            const formatted = StatsService.formatDuration(averageTimeSeconds);
            const { days, time } = StatsService.splitFormattedDuration(formatted);
            const hasDays = days !== '0日';
            return (
              <View style={styles.averageTimeContainer}>
                {hasDays && (
                  <Text style={[styles.averageTime, { fontSize: sizeConfig.fontSize * 0.8 }]}>
                    {days}
                  </Text>
                )}
                <Text style={[styles.averageTimeSub, { fontSize: sizeConfig.fontSize * 0.8 }]}>
                  {time}
                </Text>
              </View>
            );
          })()}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        <ProfileContent />
      </TouchableOpacity>
    );
  }

  return <ProfileContent />;
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    backgroundColor: colors.borderPrimary,
  },
  avatarPlaceholder: {
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    flex: 1,
  },
  userName: {
    fontWeight: '600',
    color: colors.textPrimary,
    marginRight: spacing.sm,
    flexShrink: 1,
    lineHeight: 16,
  },
  rankBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  rankText: {
    fontWeight: '500',
    fontSize: 10,
    lineHeight: 12,
  },
  averageTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  averageTime: {
    fontWeight: '500',
    color: colors.textSecondary,
    marginRight: spacing.xs,
  },
  averageTimeSub: {
    fontWeight: '500',
    color: colors.textSecondary,
  },
  userTitle: {
    fontWeight: '500',
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 16,
  },
});

export default React.memo(UserProfileWithRank);
