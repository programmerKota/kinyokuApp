import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import Modal from '@shared/components/Modal';
import Button from '@shared/components/Button';
import { colors, spacing } from '@shared/theme';
import { supabase } from '@app/config/supabase.config';
import { signInWithEmailPassword, signUpWithEmailPassword, sendMagicLink, resetPassword } from '@core/services/supabase/authService';

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
  const resolverRef = useRef<(v: boolean) => void>();

  const close = useCallback((v: boolean) => {
    setVisible(false);
    resolverRef.current?.(v);
    resolverRef.current = undefined;
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
      setEmailHint('メールまたはパスワードが正しくありません');
    } finally {
      setAuthing(null);
    }
  }, [email, password, close]);

  const doSignup = useCallback(async () => {
    if (!email || !password) {
      setEmailHint('メールとパスワードを入力してください');
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
      setEmailHint('有効なメールアドレスを入力してください');
      return;
    }
    try {
      setAuthing('magic');
      setEmailHint('送信しました。メール内のリンクを開いてください。');
      await sendMagicLink(email.trim());
      const ok = await waitForSession();
      close(ok);
    } catch {
      setEmailHint('送信に失敗しました。時間を置いて再試行してください。');
    } finally {
      setAuthing(null);
    }
  }, [email, close]);

  const doResetPassword = useCallback(async () => {
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setEmailHint('有効なメールアドレスを入力してください');
      return;
    }
    try {
      setAuthing('reset');
      await resetPassword(email.trim());
      setEmailHint('リセット用リンクを送信しました');
    } catch {
      setEmailHint('リセットメールの送信に失敗しました');
    } finally {
      setAuthing(null);
    }
  }, [email]);

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
      <Modal visible={visible} onClose={() => close(false)} title="ログインが必要です">
        <Text style={{ color: colors.textSecondary, marginBottom: spacing.md }}>
          続行するにはログインしてください。
        </Text>
        <View style={{ gap: spacing.md }}>
          <TextInput
            placeholder="email@example.com"
            placeholderTextColor={colors.textSecondary}
            value={email}
            onChangeText={(t) => { setEmail(t); setEmailHint(null); }}
            style={{
              borderWidth: 1,
              borderColor: colors.borderPrimary,
              borderRadius: 8,
              paddingHorizontal: spacing.md,
              paddingVertical: 10,
              color: colors.textPrimary,
              backgroundColor: 'white',
            }}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            placeholder="パスワード"
            placeholderTextColor={colors.textSecondary}
            value={password}
            onChangeText={(t) => setPassword(t)}
            style={{
              borderWidth: 1,
              borderColor: colors.borderPrimary,
              borderRadius: 8,
              paddingHorizontal: spacing.md,
              paddingVertical: 10,
              color: colors.textPrimary,
              backgroundColor: 'white',
            }}
            secureTextEntry
          />
          {emailHint ? (
            <Text style={{ color: colors.textSecondary }}>{emailHint}</Text>
          ) : null}
          <View style={{ gap: spacing.sm }}>
            <Button title="ログイン" onPress={() => { void doLogin(); }} loading={authing === 'login'} />
            <Button title="アカウント作成" variant="secondary" onPress={() => { void doSignup(); }} loading={authing === 'signup'} />
            <Button title="Magic Link を送る" icon="mail" onPress={() => { void handleMagic(); }} loading={authing === 'magic'} />
            <Button title="パスワードをリセット" variant="secondary" onPress={() => { void doResetPassword(); }} loading={authing === 'reset'} />
          </View>
        </View>
      </Modal>
    </AuthPromptContext.Provider>
  );
};

export function useAuthPrompt(): Ctx {
  const ctx = useContext(AuthPromptContext);
  if (!ctx) throw new Error('useAuthPrompt must be used within AuthPromptProvider');
  return ctx;
}
