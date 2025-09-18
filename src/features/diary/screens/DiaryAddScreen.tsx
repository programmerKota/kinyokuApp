import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar, TextInput } from 'react-native';

import { useAuth } from '@app/contexts/AuthContext';
import { ChallengeService, DiaryService } from '@core/services/firestore';
import { colors, spacing, typography } from '@shared/theme';

const DiaryAddScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [day, setDay] = useState<number>(1);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    void (async () => {
      if (!user?.uid) return;
      const active = await ChallengeService.getActiveChallenge(user.uid);
      if (active) {
        const startedAt = (active.startedAt as any)?.toDate?.() || (active.startedAt as any);
        const now = new Date();
        const d = Math.floor((now.getTime() - startedAt.getTime()) / (24 * 3600 * 1000)) + 1;
        if (d > 0) setDay(d);
      }
    })();
  }, [user?.uid]);

  const submit = async () => {
    if (!user?.uid || !text.trim() || sending) return;
    setSending(true);
    try {
      await DiaryService.addDiaryForActiveChallenge(user.uid, text.trim());
      setText('');
      navigation.goBack();
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.backgroundTertiary} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={colors.gray800} />
        </TouchableOpacity>
        <Text style={styles.title}>今の日記に追加</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.banner}>
        <Text style={styles.bannerText}>今日（{day}日目）の記録</Text>
      </View>

      <View style={styles.inputBox}>
        <TextInput
          placeholder="いまの気付きや変化を書きましょう"
          placeholderTextColor={colors.textSecondary}
          value={text}
          onChangeText={setText}
          multiline
          autoFocus
          style={styles.input}
        />
        <TouchableOpacity onPress={submit} disabled={!text.trim() || sending} style={[styles.submitBtn, (!text.trim() || sending) && styles.submitBtnDisabled]}>
          <Text style={styles.submitText}>追加</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundTertiary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderPrimary,
  },
  backButton: { padding: spacing.sm },
  title: { flex: 1, textAlign: 'center', fontSize: typography.fontSize.lg, fontWeight: 'bold', color: colors.gray800 },
  banner: { backgroundColor: colors.white, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.borderPrimary },
  bannerText: { fontSize: typography.fontSize.base, fontWeight: '700', color: colors.textPrimary },
  inputBox: { backgroundColor: colors.white, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md },
  input: { minHeight: 140, borderWidth: 1, borderColor: colors.borderPrimary, borderRadius: 12, padding: spacing.md, color: colors.textPrimary, textAlignVertical: 'top' },
  submitBtn: { alignSelf: 'flex-end', marginTop: spacing.sm, backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: 20 },
  submitBtnDisabled: { backgroundColor: colors.gray300 },
  submitText: { color: colors.white, fontWeight: '600' },
});

export default DiaryAddScreen;

