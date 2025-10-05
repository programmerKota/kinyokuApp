import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import DSButton from '@shared/designSystem/components/DSButton';
import { colors, spacing, typography } from '@shared/theme';
import { supabase } from '@app/config/supabase.config';
import { signInWithEmailPassword, signUpWithEmailPassword, resetPassword, getRedirectTo } from '@core/services/supabase/authService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { oauthConfig } from '@app/config/oauth.config';

const KNOWN_USER_KEY = 'auth_known_user_v1';

const AuthScreen: React.FC = () => {
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [emailErr, setEmailErr] = useState<string | null>(null);
  const [passErr, setPassErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<null | 'login' | 'signup' | 'reset' | 'oauth'>(null);

  useEffect(() => {
    (async () => {
      try { const v = await AsyncStorage.getItem(KNOWN_USER_KEY); setTab(v === '1' ? 'login' : 'signup'); } catch {}
    })();
  }, []);

  const validateEmail = useCallback((v: string) => {
    if (!v.trim()) return 'メールアドレスを入力してください。';
    const re = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    if (!re.test(v.trim())) return '正しい形式のメールアドレスを入力してください。';
    return null;
  }, []);

  const validatePass = useCallback((v: string) => {
    if (!v) return 'パスワードを入力してください。';
    if (v.length < 8) return 'パスワードは8文字以上の英数字で入力してください。';
    return null;
  }, []);

  useEffect(() => { setEmailErr(validateEmail(email)); }, [email, validateEmail]);
  useEffect(() => { setPassErr(validatePass(password)); }, [password, validatePass]);

  const canSubmit = useMemo(() => !emailErr && !passErr && !!email && !!password, [emailErr, passErr, email, password]);

  const submit = useCallback(async () => {
    if (!canSubmit) return;
    try {
      setSubmitting(tab);
      if (tab === 'login') {
        await signInWithEmailPassword(email.trim(), password);
      } else {
        await signUpWithEmailPassword(email.trim(), password);
      }
      await AsyncStorage.setItem(KNOWN_USER_KEY, '1');
    } finally {
      setSubmitting(null);
    }
  }, [tab, canSubmit, email, password]);

  const startOAuth = useCallback(async (provider: 'google' | 'twitter' | 'amazon' | 'line') => {
    try {
      setSubmitting('oauth');
      const redirectTo = typeof window !== 'undefined' ? window.location.origin : getRedirectTo();
      await supabase.auth.signInWithOAuth({ provider: provider as any, options: { redirectTo } });
    } finally {
      setSubmitting(null);
    }
  }, []);

  const doReset = useCallback(async () => {
    if (validateEmail(email)) { setEmailErr(validateEmail(email)); return; }
    try {
      setSubmitting('reset');
      await resetPassword(email.trim());
    } finally { setSubmitting(null); }
  }, [email, validateEmail]);

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <Text style={styles.brand}>abstinence</Text>
        <View style={styles.tabs}>
          <Pressable onPress={() => setTab('login')} style={[styles.tab, tab==='login' && styles.tabActive]}><Text style={[styles.tabText, tab==='login' && styles.tabTextActive]}>ログイン</Text></Pressable>
          <Pressable onPress={() => setTab('signup')} style={[styles.tab, tab==='signup' && styles.tabActive]}><Text style={[styles.tabText, tab==='signup' && styles.tabTextActive]}>新規登録</Text></Pressable>
        </View>

        <View style={{ marginTop: spacing.lg }}>
          <Text style={styles.label}>メールアドレス</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="sample@example.com"
            placeholderTextColor={colors.textSecondary}
            style={[styles.input, emailErr ? styles.inputError : null]}
          />
          {emailErr ? <Text style={styles.hintError}>{emailErr}</Text> : null}

          <View style={{ height: spacing.md }} />

          <Text style={styles.label}>パスワード</Text>
          <View style={[styles.input, passErr ? styles.inputError : null, { flexDirection: 'row', alignItems: 'center' }] }>
            <TextInput
              style={{ flex: 1, color: colors.textPrimary }}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPass}
              placeholder="半角英数字のみ・8文字以上"
              placeholderTextColor={colors.textSecondary}
            />
            <TouchableOpacity onPress={() => setShowPass((v) => !v)}>
              <Ionicons name={showPass ? 'eye-off' : 'eye'} size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.hint}>半角英数字のみ・8文字以上</Text>
          {passErr ? <Text style={styles.hintError}>{passErr}</Text> : null}

          <View style={styles.linksRow}>
            <Pressable onPress={doReset}><Text style={styles.link}>パスワードを忘れた方</Text></Pressable>
          </View>

          <View style={styles.keepRow}>
            <TouchableOpacity onPress={() => setKeepSignedIn((v) => !v)} style={styles.checkbox}>
              {keepSignedIn ? <View style={styles.checkboxInner} /> : null}
            </TouchableOpacity>
            <Text style={{ color: colors.textSecondary }}>次回から自動ログイン</Text>
          </View>

          <DSButton
            title={tab==='login' ? (submitting==='login' ? 'サインイン中…' : 'ログイン') : (submitting==='signup' ? '作成中…' : '新規登録')}
            onPress={submit}
            loading={submitting === tab}
            style={{ width: '100%', marginTop: spacing.lg }}
          />

          <View style={{ alignItems: 'center', marginTop: spacing.lg }}>
            <Text style={{ color: colors.textSecondary }}>— または —</Text>
            <Text style={{ color: colors.textSecondary, fontWeight: '600', marginTop: 6 }}>連携済みのアカウントでログイン</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
              {oauthConfig.twitter && (
                <Pressable onPress={() => { void startOAuth('twitter'); }} style={styles.iconBtn}><Ionicons name="logo-twitter" size={20} color={colors.textPrimary} /></Pressable>
              )}
              {oauthConfig.google && (
                <Pressable onPress={() => { void startOAuth('google'); }} style={styles.iconBtn}><Ionicons name="logo-google" size={20} color={colors.textPrimary} /></Pressable>
              )}
              {oauthConfig.amazon && (
                <Pressable onPress={() => { void startOAuth('amazon'); }} style={styles.iconBtn}><Ionicons name="logo-amazon" size={20} color={colors.textPrimary} /></Pressable>
              )}
              {oauthConfig.line && (
                <Pressable onPress={() => { void startOAuth('line'); }} style={[styles.iconBtn, { backgroundColor: '#06C755', borderColor: '#06C755' }]}><Text style={{ color: 'white', fontWeight: '800', fontSize: 12 }}>LINE</Text></Pressable>
              )}
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: colors.backgroundSecondary, alignItems: 'center', justifyContent: 'center', padding: spacing['2xl'] },
  card: { width: '100%', maxWidth: 520, backgroundColor: colors.white, borderRadius: 16, padding: spacing['2xl'], borderWidth: 1, borderColor: colors.borderPrimary },
  brand: { fontSize: typography.fontSize['2xl'], fontWeight: '800', color: colors.textPrimary, textAlign: 'center' },
  tabs: { flexDirection: 'row', marginTop: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.borderPrimary },
  tab: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.primary },
  tabText: { color: colors.textSecondary, fontWeight: '600' },
  tabTextActive: { color: colors.primary },
  label: { color: colors.textSecondary, fontWeight: '700', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colors.borderPrimary, borderRadius: 12, paddingHorizontal: spacing.lg, paddingVertical: 14, backgroundColor: colors.white },
  inputError: { borderColor: colors.error },
  hint: { color: colors.textSecondary, fontSize: 12, marginTop: 6 },
  hintError: { color: colors.error, fontSize: 12, marginTop: 6 },
  linksRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: spacing.sm },
  link: { color: colors.primary, fontWeight: '700' },
  keepRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: spacing.sm },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1, borderColor: colors.borderPrimary, alignItems: 'center', justifyContent: 'center' },
  checkboxInner: { width: 12, height: 12, borderRadius: 2, backgroundColor: colors.primary },
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.borderPrimary, alignItems: 'center', justifyContent: 'center' },
});

export default AuthScreen;
