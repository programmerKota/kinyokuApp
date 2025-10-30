import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@app/contexts/AuthContext";
import { useAuthPrompt } from "@shared/auth/AuthPromptProvider";
import ReplyInputBar from "@shared/components/ReplyInputBar";
import { spacing, typography, useAppTheme } from "@shared/theme";
import { colorSchemes, type ColorPalette } from "@shared/theme/colors";

import { submitCommunityReply } from "../utils/replySubmission";

type ReplyComposerRouteParams = {
  postId: string;
  postAuthorName?: string;
  postContentPreview?: string;
};

const ReplyComposerScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { requireAuth } = useAuthPrompt();
  const { user } = useAuth();
  const params = route.params as ReplyComposerRouteParams;
  const { postId, postAuthorName, postContentPreview } = params || {};

  const { mode } = useAppTheme();
  const colors = useMemo(() => colorSchemes[mode], [mode]);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const authorSnapshot = useMemo(
    () =>
      user
        ? {
            id: user.uid,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
          }
        : undefined,
    [user],
  );

  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleClose = () => {
    if (replyText.trim().length === 0) {
      navigation.goBack();
      return;
    }
    Alert.alert("下書きを破棄しますか？", undefined, [
      { text: "キャンセル", style: "cancel" },
      {
        text: "破棄",
        style: "destructive",
        onPress: () => navigation.goBack(),
      },
    ]);
  };

  const handleSubmit = async () => {
    if (!postId) {
      navigation.goBack();
      return;
    }
    if (!replyText.trim()) {
      return;
    }
    const ok = await requireAuth();
    if (!ok) return;
    try {
      setSubmitting(true);
      await submitCommunityReply(postId, replyText, authorSnapshot);
      navigation.goBack();
    } catch (error) {
      const message =
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        (error as { message?: string })?.message === "empty_reply"
          ? "返信内容を入力してください"
          : "返信の送信に失敗しました。時間をおいて再度お試しください。";
      Alert.alert("送信エラー", message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleClose}
          style={styles.headerIcon}
          accessibilityLabel="閉じる"
        >
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>返信を作成</Text>
        <View style={styles.headerSpacer} />
      </View>
      <KeyboardAvoidingView
        style={styles.keyboardAvoiding}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
      >
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentInner}
          keyboardShouldPersistTaps="handled"
        >
          {postAuthorName ? (
            <Text style={styles.replyingTo}>{postAuthorName} に返信</Text>
          ) : null}
          {postContentPreview ? (
            <View style={styles.previewBubble}>
              <Text style={styles.previewText}>{postContentPreview}</Text>
            </View>
          ) : null}
        </ScrollView>
        <ReplyInputBar
          value={replyText}
          onChangeText={setReplyText}
          onCancel={handleClose}
          onSubmit={handleSubmit}
          autoFocus
        />
        {submitting ? (
          <View style={styles.overlay}>
            <Text style={styles.overlayText}>送信中…</Text>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const createStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.backgroundSecondary,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderPrimary,
    },
    headerIcon: {
      padding: spacing.sm,
    },
    headerTitle: {
      flex: 1,
      textAlign: "center",
      fontSize: typography.fontSize.lg,
      fontWeight: "700",
      color: colors.textPrimary,
    },
    headerSpacer: {
      width: 32,
    },
    keyboardAvoiding: {
      flex: 1,
    },
    content: {
      flex: 1,
    },
    contentInner: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      gap: spacing.md,
    },
    replyingTo: {
      fontSize: typography.fontSize.sm,
      color: colors.textSecondary,
    },
    previewBubble: {
      borderLeftWidth: 2,
      borderLeftColor: colors.borderPrimary,
      paddingLeft: spacing.md,
    },
    previewText: {
      fontSize: typography.fontSize.base,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "rgba(0,0,0,0.08)",
    },
    overlayText: {
      color: colors.textPrimary,
      fontSize: typography.fontSize.base,
    },
  });

export default ReplyComposerScreen;
