import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Modal from '@shared/components/Modal';
import DSButton from '@shared/designSystem/components/DSButton';
import { colors, spacing, typography } from '@shared/theme';
import { supabase } from '@app/config/supabase.config';
import { signInWithEmailPassword, signUpWithEmailPassword, sendMagicLink, resetPassword, initSupabaseAuthDeepLinks } from '@core/services/supabase/authService';

type Ctx = {
  requireAuth: () => Promise<boolean>;
};

const AuthPromptContext = createContext<Ctx | undefined>(undefined);

async function waitForSession(ms = 20000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < ms) {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.user?.id) return true;
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

export const AuthPromptProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [visible, setVisible] = useState(false);
  const [authing, setAuthing] = useState<null | 'login' | 'signup' | 'magic' | 'reset'>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailHint, setEmailHint] = useState<string | null>(null);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [emailFocus, setEmailFocus] = useState(false);
  const [passFocus, setPassFocus] = useState(false);
  React.useEffect(() => { void initSupabaseAuthDeepLinks(); }, []);
  const resolverRef = useRef<((v: boolean) => void) | null>(null);

  const close = useCallback((v: boolean) => {
    setVisible(false);
    resolverRef.current?.(v);
    resolverRef.current = null;
  }, []);

  const doLogin = useCallback(async () => {
    if (!email || !password) {
      setEmailHint('メールアドレスとパスワードを入力してください');
      return;
    }
    try {
      setAuthing('login');
      await signInWithEmailPassword(email.trim(), password);
      const ok = await waitForSession();
      close(ok);
    } catch {
      setEmailHint('メールアドレスまたはパスワードが正しくありません');
    } finally {
      setAuthing(null);
    }
  }, [email, password, close]);

  const doSignup = useCallback(async () => {
    if (!email || !password) {
      setEmailHint('メールアドレスとパスワードを入力してください');
      return;
    }
    try {
      setAuthing('signup');
      await signUpWithEmailPassword(email.trim(), password);
      const ok = await waitForSession();
      close(ok);
    } catch {
      setEmailHint('サインアップに失敗しました');
    } finally {
      setAuthing(null);
    }
  }, [email, password, close]);

  const handleMagic = useCallback(async () => {
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setEmailHint('正しいメールアドレスを入力してください');
      return;
    }
    try {
      setAuthing('magic');
      setEmailHint('メールを送信しました。受信トレイをご確認ください');
      await sendMagicLink(email.trim());
      const ok = await waitForSession();
      close(ok);
    } catch {
      setEmailHint('メールの送信に失敗しました。時間をおいてお試しください');
    } finally {
      setAuthing(null);
    }
  }, [email, close]);

  const doResetPassword = useCallback(async () => {
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setEmailHint('正しいメールアドレスを入力してください');
      return;
    }
    try {
      setAuthing('reset');
      await resetPassword(email.trim());
      setEmailHint('パスワード再設定メールを送信しました');
    } catch {
      setEmailHint('パスワード再設定メールの送信に失敗しました');
    } finally {
      setAuthing(null);
    }
  }, [email]);

  // OAuth providers (Google / Twitter(X) / Amazon / Facebook)
  const startOAuth = useCallback(async (provider: 'google' | 'twitter' | 'amazon' | 'line') => {
    try {
      setAuthing(provider as any);
      const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
      await supabase.auth.signInWithOAuth({ provider: provider as any, options: { redirectTo } });
    } finally {
      setAuthing(null);
    }
  }, []);

  const requireAuth = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.user?.id) return true;
    setVisible(true);
    return await new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const value = useMemo<Ctx>(() => ({ requireAuth }), [requireAuth]);

  return (
    <AuthPromptContext.Provider value={value}>
      {children}
      <Modal visible={visible} onClose={() => close(false)} hideHeader maxWidth={520}>
        <View style={{
          backgroundColor: colors.primary,
          borderRadius: 14,
          padding: spacing['2xl'],
          marginBottom: spacing['2xl'],
        }}>
          <Text style={{ color: 'white', fontWeight: '800', fontSize: typography.fontSize['2xl'] }}>ようこそ</Text>
          <Text style={{ color: 'rgba(255,255,255,0.85)', marginTop: 6 }}>アカウントにログインして機能を利用できます</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: spacing.lg }}>
            <DSButton
              title="ログイン"
              variant={mode === 'login' ? 'secondary' : 'ghost'}
              onPress={() => setMode('login')}
              textColor={mode === 'login' ? undefined : 'white'}
              style={mode === 'login' ? undefined : { borderColor: 'rgba(255,255,255,0.5)' }}
            />
            <DSButton
              title="新規登録"
              variant={mode === 'signup' ? 'secondary' : 'ghost'}
              onPress={() => setMode('signup')}
              textColor={mode === 'signup' ? undefined : 'white'}
              style={mode === 'signup' ? undefined : { borderColor: 'rgba(255,255,255,0.5)' }}
            />
          </View>
        </View>
        <View style={{ gap: spacing.md }}>
          <TextInput
            placeholder="email@example.com"
            placeholderTextColor={colors.textSecondary}
            value={email}
            onChangeText={(t) => { setEmail(t); setEmailHint(null); }}
            style={{
              borderWidth: 1,
              borderColor: emailFocus ? colors.primary : colors.borderPrimary,
              borderRadius: 12,
              paddingHorizontal: spacing['2xl'],
              paddingVertical: 14,
              color: colors.textPrimary,
              backgroundColor: '#EEF2FF',
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            onFocus={() => setEmailFocus(true)}
            onBlur={() => setEmailFocus(false)}
          />
          <TextInput
            placeholder="パスワード"
            placeholderTextColor={colors.textSecondary}
            value={password}
            onChangeText={(t) => setPassword(t)}
            style={{
              borderWidth: 1,
              borderColor: passFocus ? colors.primary : colors.borderPrimary,
              borderRadius: 12,
              paddingHorizontal: spacing['2xl'],
              paddingVertical: 14,
              color: colors.textPrimary,
              backgroundColor: '#EEF2FF',
            }}
            secureTextEntry
            onFocus={() => setPassFocus(true)}
            onBlur={() => setPassFocus(false)}
          />
          {emailHint ? (
            <Text style={{ color: colors.error }}>{emailHint}</Text>
          ) : null}

          {/* 送信は1回に制限 */}
          <DSButton
            title={
              mode === 'login'
                ? (authing === 'login' ? 'ログイン中…' : 'ログイン')
                : (authing === 'signup' ? '登録中…' : '新規登録')
            }
            onPress={() => { void (mode === 'login' ? doLogin() : doSignup()); }}
            loading={authing === (mode === 'login' ? 'login' : 'signup')}
            style={{ width: '100%' }}
          />

          {/* パスワードを忘れた方は下のメールをご利用ください */}
          <View style={{ alignItems: 'center', marginTop: spacing.sm }}>
            {mode === 'login' ? (
              <Text style={{ color: colors.textSecondary }}>
                アカウントが必要ですか？
                <Text
                  onPress={() => setMode('signup')}
                  style={{ color: colors.primary, fontWeight: '700' }}
                >
                  新規登録
                </Text>
              </Text>
            ) : (
              <Text style={{ color: colors.textSecondary }}>
                すでにアカウントをお持ちですか？
                <Text
                  onPress={() => setMode('login')}
                  style={{ color: colors.primary, fontWeight: '700' }}
                >
                  ログイン
                </Text>
              </Text>
            )}
          </View>

          <View style={{ alignItems: 'center', marginTop: spacing.sm, gap: 10 }}>
            <Text style={{ color: colors.textSecondary }}>または</Text>
            <Text style={{ color: colors.textSecondary, fontWeight: '600', marginTop: 2 }}>他のアカウントでログイン</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
              <Pressable
                onPress={() => { void startOAuth('twitter'); }}
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, width: 44, height: 44, borderRadius: 22, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.borderPrimary, alignItems: 'center', justifyContent: 'center' })}
              >
                <Ionicons name="logo-twitter" size={20} color={colors.textPrimary} />
              </Pressable>
              <Pressable
                onPress={() => { void startOAuth('google'); }}
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, width: 44, height: 44, borderRadius: 22, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.borderPrimary, alignItems: 'center', justifyContent: 'center' })}
              >
                <Ionicons name="logo-google" size={20} color={colors.textPrimary} />
              </Pressable>
              <Pressable
                onPress={() => { void startOAuth('amazon'); }}
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, width: 44, height: 44, borderRadius: 22, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.borderPrimary, alignItems: 'center', justifyContent: 'center' })}
              >
                <Ionicons name="logo-amazon" size={20} color={colors.textPrimary} />
              </Pressable>
              <Pressable
                accessibilityLabel="Sign in with LINE"
                onPress={() => { void startOAuth('line'); }}
                style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1, width: 44, height: 44, borderRadius: 22, backgroundColor: '#06C755', alignItems: 'center', justifyContent: 'center' })}
              >
                <Text style={{ color: 'white', fontWeight: '800', fontSize: 12 }}>LINE</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </AuthPromptContext.Provider >
  );
};

export function useAuthPrompt(): Ctx {
  const ctx = useContext(AuthPromptContext);
  if (!ctx) throw new Error('useAuthPrompt must be used within AuthPromptProvider');
  return ctx;
}

