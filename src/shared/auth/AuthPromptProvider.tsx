import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { View, Text, TextInput, Pressable, Platform } from "react-native";
import * as Linking from "expo-linking";
import { Ionicons } from "@expo/vector-icons";
import Modal from "@shared/components/Modal";
import { oauthConfig } from "@app/config/oauth.config";
import DSButton from "@shared/designSystem/components/DSButton";
import { colors, spacing, typography } from "@shared/theme";
import { screenThemes } from "@shared/theme/screenThemes";
import { supabase, supabaseConfig } from "@app/config/supabase.config";
import { featureFlags } from "@app/config/featureFlags.config";
import {
  signInWithEmailPassword,
  signUpWithEmailPassword,
  sendMagicLink,
  resetPassword,
  initSupabaseAuthDeepLinks,
  getRedirectTo,
  startOAuthFlow,
} from "@core/services/supabase/authService";

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

export const AuthPromptProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [visible, setVisible] = useState(false);
  const [authing, setAuthing] = useState<
    null | "login" | "signup" | "magic" | "reset"
  >(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailHint, setEmailHint] = useState<string | null>(null);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [emailFocus, setEmailFocus] = useState(false);
  const [passFocus, setPassFocus] = useState(false);
  React.useEffect(() => {
    void initSupabaseAuthDeepLinks();
  }, []);
  const resolverRef = useRef<((v: boolean) => void) | null>(null);

  // Auto-close when a session appears (e.g., after OAuth return)
  React.useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange(async (_evt, session) => {
      try {
        if (session?.user?.id) {
          setVisible(false);
          resolverRef.current?.(true);
          resolverRef.current = null;
        }
      } catch {}
    });
    return () => {
      try {
        data?.subscription?.unsubscribe();
      } catch {}
    };
  }, []);

  const close = useCallback((v: boolean) => {
    setVisible(false);
    resolverRef.current?.(v);
    resolverRef.current = null;
  }, []);

  const doLogin = useCallback(async () => {
    if (!email || !password) {
      setEmailHint("���[���A�h���X�ƃp�X���[�h����͂��Ă�������");
      return;
    }
    try {
      setAuthing("login");
      await signInWithEmailPassword(email.trim(), password);
      const ok = await waitForSession();
      close(ok);
    } catch {
      setEmailHint("���[���A�h���X�܂��̓p�X���[�h������������܂���");
    } finally {
      setAuthing(null);
    }
  }, [email, password, close]);

  const doSignup = useCallback(async () => {
    if (!email || !password) {
      setEmailHint("���[���A�h���X�ƃp�X���[�h����͂��Ă�������");
      return;
    }
    try {
      setAuthing("signup");
      await signUpWithEmailPassword(email.trim(), password);
      const ok = await waitForSession();
      close(ok);
    } catch {
      setEmailHint("�T�C���A�b�v�Ɏ��s���܂���");
    } finally {
      setAuthing(null);
    }
  }, [email, password, close]);

  const handleMagic = useCallback(async () => {
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setEmailHint("���������[���A�h���X����͂��Ă�������");
      return;
    }
    try {
      setAuthing("magic");
      setEmailHint("���[���𑗐M���܂����B��M�g���C�����m�F��������");
      await sendMagicLink(email.trim(), {
        shouldCreateUser: mode === "signup",
      });
      const ok = await waitForSession();
      close(ok);
    } catch {
      setEmailHint("���[���̑��M�Ɏ��s���܂����B���Ԃ������Ă�������������");
    } finally {
      setAuthing(null);
    }
  }, [email, close, mode]);

  const doResetPassword = useCallback(async () => {
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setEmailHint("���������[���A�h���X����͂��Ă�������");
      return;
    }
    try {
      setAuthing("reset");
      await resetPassword(email.trim());
      setEmailHint("�p�X���[�h�Đݒ胁�[���𑗐M���܂���");
    } catch {
      setEmailHint("�p�X���[�h�Đݒ胁�[���̑��M�Ɏ��s���܂���");
    } finally {
      setAuthing(null);
    }
  }, [email]);

  // OAuth providers (Google / Twitter(X) / Amazon / Facebook)
  const startOAuth = useCallback(
    async (provider: "google" | "twitter" | "amazon" | "line") => {
      try {
        setAuthing(provider as any);
        await startOAuthFlow(provider as any);
      } finally {
        setAuthing(null);
      }
    },
    [],
  );

  const requireAuth = useCallback(async () => {
    // E2E/Web test bypass: allow flows to continue without Supabase session
    try {
      if (featureFlags.authDisabled) return true;
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const bypass =
          params.get("e2e") === "1" ||
          localStorage.getItem("__e2e_auth_bypass") === "1";
        if (bypass) return true;
      }
    } catch {}
    const { data } = await supabase.auth.getSession();
    if (data?.session?.user?.id) return true;
    setVisible(true);
    return await new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const value = useMemo<Ctx>(() => ({ requireAuth }), [requireAuth]);

  const anyOAuth =
    oauthConfig.twitter ||
    oauthConfig.google ||
    oauthConfig.amazon ||
    oauthConfig.line;

  return (
    <AuthPromptContext.Provider value={value}>
      {children}
      <Modal
        visible={visible}
        onClose={() => close(false)}
        hideHeader
        maxWidth={520}
      >
        <View
          style={{
            backgroundColor: colors.primary,
            borderRadius: 14,
            padding: spacing["2xl"],
            marginBottom: spacing["2xl"],
          }}
        >
          <Text
            style={{
              color: "white",
              fontWeight: "800",
              fontSize: typography.fontSize["2xl"],
            }}
          >
            �悤����
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.85)", marginTop: 6 }}>
            �A�J�E���g�Ƀ��O�C�����ċ@�\�𗘗p�ł��܂�
          </Text>
          <View style={{ flexDirection: "row", gap: 8, marginTop: spacing.lg }}>
            <DSButton
              title="���O�C��"
              variant={mode === "login" ? "secondary" : "ghost"}
              onPress={() => setMode("login")}
              textColor={mode === "login" ? undefined : "white"}
              style={
                mode === "login"
                  ? undefined
                  : { borderColor: "rgba(255,255,255,0.5)" }
              }
            />
            <DSButton
              title="�V�K�o�^"
              variant={mode === "signup" ? "secondary" : "ghost"}
              onPress={() => setMode("signup")}
              textColor={mode === "signup" ? undefined : "white"}
              style={
                mode === "signup"
                  ? undefined
                  : { borderColor: "rgba(255,255,255,0.5)" }
              }
            />
          </View>
        </View>
        <View style={{ gap: spacing.md }}>
          <TextInput
            placeholder="email@example.com"
            placeholderTextColor={colors.textSecondary}
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              setEmailHint(null);
            }}
            style={{
              borderWidth: 1,
              borderColor: emailFocus ? colors.primary : colors.borderPrimary,
              borderRadius: 12,
              paddingHorizontal: spacing["2xl"],
              paddingVertical: 14,
              color: colors.textPrimary,
              backgroundColor: screenThemes.auth.tintSoft,
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            onFocus={() => setEmailFocus(true)}
            onBlur={() => setEmailFocus(false)}
          />
          <TextInput
            placeholder="�p�X���[�h"
            placeholderTextColor={colors.textSecondary}
            value={password}
            onChangeText={(t) => setPassword(t)}
            style={{
              borderWidth: 1,
              borderColor: passFocus ? colors.primary : colors.borderPrimary,
              borderRadius: 12,
              paddingHorizontal: spacing["2xl"],
              paddingVertical: 14,
              color: colors.textPrimary,
              backgroundColor: screenThemes.auth.tintSoft,
            }}
            secureTextEntry
            onFocus={() => setPassFocus(true)}
            onBlur={() => setPassFocus(false)}
          />
          {emailHint ? (
            <Text style={{ color: colors.error }}>{emailHint}</Text>
          ) : null}

          {/* ���M��1��ɐ��� */}
          <DSButton
            title={
              mode === "login"
                ? authing === "login"
                  ? "���O�C�����c"
                  : "���O�C��"
                : authing === "signup"
                  ? "�o�^���c"
                  : "�V�K�o�^"
            }
            onPress={() => {
              void (mode === "login" ? doLogin() : doSignup());
            }}
            loading={authing === (mode === "login" ? "login" : "signup")}
            style={{ width: "100%" }}
          />

          {/* �p�X���[�h��Y�ꂽ���͉��̃��[���������p�������� */}
          <View style={{ alignItems: "center", marginTop: spacing.sm }}>
            {mode === "login" ? (
              <Text style={{ color: colors.textSecondary }}>
                �A�J�E���g���K�v�ł����H
                <Text
                  onPress={() => setMode("signup")}
                  style={{ color: colors.primary, fontWeight: "700" }}
                >
                  �V�K�o�^
                </Text>
              </Text>
            ) : (
              <Text style={{ color: colors.textSecondary }}>
                ���łɃA�J�E���g���������ł����H
                <Text
                  onPress={() => setMode("login")}
                  style={{ color: colors.primary, fontWeight: "700" }}
                >
                  ���O�C��
                </Text>
              </Text>
            )}
          </View>

          {anyOAuth ? (
            <View
              style={{ alignItems: "center", marginTop: spacing.sm, gap: 10 }}
            >
              <Text style={{ color: colors.textSecondary }}>�܂���</Text>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontWeight: "600",
                  marginTop: 2,
                }}
              >
                ���̃A�J�E���g�Ń��O�C��
              </Text>
              <View style={{ flexDirection: "row", gap: 12, marginTop: 6 }}>
                {oauthConfig.twitter && (
                  <Pressable
                    onPress={() => {
                      void startOAuth("twitter");
                    }}
                    style={({ pressed }) => ({
                      opacity: pressed ? 0.7 : 1,
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: colors.backgroundSecondary,
                      borderWidth: 1,
                      borderColor: colors.borderPrimary,
                      alignItems: "center",
                      justifyContent: "center",
                    })}
                  >
                    <Ionicons
                      name="logo-twitter"
                      size={20}
                      color={colors.textPrimary}
                    />
                  </Pressable>
                )}
                {oauthConfig.google && (
                  <Pressable
                    onPress={() => {
                      void startOAuth("google");
                    }}
                    style={({ pressed }) => ({
                      opacity: pressed ? 0.7 : 1,
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: colors.backgroundSecondary,
                      borderWidth: 1,
                      borderColor: colors.borderPrimary,
                      alignItems: "center",
                      justifyContent: "center",
                    })}
                  >
                    <Ionicons
                      name="logo-google"
                      size={20}
                      color={colors.textPrimary}
                    />
                  </Pressable>
                )}
                {oauthConfig.amazon && (
                  <Pressable
                    onPress={() => {
                      void startOAuth("amazon");
                    }}
                    style={({ pressed }) => ({
                      opacity: pressed ? 0.7 : 1,
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: colors.backgroundSecondary,
                      borderWidth: 1,
                      borderColor: colors.borderPrimary,
                      alignItems: "center",
                      justifyContent: "center",
                    })}
                  >
                    <Ionicons
                      name="logo-amazon"
                      size={20}
                      color={colors.textPrimary}
                    />
                  </Pressable>
                )}
                {oauthConfig.line && (
                  <Pressable
                    accessibilityLabel="Sign in with LINE"
                    onPress={() => {
                      void startOAuth("line");
                    }}
                    style={({ pressed }) => ({
                      opacity: pressed ? 0.9 : 1,
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: "#06C755",
                      alignItems: "center",
                      justifyContent: "center",
                    })}
                  >
                    <Text
                      style={{
                        color: "white",
                        fontWeight: "800",
                        fontSize: 12,
                      }}
                    >
                      LINE
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          ) : null}
        </View>
      </Modal>
    </AuthPromptContext.Provider>
  );
};

export function useAuthPrompt(): Ctx {
  const ctx = useContext(AuthPromptContext);
  if (!ctx)
    throw new Error("useAuthPrompt must be used within AuthPromptProvider");
  return ctx;
}
