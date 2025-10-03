import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import React, { useMemo, useState } from "react";
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View,
  TextInput,
  Text,
  Platform,
  TouchableOpacity,
} from "react-native";

import { useAuth } from "@app/contexts/AuthContext";
import { FeedbackService } from "@core/services/feedbackService";
import Button from "@shared/components/Button";
import { colors, spacing, typography } from "@shared/theme";

const FeedbackScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const canSend = useMemo(
    () => subject.trim().length > 0 && message.trim().length > 0,
    [subject, message],
  );

  const handleSubmit = async () => {
    if (!canSend || sending) return;
    setSending(true);
    try {
      await FeedbackService.submit({
        userId: user?.uid,
        subject: subject.trim(),
        message: message.trim(),
        platform: `${Platform.OS} ${Platform.Version}`,
      });
      setSent(true);
      setSubject("");
      setMessage("");
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={colors.backgroundTertiary}
      />
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
          title={sent ? "送信しました" : "送信"}
          onPress={() => {
            void handleSubmit();
          }}
          disabled={!canSend || sent}
          loading={sending}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundTertiary,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    backgroundColor: colors.white,
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
    color: colors.gray800,
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
    color: colors.gray800,
    fontWeight: "600",
  },
  input: {
    marginTop: 6,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderPrimary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.gray800,
  },
  textarea: {
    minHeight: 160,
  },
});

export default FeedbackScreen;
