import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import React, { useMemo, useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  Text,
  Platform,
  TouchableOpacity,
  Alert,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppStatusBar from "@shared/theme/AppStatusBar";

import { feedbackConfig } from "@app/config/feedback.config";
import { useAuth } from "@app/contexts/AuthContext";
import Button from "@shared/components/Button";
import { spacing, typography, useAppTheme } from "@shared/theme";
import * as MailComposer from "expo-mail-composer";

const FeedbackScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const { mode } = useAppTheme();
  const { colorSchemes } = require("@shared/theme/colors");
  const colors = useMemo(() => colorSchemes[mode], [mode]);
  const styles = useMemo(() => createStyles(mode), [mode]);

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  // 送信先メールアドレス（EXPO_PUBLIC_FEEDBACK_EMAIL があれば優先）
  const FEEDBACK_EMAIL = feedbackConfig.email ?? "";
  const emailConfigured = FEEDBACK_EMAIL.length > 0;

  const canSend = useMemo(
    () => subject.trim().length > 0 && message.trim().length > 0,
    [subject, message],
  );

  const doSubmit = useCallback(async () => {
    if (!canSend || sending) return;
    if (!emailConfigured) {
      Alert.alert(
        "設定エラー",
        "送信先メールが未設定です。管理者に連絡してください。",
      );
      return;
    }
    setSending(true);
    try {
      const subj = subject.trim();
      const body = `${message.trim()}\n\n---\nPlatform: ${Platform.OS} ${Platform.Version}`;

      // 1) Expo MailComposer（対応端末）
      const available = await MailComposer.isAvailableAsync();
      if (available) {
        const result = await MailComposer.composeAsync({
          recipients: [FEEDBACK_EMAIL],
          subject: subj,
          body,
        });
        if (result.status === MailComposer.MailComposerStatus.SENT) {
          setSent(true);
          setSubject("");
          setMessage("");
          Alert.alert(
            "送信完了",
            "メールアプリから送信しました。ありがとうございます！",
          );
          return;
        }
        // cancelled などの場合も特にエラーにはしない
        return;
      }

      // 2) Web/未対応端末: mailto にフォールバック
      const url = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(
        subj,
      )}&body=${encodeURIComponent(body)}`;
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        setSent(true);
        return;
      }

      Alert.alert("エラー", "端末のメール機能にアクセスできませんでした。");
    } catch (e: unknown) {
      console.error("Feedback mail compose failed:", e);
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert("エラー", "メールの作成に失敗しました: " + msg);
    } finally {
      setSending(false);
    }
  }, [canSend, sending, subject, message]);

  return (
    <SafeAreaView style={styles.container}>
      <AppStatusBar />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ padding: spacing.sm }}
        >
          <Ionicons name="arrow-back" size={22} color={colors.gray800} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>フィードバック</Text>
        <View style={{ width: 22 }} />
      </View>
      <View style={styles.form}>
        <Text style={styles.label}>件名</Text>
        <TextInput
          placeholder="例: 目標日数の選択UIについて"
          placeholderTextColor={colors.textSecondary}
          value={subject}
          onChangeText={setSubject}
          style={styles.input}
        />
        <Text style={[styles.label, { marginTop: spacing.lg }]}>内容</Text>
        <TextInput
          placeholder="できるだけ具体的にご記入ください"
          placeholderTextColor={colors.textSecondary}
          value={message}
          onChangeText={setMessage}
          style={[styles.input, styles.textarea]}
          multiline
          textAlignVertical="top"
        />
        <View style={{ height: spacing.lg }} />
        <Button
          title={
            emailConfigured
              ? sent
                ? "送信しました"
                : "メールで送信"
              : "送信先未設定"
          }
          onPress={() => {
            void doSubmit();
          }}
          disabled={!canSend || sent || !emailConfigured}
          loading={sending}
        />
        {!emailConfigured && (
          <Text style={{ color: colors.error, marginTop: spacing.sm }}>
            管理者: EXPO_PUBLIC_FEEDBACK_EMAIL が未設定です。
          </Text>
        )}
        {sent && (
          <Text style={styles.successMessage}>
            ✅ フィードバックを送信しました。ありがとうございます！
          </Text>
        )}
      </View>

      {/* Auth modal is handled globally by AuthPromptProvider */}
    </SafeAreaView>
  );
};

const createStyles = (mode: "light" | "dark") => {
  const { colorSchemes } = require("@shared/theme/colors");
  const colors = colorSchemes[mode];

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.backgroundTertiary,
    },
    header: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.lg,
      backgroundColor: colors.backgroundSecondary,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderPrimary,
      flexDirection: "row",
      alignItems: "center",
    },
    headerTitle: {
      flex: 1,
      textAlign: "center",
      fontSize: typography.fontSize.lg,
      fontWeight: "700",
      color: colors.textPrimary,
    },
    subTitle: {
      marginTop: 4,
      color: colors.textSecondary,
    },
    form: {
      padding: spacing.lg,
    },
    label: {
      fontSize: typography.fontSize.sm,
      color: colors.textPrimary,
      fontWeight: "600",
    },
    input: {
      marginTop: 6,
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.borderPrimary,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      color: colors.textPrimary,
    },
    textarea: {
      minHeight: 160,
    },
    successMessage: {
      marginTop: spacing.md,
      textAlign: "center",
      color: colors.success,
      fontSize: typography.fontSize.sm,
      fontWeight: "600",
    },
  });
};

export default FeedbackScreen;
