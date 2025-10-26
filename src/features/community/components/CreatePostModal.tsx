import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TextInput,
  TouchableOpacity,
  Platform,
} from "react-native";
import AppStatusBar from "@shared/theme/AppStatusBar";

import { useModerationGuard } from "@shared/hooks/useModerationGuard";
import {
  spacing,
  typography,
  useAppTheme,
  useThemedStyles,
} from "@shared/theme";
import { colorSchemes, type ColorPalette } from "@shared/theme/colors";
import { createUiStyles } from "@shared/ui/styles";
import Modal from "@shared/components/Modal";

interface CreatePostModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (post: { content: string }) => void;
}

const CreatePostModal: React.FC<CreatePostModalProps> = ({
  visible,
  onClose,
  onSubmit,
}) => {
  const { mode } = useAppTheme();
  const uiStyles = useThemedStyles(createUiStyles);
  const colors = React.useMemo(() => colorSchemes[mode], [mode]);
  const styles = useThemedStyles(createStyles);

  const [content, setContent] = useState("");
  const guard = useModerationGuard(content);

  const handleSubmit = () => {
    if (!content.trim() || !guard.canSend) {
      Alert.alert("エラー", "投稿内容を入力してください");
      return;
    }

    onSubmit({
      content: content.trim(),
    });

    setContent("");
    onClose();
  };

  const handleClose = () => {
    setContent("");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      onClose={handleClose}
      title="投稿を作成"
      maxWidth={480}
    >
      <View style={styles.content}>
        <TextInput
          style={styles.textInput}
          placeholder="今何をしていますか？"
          placeholderTextColor={colors.textSecondary}
          value={content}
          onChangeText={setContent}
          multiline
          maxLength={280}
          autoFocus
        />

        <View style={[uiStyles.rowBetween, styles.footer]}>
          <View style={styles.counterContainer}>
            <Text
              style={[
                styles.counter,
                content.length > 260 && styles.counterWarning,
              ]}
            >
              {content.length}/280
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleSubmit}
            style={[
              styles.postButton,
              !content.trim() && styles.postButtonDisabled,
            ]}
            disabled={!content.trim()}
          >
            <Text
              style={[
                styles.postButtonText,
                !content.trim() && styles.postButtonTextDisabled,
              ]}
            >
              投稿
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
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
      justifyContent: "flex-end",
      alignItems: "center",
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderPrimary,
    },
    keyboardAvoidingView: {
      flex: 1,
    },
    closeButton: {
      padding: spacing.sm,
      borderRadius: 20,
      backgroundColor: colors.gray100,
    },
    content: {
      flex: 1,
      padding: spacing.xl,
    },
    footer: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: spacing.lg,
    },
    postButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      borderRadius: 25,
      minWidth: 80,
      alignItems: "center",
    },
    postButtonDisabled: {
      backgroundColor: colors.gray300,
    },
    postButtonText: {
      color: colors.white,
      fontSize: typography.fontSize.base,
      fontWeight: "600",
    },
    postButtonTextDisabled: {
      color: colors.gray500,
    },
    textInput: {
      fontSize: typography.fontSize.lg,
      color: colors.textPrimary,
      minHeight: 200,
      textAlignVertical: "top",
      lineHeight: 26,
      backgroundColor: colors.gray50,
      borderRadius: 12,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.borderPrimary,
      flex: 1,
    },
    counterContainer: {
      alignItems: "flex-end",
    },
    counter: {
      fontSize: typography.fontSize.sm,
      color: colors.textSecondary,
      fontWeight: typography.fontWeight.medium,
    },
    counterWarning: {
      color: colors.warning,
    },
  });

export default CreatePostModal;
