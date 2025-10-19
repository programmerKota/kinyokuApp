import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Pressable, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import Modal from '@shared/components/Modal';
import * as WebBrowser from 'expo-web-browser';
import LegalContent from '@features/legal/components/LegalContent';

import DSButton from '@shared/designSystem/components/DSButton';
import { spacing, typography, useAppTheme } from '@shared/theme';
import { createScreenThemes } from '@shared/theme/screenThemes';
import { supabase, supabaseConfig } from '@app/config/supabase.config';
import { signInWithEmailPassword, signUpWithEmailPassword, resetPassword, getRedirectTo } from '@core/services/supabase/authService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { oauthConfig } from '@app/config/oauth.config';

const KNOWN_USER_KEY = 'auth_known_user_v1';
const LAST_MAGIC_EMAIL_KEY = 'auth_last_magic_email_v1';
const TERMS_URL = 'https://example.com/terms';
const PRIVACY_URL = 'https://example.com/privacy';

const AuthScreen: React.FC = () => {
  const { mode } = useAppTheme();
  const { colorSchemes } = require('@shared/theme/colors');
  const colors = useMemo(() => colorSchemes[mode], [mode]);
  const screenThemes = useMemo(() => createScreenThemes(colors), [colors]);
  const styles = useMemo(() => createAuthStyles(colors), [colors]);

  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [agreeTermsTos, setAgreeTermsTos] = useState(false);
  const [agreeTermsPrivacy, setAgreeTermsPrivacy] = useState(false);
  const [emailErr, setEmailErr] = useState<string | null>(null);
  const [passErr, setPassErr] = useState<string | null>(null);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passTouched, setPassTouched] = useState(false);
  const [triedSubmit, setTriedSubmit] = useState(false);
  const [submitting, setSubmitting] = useState<null | 'login' | 'signup' | 'reset' | 'oauth' | 'magic'>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [legalModal, setLegalModal] = useState<{ visible: boolean; type: 'terms' | 'privacy' }>({ visible: false, type: 'terms' });
  // 開発用バイパスは無効化（状態は廃止）
  // const [devBypass, setDevBypass] = useState(false);

  useEffect(() => {
    (async () => {
      try { const v = await AsyncStorage.getItem(KNOWN_USER_KEY); setTab(v === '1' ? 'login' : 'signup'); } catch { }
    })();
  }, []);

  // タブ切替時に不要なエラーメッセージをリセット
  useEffect(() => {
    setEmailErr(null);
    setPassErr(null);
    setTriedSubmit(false);
    setInfoMsg(null);
  }, [tab]);

  // 開発用バイパスの現在状態を読み込み
  useEffect(() => {
    // 開発用バイパスの読み込みは廃止
    (async () => { /* no-op */ })();
  }, []);

  // Deep link handling is centralized in initSupabaseAuthDeepLinks() (see App.tsx)

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
    // 半角英数字のみ許可（記号・全角は不可）
    if (!/^[0-9A-Za-z]+$/.test(s)) return 'パスワードは半角英数字のみで入力してください。';
    return null;
  }, []);

  useEffect(() => { setEmailErr(validateEmail(email)); }, [email, validateEmail]);
  useEffect(() => { setPassErr(validatePass(password)); }, [password, validatePass]);

  const canSubmit = useMemo(() => {
    if (tab === 'signup') {
      // サインアップ（パスワードレス）: メール + 規約・プライバシー両方に同意
      return !emailErr && !!email && agreeTermsTos && agreeTermsPrivacy;
    }
    // ログイン（パスワードレス）: メールのみ
    return !emailErr && !!email;
  }, [emailErr, email, tab, agreeTermsTos, agreeTermsPrivacy]);

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
  // Visual state for buttons and icon colors
  const loginDisabled = !email || !!submitting;
  const signupDisabled = !canSubmit || !!submitting;
  const googleDisabled = submitting === 'oauth' || (tab === 'signup' && !(agreeTermsTos && agreeTermsPrivacy));
  const loginMailColor = loginDisabled ? colors.gray500 : screenThemes.auth.accent;
  const signupMailColor = signupDisabled ? colors.gray500 : screenThemes.auth.accent;

  const startOAuth = useCallback(async (provider: 'google' | 'twitter' | 'amazon' | 'line') => {
    try {
      setSubmitting('oauth');
      const redirectTo = getRedirectTo();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider as any,
        options: {
          redirectTo,
          skipBrowserRedirect: Platform.OS !== 'web',
        },
      });
      if (error || !data?.url) {
        console.error('OAuth start failed', error);
        return;
      }
      if (Platform.OS !== 'web') {
        // Prefer in-app auth session to ensure return to app
        try {
          // For native, we need to use the custom scheme URL
          // The redirectTo sent to Supabase might be different (proxy for Expo Go)
          // but WebBrowser needs the actual deep link that will open the app
          const scheme = Linking.createURL('');
          const returnUrl = `${scheme}auth/callback`;
          console.log('[AuthScreen] OAuth redirectTo (for Supabase) =', redirectTo);
          console.log('[AuthScreen] OAuth start url =', data.url);
          console.log('[AuthScreen] WebBrowser returnUrl (for app return) =', returnUrl);
          const res = await WebBrowser.openAuthSessionAsync(data.url, returnUrl);
          console.log('[AuthScreen] WebBrowser result:', res?.type);
        } catch (e) {
          console.error('[AuthScreen] WebBrowser error:', e);
          await Linking.openURL(data.url);
        }
      } else {
        try { (window as any).location.href = data.url; } catch { }
      }
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

  const sendMagicLink = useCallback(async () => {
    const err = validateEmail(email);
    if (err) { setEmailErr(err); setEmailTouched(true); return; }
    try {
      setSubmitting('magic');
      const emailTrimmed = email.trim();
      try { await AsyncStorage.setItem(LAST_MAGIC_EMAIL_KEY, emailTrimmed); } catch { }
      const redirectToWithEmail = `${getRedirectTo()}?email=${encodeURIComponent(emailTrimmed)}`;
      if (tab === 'signup') {
        const { error } = await supabase.auth.signInWithOtp({
          email: emailTrimmed,
          options: { emailRedirectTo: redirectToWithEmail, shouldCreateUser: true },
        });
        if (error) {
          setEmailErr('メールの送信に失敗しました。時間をおいて再度お試しください。');
          return;
        }
        setInfoMsg('登録用のリンクをメールに送信しました');
      } else {
        const { error } = await supabase.auth.signInWithOtp({
          email: emailTrimmed,
          options: { emailRedirectTo: redirectToWithEmail, shouldCreateUser: false },
        });
        if (error) {
          setEmailErr('このメールアドレスは登録がありません。新規登録をご利用ください。');
          setEmailTouched(true);
          return;
        }
        setInfoMsg('ログイン用のリンクをメールに送信しました');
      }
    } catch (e) {
      setEmailErr('メールの送信に失敗しました。時間をおいて再度お試しください。');
    } finally {
      setSubmitting(null);
    }
  }, [email, validateEmail, tab]);

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
        {/* ピル型タブ */}
        <View style={styles.tabsPillsWrapper}>
          <View style={styles.tabsPillsBg}>
            <Pressable onPress={() => setTab('login')} style={[styles.pill, tab === 'login' && styles.pillActive]}>
              <Text style={[styles.pillText, tab === 'login' && styles.pillTextActive]}>ログイン</Text>
            </Pressable>
            <Pressable onPress={() => setTab('signup')} style={[styles.pill, tab === 'signup' && styles.pillActive]}>
              <Text style={[styles.pillText, tab === 'signup' && styles.pillTextActive]}>新規登録</Text>
            </Pressable>
          </View>
        </View>

        <View style={{ marginTop: spacing.lg }}>
          {tab === 'login' ? (
            <Text style={{ color: colors.textSecondary, marginBottom: spacing.md }}>
              登録済みのメールアドレス宛にログイン用リンクを送ります。
            </Text>
          ) : null}
          <Text style={styles.label}>メールアドレス</Text>
          <TextInput testID="login-email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            placeholder="sample@example.com"
            // プレースホルダーはより薄い色に（ダークでも弱めに見える）
            placeholderTextColor={colors.textTertiary}
            onBlur={() => setEmailTouched(true)}
            style={[styles.input, (emailTouched || triedSubmit) && emailErr ? styles.inputError : null]}
          />
          {(emailTouched || triedSubmit) && emailErr ? <Text style={styles.hintError}>{emailErr}</Text> : null}

          <View style={{ height: spacing.md }} />

          {/* 新規登録もパスワードレス化のため、パスワードUIは非表示 */}

          {/* パスワードレス運用のため、リセットリンクは非表示 */}

          {/* パスワードレス運用では保持チェックは一旦非表示（必要なら復活可） */}

          {/* 同意チェックは画面下部へ移動（ここでは非表示） */}

          {/* ログイン: メールでログイン（Google風アウトライン） */}
          {tab === 'login' ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => { try { void sendMagicLink(); } catch { } }}
              disabled={loginDisabled}
              style={({ pressed }) => [
                styles.googleBtn,
                { marginTop: spacing.lg, opacity: pressed ? 0.92 : 1 }, loginDisabled ? styles.googleBtnDisabled : styles.googleBtnEnabled,
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="mail" size={18} color={loginMailColor} style={{ marginRight: 8 }} />
                <Text style={[styles.googleText, googleDisabled ? styles.googleTextDisabled : null]}>{submitting === 'magic' ? 'リンク送信中…' : 'メールでログイン'}</Text>
              </View>
            </Pressable>
          ) : null}

          {/* 成功メッセージ */}
          {infoMsg ? (
            <View style={styles.infoBanner}><Text style={styles.infoText}>{infoMsg}</Text></View>
          ) : null}

          {/* 開発用: Expo Go 向けバイパス（本番無効） */}
          {null}

          {/* 新規登録: メールで登録（Google風アウトライン） */}
          {tab === 'signup' ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => { try { void sendMagicLink(); } catch { } }}
              disabled={signupDisabled}
              style={({ pressed }) => [
                styles.googleBtn,
                { marginTop: spacing.md, opacity: pressed ? 0.92 : 1 }, signupDisabled ? styles.googleBtnDisabled : styles.googleBtnEnabled,
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="mail" size={18} color={signupMailColor} style={{ marginRight: 8 }} />
                <Text style={[styles.googleText, googleDisabled ? styles.googleTextDisabled : null]}>{submitting === 'magic' ? 'リンク送信中…' : 'メールで登録'}</Text>
              </View>
            </Pressable>
          ) : null}

          {anyOAuth ? (
            <View style={{ marginTop: spacing.xl }}>
              <View style={styles.dividerRow}>
                <View style={styles.divider} />
                <Text style={{ color: colors.textSecondary, paddingHorizontal: spacing.sm }}>または</Text>
                <View style={styles.divider} />
              </View>
              {/* Googleボタン（ログイン/新規登録の両方で表示） */}
              {oauthConfig.google ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => { try { void startOAuth('google'); } catch { } }}
                  disabled={googleDisabled}
                  style={({ pressed }) => [
                    styles.googleBtn,
                    { opacity: pressed ? 0.92 : 1 }, googleDisabled ? styles.googleBtnDisabled : styles.googleBtnEnabled,
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                    <Image
                      source={{ uri: 'https://www.gstatic.com/images/branding/googleg/1x/googleg_standard_color_48dp.png' }}
                      style={styles.googleIcon}
                      resizeMode="contain"
                    />
                    <Text style={[styles.googleText, googleDisabled ? styles.googleTextDisabled : null]}>{tab === 'signup' ? 'Googleで登録' : 'Googleでログイン'}</Text>
                  </View>
                </Pressable>
              ) : null}
              {/* 同意チェック（サインアップ時のみ、一番下） */}
              {tab === 'signup' ? (
                <View style={{ marginTop: spacing.xl }}>
                  <View style={[styles.keepRow, { alignItems: 'center', marginBottom: spacing.md }]}>
                    <TouchableOpacity
                      onPress={() => setAgreeTermsTos((v) => !v)}
                      style={[styles.checkbox, { borderColor: '#dadce0' }, agreeTermsTos && styles.checkboxChecked]}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: agreeTermsTos }}
                      accessibilityLabel="利用規約に同意"
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      {agreeTermsTos ? <Ionicons name="checkmark" size={14} color={colors.primary} /> : null}
                    </TouchableOpacity>
                    <Text style={styles.termsLineSmall}>
                      <Text style={styles.linkGoogle} onPress={() => setLegalModal({ visible: true, type: 'terms' })}>利用規約</Text>
                      <Text> に同意する</Text>
                    </Text>
                  </View>
                  <View style={[styles.keepRow, { alignItems: 'center' }]}>
                    <TouchableOpacity
                      onPress={() => setAgreeTermsPrivacy((v) => !v)}
                      style={[styles.checkbox, { borderColor: '#dadce0' }, agreeTermsPrivacy && styles.checkboxChecked]}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: agreeTermsPrivacy }}
                      accessibilityLabel="プライバシーポリシーに同意"
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      {agreeTermsPrivacy ? <Ionicons name="checkmark" size={14} color={colors.primary} /> : null}
                    </TouchableOpacity>
                    <Text style={styles.termsLineSmall}>
                      <Text style={styles.linkGoogle} onPress={() => setLegalModal({ visible: true, type: 'privacy' })}>プライバシーポリシー</Text>
                      <Text> に同意する</Text>
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>
          ) : (
            <View style={{ alignItems: 'center', marginTop: spacing.lg }}>
              <Text style={{ color: colors.textSecondary }}>OAuth設定が無効です</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Google: {oauthConfig.google ? '有効' : '無効'}</Text>
            </View>
          )}
        </View>
      </View>
      <Modal
        visible={legalModal.visible}
        onClose={() => setLegalModal((s) => ({ ...s, visible: false }))}
        title={legalModal.type === 'terms' ? '利用規約' : 'プライバシーポリシー'}
        maxWidth={560}
      >
        <LegalContent type={legalModal.type} />
      </Modal>
    </ScrollView>
  );
};

const createAuthStyles = (colors: any) => StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: colors.backgroundSecondary, alignItems: 'center', justifyContent: 'center', padding: spacing['2xl'] },
  card: { width: '100%', maxWidth: 520, backgroundColor: colors.backgroundSecondary, borderRadius: 20, padding: spacing['2xl'], borderWidth: 1, borderColor: colors.borderPrimary, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  brand: { fontSize: typography.fontSize['2xl'], fontWeight: '800', color: colors.textPrimary, textAlign: 'center', letterSpacing: 0.5 },
  // ピル型タブ
  tabsPillsWrapper: { marginTop: spacing.lg },
  tabsPillsBg: { flexDirection: 'row', backgroundColor: colors.backgroundSecondary, padding: 4, borderRadius: 999 },
  pill: { flex: 1, paddingVertical: spacing.md, borderRadius: 999, alignItems: 'center' },
  pillActive: { backgroundColor: colors.backgroundSecondary, borderWidth: 1, borderColor: colors.borderPrimary },
  pillText: { color: colors.textSecondary, fontWeight: '700' },
  pillTextActive: { color: colors.textPrimary },
  label: { color: colors.textSecondary, fontWeight: '700', marginBottom: 6, marginTop: spacing.lg },
  // 入力文字がダークでも読めるように text color を明示
  input: { borderWidth: 1, borderColor: colors.borderPrimary, borderRadius: 12, paddingHorizontal: spacing.lg, paddingVertical: 16, backgroundColor: colors.backgroundSecondary, color: colors.textPrimary },
  inputError: { borderColor: colors.error },
  hint: { color: colors.textSecondary, fontSize: 12, marginTop: 6 },
  hintError: { color: colors.error, fontSize: 12, marginTop: 6 },
  linksRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: spacing.sm },
  link: { color: colors.primary, fontWeight: '700' },
  linkGoogle: { color: '#1a73e8', fontWeight: '700' },
  keepRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: spacing.sm },
  termsRow: { alignItems: 'flex-start', marginTop: spacing.md },
  termsText: { color: colors.textSecondary, flex: 1 },
  termsLineText: { color: colors.textPrimary, fontSize: typography.fontSize.base },
  termsLineSmall: { color: colors.textPrimary, fontSize: typography.fontSize.sm },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1, borderColor: colors.borderPrimary, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.backgroundSecondary },
  checkboxInner: { width: 0, height: 0 },
  checkboxChecked: { borderColor: colors.primary },
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.backgroundSecondary, borderWidth: 1, borderColor: colors.borderPrimary, alignItems: 'center', justifyContent: 'center' },
  iconBtnDisabled: { opacity: 0.5, backgroundColor: colors.backgroundSecondary },
  ok: { color: '#1a7f37' },
  ng: { color: colors.textSecondary },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.lg },
  divider: { flex: 1, height: 1, backgroundColor: colors.borderPrimary },
  // Google button styled like outline spec
  googleBtn: {
    width: '100%',
    marginTop: spacing.md,
    backgroundColor: colors.backgroundSecondary,
    borderColor: '#dadce0',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
  },
  googleBtnEnabled: { borderColor: '#dadce0', backgroundColor: colors.backgroundSecondary },
  googleBtnDisabled: { borderColor: colors.gray300, backgroundColor: colors.gray100 },
  googleText: { color: colors.textPrimary, fontWeight: '700' },
  googleTextDisabled: { color: colors.gray500, fontWeight: '700' },
  googleIcon: { width: 18, height: 18, marginRight: 8 },
  infoBanner: { marginTop: spacing.sm, paddingVertical: 10, paddingHorizontal: spacing.md, backgroundColor: '#ECFDF5', borderRadius: 8, borderWidth: 1, borderColor: '#A7F3D0' },
  infoText: { color: '#065F46', fontSize: 12 },
});

export default AuthScreen;


















