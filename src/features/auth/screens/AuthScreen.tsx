import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';

import DSButton from '@shared/designSystem/components/DSButton';
import { colors, spacing, typography } from '@shared/theme';
import { supabase, supabaseConfig } from '@app/config/supabase.config';
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
  const [emailTouched, setEmailTouched] = useState(false);
  const [passTouched, setPassTouched] = useState(false);
  const [triedSubmit, setTriedSubmit] = useState(false);
  const [submitting, setSubmitting] = useState<null | 'login' | 'signup' | 'reset' | 'oauth'>(null);

  useEffect(() => {
    (async () => {
      try { const v = await AsyncStorage.getItem(KNOWN_USER_KEY); setTab(v === '1' ? 'login' : 'signup'); } catch { }
    })();
  }, []);

  const validateEmail = useCallback((v: string) => {
    if (!v.trim()) return 'メールアドレスを入力してください。';
    const re = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    if (!re.test(v.trim())) return '正しい形式のメールアドレスを入力してください。';
    return null;
  }, []);

  const validatePass = useCallback((v: string) => {
    const s = v || '';
    if (!s) return 'パスワードを入力してください。';
    if (s.length < 8) return 'パスワードは8文字以上で入力してください。';
    // 英数字・記号（ASCII） のみ許可（日本語・全角は不可）
    if (!/^[\x21-\x7E]+$/.test(s)) return 'パスワードは英数字・記号のみで入力してください。';
    return null;
  }, []);

  useEffect(() => { setEmailErr(validateEmail(email)); }, [email, validateEmail]);
  useEffect(() => { setPassErr(validatePass(password)); }, [password, validatePass]);

  const canSubmit = useMemo(() => !emailErr && !passErr && !!email && !!password, [emailErr, passErr, email, password]);

  const submit = useCallback(async () => {
    if (!canSubmit) {
      setTriedSubmit(true);
      setEmailTouched(true);
      setPassTouched(true);
      return;
    }
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
    console.log('startOAuth called with provider:', provider);
    try {
      setSubmitting('oauth');
      const redirectTo = (typeof window !== 'undefined' && Platform.OS === 'web')
        ? window.location.origin
        : getRedirectTo();
      console.log('OAuth redirectTo:', redirectTo);
      console.log('Starting OAuth with provider:', provider);
      const result = await supabase.auth.signInWithOAuth({
        provider: provider as any,
        options: {
          redirectTo,
          skipBrowserRedirect: Platform.OS !== 'web',
        },
      });
      console.log('OAuth result:', result);
      if (Platform.OS !== 'web') {
        const url = result?.data?.url || `${supabaseConfig.url}/auth/v1/authorize?provider=${encodeURIComponent(provider)}&redirect_to=${encodeURIComponent(redirectTo)}&flow_type=pkce`;
        await Linking.openURL(url);
      } else if (result?.data?.url) {
        try { window.location.href = result.data.url; } catch {}
      }
    } catch (error) {
      console.error('OAuth error:', error);
      // エラーが発生してもsubmitting状態をリセット
    } finally {
      setSubmitting(null);
    }
  }, []);

  const doReset = useCallback(async () => {
    if (validateEmail(email)) { setEmailErr(validateEmail(email)); setEmailTouched(true); return; }
    try {
      setSubmitting('reset');
      await resetPassword(email.trim());
    } finally { setSubmitting(null); }
  }, [email, validateEmail]);

  const anyOAuth = oauthConfig.twitter || oauthConfig.google || oauthConfig.amazon || oauthConfig.line;

  // デバッグ用ログ
  console.log('OAuth Config:', oauthConfig);
  console.log('Google OAuth enabled:', oauthConfig.google);
  console.log('anyOAuth:', anyOAuth);
  console.log('submitting state:', submitting);

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <Text style={styles.brand}>abstinence</Text>
        <View style={styles.tabs}>
          <Pressable onPress={() => setTab('login')} style={[styles.tab, tab === 'login' && styles.tabActive]}><Text style={[styles.tabText, tab === 'login' && styles.tabTextActive]}>ログイン</Text></Pressable>
          <Pressable onPress={() => setTab('signup')} style={[styles.tab, tab === 'signup' && styles.tabActive]}><Text style={[styles.tabText, tab === 'signup' && styles.tabTextActive]}>新規登録</Text></Pressable>
        </View>

        <View style={{ marginTop: spacing.lg }}>
          <Text style={styles.label}>メールアドレス</Text>
          <TextInput testID="login-email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="sample@example.com"
            placeholderTextColor={colors.textSecondary}
            onBlur={() => setEmailTouched(true)}
            style={[styles.input, (emailTouched || triedSubmit) && emailErr ? styles.inputError : null]}
          />
          {(emailTouched || triedSubmit) && emailErr ? <Text style={styles.hintError}>{emailErr}</Text> : null}

          <View style={{ height: spacing.md }} />

          <Text style={styles.label}>パスワード</Text>
          <View style={[styles.input, passErr ? styles.inputError : null, { flexDirection: 'row', alignItems: 'center' }]}>
            <TextInput testID="login-password"
              style={{ flex: 1, color: colors.textPrimary }}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPass}
              placeholder="英数字・記号のみ・8文字以上"
              placeholderTextColor={colors.textSecondary}
              onBlur={() => setPassTouched(true)}
            />
            <TouchableOpacity onPress={() => setShowPass((v) => !v)}>
              <Ionicons name={showPass ? 'eye-off' : 'eye'} size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.hint}>英数字・記号のみ・8文字以上</Text>
          {(passTouched || triedSubmit) && passErr ? <Text style={styles.hintError}>{passErr}</Text> : null}

          <View style={styles.linksRow}>
            <Pressable onPress={doReset}><Text style={styles.link}>パスワードを忘れた方</Text></Pressable>
          </View>

          <View style={styles.keepRow}>
            <TouchableOpacity onPress={() => setKeepSignedIn((v) => !v)} style={styles.checkbox}>
              {keepSignedIn ? <View style={styles.checkboxInner} /> : null}
            </TouchableOpacity>
            <Text style={{ color: colors.textSecondary }}>次回から自動ログイン</Text>
          </View>

          <DSButton testID="login-submit"
            title={tab === 'login' ? (submitting === 'login' ? 'サインイン中…' : 'ログイン') : (submitting === 'signup' ? '作成中…' : '新規登録')}
            onPress={submit}
            loading={submitting === tab}
            disabled={!canSubmit || !!submitting}
            style={{ width: '100%', marginTop: spacing.lg }}
          />

          {anyOAuth ? (
            <View style={{ alignItems: 'center', marginTop: spacing.lg }}>
              <Text style={{ color: colors.textSecondary }}>— または —</Text>
              <Text style={{ color: colors.textSecondary, fontWeight: '600', marginTop: 6 }}>連携済みのアカウントでログイン</Text>
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                {oauthConfig.twitter && (
                  <Pressable onPress={() => { void startOAuth('twitter'); }} style={styles.iconBtn}><Ionicons name="logo-twitter" size={20} color={colors.textPrimary} /></Pressable>
                )}
                {oauthConfig.google && (
                  <Pressable
                    onPress={() => {
                      console.log('Google OAuth button pressed (config)');
                      void startOAuth('google');
                    }}
                    style={[styles.iconBtn, submitting === 'oauth' && styles.iconBtnDisabled]}
                    disabled={submitting === 'oauth'}
                  >
                    <Ionicons name="logo-google" size={20} color={submitting === 'oauth' ? colors.textSecondary : colors.textPrimary} />
                  </Pressable>
                )}
                {oauthConfig.amazon && (
                  <Pressable onPress={() => { void startOAuth('amazon'); }} style={styles.iconBtn}><Ionicons name="logo-amazon" size={20} color={colors.textPrimary} /></Pressable>
                )}
                {oauthConfig.line && (
                  <Pressable onPress={() => { void startOAuth('line'); }} style={[styles.iconBtn, { backgroundColor: '#06C755', borderColor: '#06C755' }]}><Text style={{ color: 'white', fontWeight: '800', fontSize: 12 }}>LINE</Text></Pressable>
                )}
              </View>
            </View>
          ) : (
            <View style={{ alignItems: 'center', marginTop: spacing.lg }}>
              <Text style={{ color: colors.textSecondary }}>OAuth設定が無効です</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Google: {oauthConfig.google ? '有効' : '無効'}</Text>
            </View>
          )}
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
  iconBtnDisabled: { opacity: 0.5, backgroundColor: colors.backgroundSecondary },
});

export default AuthScreen;
