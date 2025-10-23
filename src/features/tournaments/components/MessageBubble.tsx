import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
} from "react-native";

import AvatarImage from "@shared/components/AvatarImage";
import { useDisplayProfile } from "@shared/hooks/useDisplayProfile";
import { spacing, typography, shadows, useAppTheme } from "@shared/theme";

interface MessageBubbleProps {
  message: {
    id: string;
    authorId: string;
    authorName: string;
    text: string;
    timestamp: Date;
    type: "text" | "system";
    avatar?: string;
  };
  isOwn: boolean;
  onUserPress?: (userId: string, userName: string, userAvatar?: string) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwn,
  onUserPress,
}) => {
  const { mode } = useAppTheme();
  const styles = useMemo(() => createStyles(mode), [mode]);
  const { name: displayName, avatar: displayAvatar } = useDisplayProfile(
    message.authorId,
    message.authorName,
    message.avatar,
  );

  if (message.type === "system") {
    return (
      <View style={styles.systemContainer}>
        <Text style={styles.systemText}>{message.text}</Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.messageContainer, isOwn && styles.ownMessageContainer]}
    >
      {!isOwn &&
        (onUserPress ? (
          <TouchableOpacity
            style={styles.avatarContainer}
            activeOpacity={0.8}
            onPress={() =>
              onUserPress(message.authorId, displayName, displayAvatar)
            }
          >
            {displayAvatar ? (
              <AvatarImage uri={displayAvatar} size={32} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(displayName || "ユーザー").charAt(0)}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.avatarContainer}>
            {displayAvatar ? (
              <AvatarImage uri={displayAvatar} size={32} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(displayName || "ユーザー").charAt(0)}
                </Text>
              </View>
            )}
          </View>
        ))}
      <View style={[styles.messageContent, isOwn && styles.ownMessageContent]}>
        {!isOwn &&
          (onUserPress ? (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() =>
                onUserPress(message.authorId, displayName, displayAvatar)
              }
            >
              <Text style={styles.authorName}>{displayName || "ユーザー"}</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.authorName}>{displayName || "ユーザー"}</Text>
          ))}
        {/* Bubble */}
        <View
          style={[
            styles.bubble,
            isOwn ? styles.ownBubble : styles.otherBubble,
            isOwn ? styles.bubbleOwn : styles.bubbleOther,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isOwn ? styles.ownMessageText : styles.otherMessageText,
              Platform.OS === "web" ? styles.messageTextWeb : null,
            ]}
          >
            {message.text}
          </Text>
        </View>
        {/* Timestamp below bubble to avoid row overflow */}
        <Text
          style={[
            styles.timestamp,
            isOwn ? styles.ownTimestamp : styles.otherTimestamp,
            isOwn ? { alignSelf: "flex-end" } : { alignSelf: "flex-start" },
          ]}
        >
          {message.timestamp.toLocaleTimeString("ja-JP", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </View>
    </View>
  );
};

const createStyles = (mode: "light" | "dark") => {
  const { colorSchemes } = require("@shared/theme/colors");
  const colors = colorSchemes[mode];

  return StyleSheet.create({
    messageContainer: {
      marginVertical: spacing.xs,
      paddingHorizontal: spacing.lg,
      flexDirection: "row",
      alignItems: "flex-start",
    },
    ownMessageContainer: {
      justifyContent: "flex-end",
    },
    avatarContainer: {
      marginRight: spacing.sm,
      marginTop: 2,
    },
    messageContent: {
      flex: 1,
      minWidth: 0, // allow children to shrink and wrap on web
      alignItems: "flex-start", // default: content-sized bubble
    },
    ownMessageContent: {
      alignItems: "flex-end", // own messages right-aligned
    },
    bubbleRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      flex: 1,
      minWidth: 0,
    },
    avatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.info,
      justifyContent: "center",
      alignItems: "center",
    },
    avatarText: {
      fontSize: typography.fontSize.sm,
      fontWeight: "bold",
      color: colors.white,
    },
    bubble: {
      maxWidth: "80%",
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderRadius: 20,
      ...shadows.base,
      flexShrink: 1,
      minWidth: 0,
    },
    bubbleOther: {
      alignSelf: "flex-start",
    },
    bubbleOwn: {
      alignSelf: "flex-end",
    },
    ownBubble: {
      backgroundColor: colors.info,
      borderBottomRightRadius: 4,
    },
    otherBubble: {
      backgroundColor: colors.backgroundSecondary,
      borderBottomLeftRadius: 4,
    },
    authorName: {
      fontSize: typography.fontSize.xs,
      fontWeight: "600",
      color: colors.info,
      marginBottom: spacing.xs,
      marginLeft: spacing.xs,
    },
    messageText: {
      fontSize: typography.fontSize.base,
      lineHeight: 22,
      flexShrink: 1,
      flexWrap: "wrap",
    },
    messageTextWeb: {
      // RN Web specific: allow long words/continuous text to wrap
      wordBreak: "break-all",
      overflowWrap: "anywhere",
      whiteSpace: "pre-wrap",
    } as unknown as import("react-native").TextStyle,
    ownMessageText: {
      color: colors.white,
    },
    otherMessageText: {
      color: colors.gray800,
    },
    timestamp: {
      fontSize: 11,
      marginBottom: 2,
    },
    ownTimestamp: {
      color: colors.textTertiary,
      marginRight: spacing.sm,
    },
    otherTimestamp: {
      color: colors.textTertiary,
      marginLeft: spacing.sm,
    },
    systemContainer: {
      alignItems: "center",
      marginVertical: spacing.md,
      paddingHorizontal: spacing.lg,
    },
    systemText: {
      fontSize: typography.fontSize.xs,
      color: colors.textSecondary,
      fontStyle: "italic",
      backgroundColor: colors.gray100,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: 12,
    },
  });
};

export default React.memo(MessageBubble, (prev, next) => {
  const a = prev.message;
  const b = next.message;
  return (
    prev.isOwn === next.isOwn &&
    a.id === b.id &&
    a.text === b.text &&
    a.authorId === b.authorId &&
    a.type === b.type &&
    a.timestamp.getTime() === b.timestamp.getTime()
  );
});
