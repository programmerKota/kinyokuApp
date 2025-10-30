import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Pressable,
  Platform,
  Image,
  KeyboardAvoidingView,
  Keyboard,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
  type EdgeInsets,
} from "react-native-safe-area-context";

import { oauthConfig } from "@app/config/oauth.config";
import { supabase } from "@app/config/supabase.config";
import {
  signInWithEmailPassword,
  signUpWithEmailPassword,
  resetPassword,
  getRedirectTo,
  startOAuthFlow,
  updatePassword,
} from "@core/services/supabase/authService";
import LegalContent from "@features/legal/components/LegalContent";
import Modal from "@shared/components/Modal";
import DSButton from "@shared/designSystem/components/DSButton";
import { spacing, typography, useAppTheme } from "@shared/theme";
import { colorSchemes, type ColorPalette } from "@shared/theme/colors";
import { createScreenThemes } from "@shared/theme/screenThemes";

const KNOWN_USER_KEY = "auth_known_user_v1";
const LAST_MAGIC_EMAIL_KEY = "auth_last_magic_email_v1";
const TERMS_URL = "https://example.com/terms";
const PRIVACY_URL = "https://example.com/privacy";

const AuthScreen: React.FC = () => {
  const { mode } = useAppTheme();
  const insets = useSafeAreaInsets();
  const colors = useMemo(() => colorSchemes[mode], [mode]);
  const screenThemes = useMemo(() => createScreenThemes(colors), [colors]);
  const styles = useMemo(
    () => createAuthStyles(colors, insets),
    [colors, insets],
  );
  const keyboardVerticalOffset =
    (Platform.OS === "ios" ? spacing.lg : 0) + insets.top;
  const keyboardBehavior = Platform.OS === "ios" ? "padding" : "height";
  const scrollBottomInset =
    (Platform.OS === "ios" ? insets.bottom : 0) + spacing.lg;

  const [tab, setTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [agreeTermsTos, setAgreeTermsTos] = useState(false);
  const [agreeTermsPrivacy, setAgreeTermsPrivacy] = useState(false);
  const [emailErr, setEmailErr] = useState<string | null>(null);
  const [passErr, setPassErr] = useState<string | null>(null);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passTouched, setPassTouched] = useState(false);
  const [triedSubmit, setTriedSubmit] = useState(false);
  const [submitting, setSubmitting] = useState<
    null | "login" | "signup" | "reset" | "oauth" | "magic"
  >(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [legalModal, setLegalModal] = useState<{
    visible: boolean;
    type: "terms" | "privacy";
  }>({ visible: false, type: "terms" });
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  // 開発用バイパスは無効化（状態は廃止）
  // const [devBypass, setDevBypass] = useState(false);
  // Password recovery flow (Supabase PASSWORD_RECOVERY event)
  const [showResetModal, setShowResetModal] = useState(false);
  const [newPass1, setNewPass1] = useState("");
  const [newPass2, setNewPass2] = useState("");
  const [resetSubmitting, setResetSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const v = await AsyncStorage.getItem(KNOWN_USER_KEY);
        setTab(v === "1" ? "login" : "signup");
      } catch {}
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
    (async () => {
      /* no-op */
    })();
  }, []);

  // Deep link handling is centralized in initSupabaseAuthDeepLinks() (see App.tsx)
  // Also detect Supabase PASSWORD_RECOVERY event and prompt user for new password
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((evt) => {
      try {
        if (evt === "PASSWORD_RECOVERY") {
          setShowResetModal(true);
        }
      } catch {}
    });
    return () => {
      try {
        data?.subscription?.unsubscribe();
      } catch {}
    };
  }, []);

  // If deep link handler marked recovery intent, show modal even if event differs
  useEffect(() => {
    (async () => {
      try {
        const v = await AsyncStorage.getItem("__auth_pending_recovery");
        if (v === "1") {
          setShowResetModal(true);
          await AsyncStorage.removeItem("__auth_pending_recovery");
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, () => {
      setKeyboardVisible(true);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardVisible(false);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const validateEmail = useCallback((v: string) => {
    if (!v.trim()) return "メールアドレスを入力してください。";
    const re = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    if (!re.test(v.trim()))
      return "正しい形式のメールアドレスを入力してください。";
    return null;
  }, []);

  const validatePass = useCallback((v: string) => {
    const s = v ?? "";
    if (!s) return "パスワードを入力してください。";
    if (s.length < 8) return "パスワードは8文字以上で入力してください。";
    if (/\s/.test(s)) return "パスワードに空白は使用できません。";
    return null;
  }, []);

  const emailValidationError = useMemo(
    () => validateEmail(email),
    [email, validateEmail],
  );
  const passwordValidationError = useMemo(
    () => validatePass(password),
    [password, validatePass],
  );

  useEffect(() => {
    setEmailErr(emailValidationError);
  }, [emailValidationError]);
  useEffect(() => {
    setPassErr(passwordValidationError);
  }, [passwordValidationError]);

  const canSubmit = useMemo(() => {
    // メール + パスワードでのログイン/登録を有効化
    if (tab === "signup") {
      return (
        !emailErr &&
        !passErr &&
        !!email &&
        !!password &&
        agreeTermsTos &&
        agreeTermsPrivacy
      );
    }
    // login
    return !emailErr && !passErr && !!email && !!password;
  }, [
    emailErr,
    passErr,
    email,
    password,
    tab,
    agreeTermsTos,
    agreeTermsPrivacy,
  ]);

  const submit = useCallback(async () => {
    if (!canSubmit) {
      setTriedSubmit(true);
      setEmailTouched(true);
      setPassTouched(true);
      return;
    }
    try {
      setSubmitting(tab);
      setErrorMsg(null);
      setInfoMsg(null);
      if (tab === "login") {
        try {
          await signInWithEmailPassword(email.trim(), password);
          setInfoMsg("ログインしました");
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : "ログインに失敗しました";
          if (/invalid login credentials/i.test(msg)) {
            setErrorMsg("メールアドレスまたはパスワードが正しくありません");
          } else if (/email not confirmed|confirm your email/i.test(msg)) {
            setErrorMsg(
              "メールアドレスの確認が完了していません。メールをご確認ください",
            );
          } else {
            setErrorMsg(
              "ログインに失敗しました。時間をおいて再度お試しください",
            );
          }
          return;
        }
      } else {
        try {
          const data = await signUpWithEmailPassword(email.trim(), password);
          if (data?.session?.user) {
            setInfoMsg("登録が完了しました");
            try {
              await AsyncStorage.setItem("__post_signup_profile", "1");
            } catch {}
          } else {
            setInfoMsg(
              "確認メールを送信しました。メール内の手順を完了してください",
            );
            try {
              await AsyncStorage.setItem("__post_signup_profile", "1");
            } catch {}
          }
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : "登録に失敗しました";
          if (/user already registered/i.test(msg)) {
            setErrorMsg(
              "このメールはすでに登録済みです。ログインをお試しください",
            );
          } else {
            setErrorMsg("登録に失敗しました。時間をおいて再度お試しください");
          }
          return;
        }
      }
      await AsyncStorage.setItem(KNOWN_USER_KEY, "1");
    } finally {
      setSubmitting(null);
    }
  }, [tab, canSubmit, email, password]);
  // Visual state for buttons and icon colors
  const loginDisabled =
    !!submitting || !(!emailErr && !passErr && !!email && !!password);
  const signupDisabled = !!submitting || !canSubmit;
  const googleDisabled =
    submitting === "oauth" ||
    (tab === "signup" && !(agreeTermsTos && agreeTermsPrivacy));
  const appleDisabled =
    submitting === "oauth" ||
    (tab === "signup" && !(agreeTermsTos && agreeTermsPrivacy));
  // Magic link buttons have their own enable criteria (email-only; signup also requires terms)
  const magicLoginDisabled = !!submitting || !!emailValidationError;
  const magicSignupDisabled =
    !!submitting ||
    !!emailValidationError ||
    !(agreeTermsTos && agreeTermsPrivacy);
  const loginMailColor = magicLoginDisabled
    ? colors.gray500
    : screenThemes.auth.accent;
  const signupMailColor = magicSignupDisabled
    ? colors.gray500
    : screenThemes.auth.accent;
  // Googleアイコンは無効時のみグレーに（有効時はフルカラー維持）
  const googleIconTint = googleDisabled ? colors.gray500 : undefined;
  const appleIconColor = appleDisabled ? colors.gray500 : colors.textPrimary;

  // サインアップ時は同意未チェックでも押下できるようにする（押下時にエラー表示）
  const buttonDisabled = useMemo(() => {
    if (submitting) return true;
    const baseValid = !emailErr && !passErr && !!email && !!password;
    return !baseValid;
  }, [submitting, emailErr, passErr, email, password]);

  const startOAuth = useCallback(
    async (provider: "google" | "twitter" | "amazon" | "line" | "apple") => {
      try {
        setSubmitting("oauth");
        await startOAuthFlow(provider);
      } finally {
        setSubmitting(null);
      }
    },
    [],
  );

  const doReset = useCallback(async () => {
    const err = validateEmail(email);
    if (err) {
      setEmailErr(err);
      setEmailTouched(true);
      return;
    }
    try {
      setSubmitting("reset");
      setErrorMsg(null);
      setInfoMsg(null);
      await resetPassword(email.trim());
      setInfoMsg(
        "パスワード再設定メールを送信しました。メールをご確認ください。",
      );
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : "パスワード再設定に失敗しました";
      if (/email rate limit|too many requests/i.test(msg)) {
        setErrorMsg("しばらくしてから再度お試しください。");
      } else if (/user not found|no user/i.test(msg)) {
        setErrorMsg("このメールアドレスは登録がありません。");
      } else {
        setErrorMsg(
          "パスワード再設定に失敗しました。時間をおいて再度お試しください。",
        );
      }
    } finally {
      setSubmitting(null);
    }
  }, [email, validateEmail]);

  const validateNewPass = (v: string) => {
    if (!v || v.length < 8) return "パスワードは8文字以上で入力してください。";
    if (/\s/.test(v)) return "パスワードに空白は使用できません。";
    return null;
  };

  const handleConfirmNewPassword = useCallback(async () => {
    const e1 = validateNewPass(newPass1);
    if (e1) {
      setErrorMsg(e1);
      return;
    }
    if (newPass1 !== newPass2) {
      setErrorMsg("パスワードが一致しません");
      return;
    }
    try {
      setResetSubmitting(true);
      setErrorMsg(null);
      setInfoMsg(null);
      await updatePassword(newPass1);
      setInfoMsg("パスワードを更新しました。ログイン状態が有効になりました。");
      setShowResetModal(false);
      setNewPass1("");
      setNewPass2("");
    } catch {
      setErrorMsg(
        "パスワードの更新に失敗しました。時間をおいて再度お試しください。",
      );
    } finally {
      setResetSubmitting(false);
    }
  }, [newPass1, newPass2]);

  const sendMagicLink = useCallback(async () => {
    const err = validateEmail(email);
    if (err) {
      setEmailErr(err);
      setEmailTouched(true);
      return;
    }
    try {
      setSubmitting("magic");
      const emailTrimmed = email.trim();
      try {
        await AsyncStorage.setItem(LAST_MAGIC_EMAIL_KEY, emailTrimmed);
      } catch {}
      const redirectToWithEmail = `${getRedirectTo()}?email=${encodeURIComponent(emailTrimmed)}`;
      if (tab === "signup") {
        const { error } = await supabase.auth.signInWithOtp({
          email: emailTrimmed,
          options: {
            emailRedirectTo: redirectToWithEmail,
            shouldCreateUser: true,
          },
        });
        if (error) {
          setEmailErr(
            "メールの送信に失敗しました。時間をおいて再度お試しください。",
          );
          return;
        }
        setInfoMsg("登録用のリンクをメールに送信しました");
        try {
          await AsyncStorage.setItem("__post_signup_profile", "1");
        } catch {}
      } else {
        const { error } = await supabase.auth.signInWithOtp({
          email: emailTrimmed,
          options: {
            emailRedirectTo: redirectToWithEmail,
            shouldCreateUser: false,
          },
        });
        if (error) {
          setEmailErr(
            "このメールアドレスは登録がありません。新規登録をご利用ください。",
          );
          setEmailTouched(true);
          return;
        }
        setInfoMsg("ログイン用のリンクをメールに送信しました");
      }
    } catch (e) {
      setEmailErr(
        "メールの送信に失敗しました。時間をおいて再度お試しください。",
      );
    } finally {
      setSubmitting(null);
    }
  }, [email, validateEmail, tab]);

  const anyOAuth =
    oauthConfig.twitter ||
    oauthConfig.google ||
    oauthConfig.amazon ||
    oauthConfig.apple ||
    oauthConfig.line;

  // debug logs removed per request

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.backgroundSecondary }}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={keyboardBehavior}
        keyboardVerticalOffset={keyboardVerticalOffset}
      >
        <ScrollView
          contentContainerStyle={[
            styles.container,
            keyboardVisible && styles.containerKeyboard,
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === "ios" ? "interactive" : "on-drag"
          }
          automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
          contentInsetAdjustmentBehavior="always"
          contentInset={
            Platform.OS === "ios" ? { bottom: scrollBottomInset } : undefined
          }
          scrollIndicatorInsets={{ bottom: scrollBottomInset }}
        >
          <View style={styles.card}>
            <Text style={styles.brand}>abstinence</Text>
            {/* ピル型タブ */}
            <View style={styles.tabsPillsWrapper}>
              <View style={styles.tabsPillsBg}>
                <Pressable
                  onPress={() => setTab("login")}
                  style={[styles.pill, tab === "login" && styles.pillActive]}
                >
                  <Text
                    style={[
                      styles.pillText,
                      tab === "login" && styles.pillTextActive,
                    ]}
                  >
                    ログイン
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setTab("signup")}
                  style={[styles.pill, tab === "signup" && styles.pillActive]}
                >
                  <Text
                    style={[
                      styles.pillText,
                      tab === "signup" && styles.pillTextActive,
                    ]}
                  >
                    新規登録
                  </Text>
                </Pressable>
              </View>
            </View>

            <View style={{ marginTop: spacing.lg }}>
              {tab === "login" ? (
                <Text
                  style={{
                    color: colors.textSecondary,
                    marginBottom: spacing.md,
                  }}
                >
                  メールとパスワードでログインできます（メールリンクでも可）。
                </Text>
              ) : null}
              <Text style={styles.label}>メールアドレス</Text>
              <TextInput
                testID="login-email"
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
                style={[
                  styles.input,
                  (emailTouched || triedSubmit) && emailErr
                    ? styles.inputError
                    : null,
                ]}
              />
              {(emailTouched || triedSubmit) && emailErr ? (
                <Text style={styles.hintError}>{emailErr}</Text>
              ) : null}

              <View style={{ height: spacing.md }} />

              {/* パスワード入力 */}
              <Text style={styles.label}>パスワード</Text>
              <View style={{ position: "relative" }}>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="password"
                  secureTextEntry={!showPass}
                  placeholder="8文字以上（英数字）"
                  placeholderTextColor={colors.textTertiary}
                  onBlur={() => setPassTouched(true)}
                  style={[
                    styles.input,
                    (passTouched || triedSubmit) && passErr
                      ? styles.inputError
                      : null,
                  ]}
                />
                <Pressable
                  onPress={() => setShowPass((v) => !v)}
                  accessibilityRole="button"
                  accessibilityLabel={
                    showPass ? "パスワードを非表示" : "パスワードを表示"
                  }
                  style={{
                    position: "absolute",
                    right: 12,
                    top: 14,
                    padding: 4,
                  }}
                >
                  <Ionicons
                    name={showPass ? "eye-off" : "eye"}
                    size={18}
                    color={colors.textSecondary}
                  />
                </Pressable>
              </View>
              {(passTouched || triedSubmit) && passErr ? (
                <Text style={styles.hintError}>{passErr}</Text>
              ) : null}

              {/* パスワードリセットリンク */}
              <View style={styles.linksRow}>
                <Pressable
                  onPress={() => {
                    try {
                      void doReset();
                    } catch {}
                  }}
                >
                  <Text style={styles.link}>パスワードをお忘れですか？</Text>
                </Pressable>
              </View>

              {/* 同意チェック（サインアップ時のみ、常に表示） */}
              {tab === "signup" ? (
                <View style={{ marginTop: spacing.md }}>
                  <View
                    style={[
                      styles.keepRow,
                      { alignItems: "center", marginBottom: spacing.md },
                    ]}
                  >
                    <TouchableOpacity
                      onPress={() => setAgreeTermsTos((v) => !v)}
                      style={[
                        styles.checkbox,
                        { borderColor: "#dadce0" },
                        agreeTermsTos && styles.checkboxChecked,
                      ]}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: agreeTermsTos }}
                      accessibilityLabel="利用規約に同意"
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      {agreeTermsTos ? (
                        <Ionicons
                          name="checkmark"
                          size={14}
                          color={colors.primary}
                        />
                      ) : null}
                    </TouchableOpacity>
                    <Text style={styles.termsLineSmall}>
                      <Text
                        style={styles.linkGoogle}
                        onPress={() =>
                          setLegalModal({ visible: true, type: "terms" })
                        }
                      >
                        利用規約
                      </Text>
                      <Text> に同意する</Text>
                    </Text>
                  </View>
                  {triedSubmit && !agreeTermsTos ? (
                    <Text style={styles.hintError}>
                      利用規約に同意してください。
                    </Text>
                  ) : null}
                  <View style={[styles.keepRow, { alignItems: "center" }]}>
                    <TouchableOpacity
                      onPress={() => setAgreeTermsPrivacy((v) => !v)}
                      style={[
                        styles.checkbox,
                        { borderColor: "#dadce0" },
                        agreeTermsPrivacy && styles.checkboxChecked,
                      ]}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: agreeTermsPrivacy }}
                      accessibilityLabel="プライバシーポリシーに同意"
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      {agreeTermsPrivacy ? (
                        <Ionicons
                          name="checkmark"
                          size={14}
                          color={colors.primary}
                        />
                      ) : null}
                    </TouchableOpacity>
                    <Text style={styles.termsLineSmall}>
                      <Text
                        style={styles.linkGoogle}
                        onPress={() =>
                          setLegalModal({ visible: true, type: "privacy" })
                        }
                      >
                        プライバシーポリシー
                      </Text>
                      <Text> に同意する</Text>
                    </Text>
                  </View>
                  {triedSubmit && !agreeTermsPrivacy ? (
                    <Text style={styles.hintError}>
                      プライバシーポリシーに同意してください。
                    </Text>
                  ) : null}
                </View>
              ) : null}

              {/* 送信ボタン（メール+パスワード） */}
              <DSButton
                title={
                  tab === "login"
                    ? submitting === "login"
                      ? "ログイン中…"
                      : "ログイン"
                    : submitting === "signup"
                      ? "登録中…"
                      : "新規登録"
                }
                onPress={() => {
                  try {
                    void submit();
                  } catch {}
                }}
                loading={submitting === tab}
                disabled={buttonDisabled}
                style={{ width: "100%", marginTop: spacing.lg }}
              />

              {/* 代替（メールリンク）は「または」セクションに移動 */}

              {/* メッセージ表示 */}
              {errorMsg ? (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>{errorMsg}</Text>
                </View>
              ) : null}
              {infoMsg ? (
                <View style={styles.infoBanner}>
                  <Text style={styles.infoText}>{infoMsg}</Text>
                </View>
              ) : null}

              {/* 開発用: Expo Go 向けバイパス（本番無効） */}
              {null}

              {/* 代替（メールリンク）は「または」セクションに移動 */}

              {anyOAuth ? (
                <View style={{ marginTop: spacing.xl }}>
                  <View style={styles.dividerRow}>
                    <View style={styles.divider} />
                    <Text
                      style={{
                        color: colors.textSecondary,
                        paddingHorizontal: spacing.sm,
                      }}
                    >
                      または
                    </Text>
                    <View style={styles.divider} />
                  </View>
                  {/* Googleボタン（ログイン/新規登録の両方で表示） */}
                  {oauthConfig.google ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        try {
                          void startOAuth("google");
                        } catch {}
                      }}
                      disabled={googleDisabled}
                      style={({ pressed }) => [
                        styles.googleBtn,
                        { opacity: pressed ? 0.92 : 1 },
                        googleDisabled
                          ? styles.googleBtnDisabled
                          : styles.googleBtnEnabled,
                      ]}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Image
                          source={{
                            uri: "https://www.gstatic.com/images/branding/googleg/1x/googleg_standard_color_48dp.png",
                          }}
                          style={[
                            styles.googleIcon,
                            googleIconTint
                              ? { tintColor: googleIconTint }
                              : null,
                          ]}
                          resizeMode="contain"
                        />
                        <Text
                          style={[
                            styles.googleText,
                            googleDisabled ? styles.googleTextDisabled : null,
                          ]}
                        >
                          {tab === "signup"
                            ? "Googleで登録"
                            : "Googleでログイン"}
                        </Text>
                      </View>
                    </Pressable>
                  ) : null}
                  {oauthConfig.apple ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        try {
                          void startOAuth("apple");
                        } catch {}
                      }}
                      disabled={appleDisabled}
                      style={({ pressed }) => [
                        styles.googleBtn,
                        {
                          marginTop: oauthConfig.google ? spacing.md : 0,
                          opacity: pressed ? 0.92 : 1,
                        },
                        appleDisabled
                          ? styles.googleBtnDisabled
                          : styles.googleBtnEnabled,
                      ]}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Ionicons
                          name="logo-apple"
                          size={18}
                          color={appleIconColor}
                          style={{ marginRight: 8 }}
                        />
                        <Text
                          style={[
                            styles.googleText,
                            appleDisabled ? styles.googleTextDisabled : null,
                          ]}
                        >
                          {tab === "signup" ? "Appleで登録" : "Appleでログイン"}
                        </Text>
                      </View>
                    </Pressable>
                  ) : null}
                  {/* メールリンク（ログイン/登録）を同セクションに配置 */}
                  {tab === "login" ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        try {
                          void sendMagicLink();
                        } catch {}
                      }}
                      disabled={magicLoginDisabled}
                      style={({ pressed }) => [
                        styles.googleBtn,
                        { marginTop: spacing.md, opacity: pressed ? 0.92 : 1 },
                        magicLoginDisabled
                          ? styles.googleBtnDisabled
                          : styles.googleBtnEnabled,
                      ]}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Ionicons
                          name="mail"
                          size={18}
                          color={loginMailColor}
                          style={{ marginRight: 8 }}
                        />
                        <Text
                          style={[
                            styles.googleText,
                            magicLoginDisabled
                              ? styles.googleTextDisabled
                              : null,
                          ]}
                        >
                          {submitting === "magic"
                            ? "リンク送信中…"
                            : "メールリンクでログイン"}
                        </Text>
                      </View>
                    </Pressable>
                  ) : (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        try {
                          void sendMagicLink();
                        } catch {}
                      }}
                      disabled={magicSignupDisabled}
                      style={({ pressed }) => [
                        styles.googleBtn,
                        { marginTop: spacing.md, opacity: pressed ? 0.92 : 1 },
                        magicSignupDisabled
                          ? styles.googleBtnDisabled
                          : styles.googleBtnEnabled,
                      ]}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Ionicons
                          name="mail"
                          size={18}
                          color={signupMailColor}
                          style={{ marginRight: 8 }}
                        />
                        <Text
                          style={[
                            styles.googleText,
                            magicSignupDisabled
                              ? styles.googleTextDisabled
                              : null,
                          ]}
                        >
                          {submitting === "magic"
                            ? "リンク送信中…"
                            : "メールリンクで登録"}
                        </Text>
                      </View>
                    </Pressable>
                  )}
                  {/* 同意チェックは上部で常時表示（サインアップ時のみ） */}
                </View>
              ) : (
                <View style={{ alignItems: "center", marginTop: spacing.lg }}>
                  <Text style={{ color: colors.textSecondary }}>
                    OAuth設定が無効です
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                    Google: {oauthConfig.google ? "有効" : "無効"}
                  </Text>
                </View>
              )}
            </View>
          </View>
          <Modal
            visible={legalModal.visible}
            onClose={() => setLegalModal((s) => ({ ...s, visible: false }))}
            title={
              legalModal.type === "terms" ? "利用規約" : "プライバシーポリシー"
            }
            maxWidth={560}
          >
            <LegalContent type={legalModal.type} />
          </Modal>

          {/* Password recovery modal */}
          <Modal
            visible={showResetModal}
            onClose={() => {
              setShowResetModal(false);
              setErrorMsg(null);
              setInfoMsg(null);
            }}
            title="パスワード再設定"
            maxWidth={520}
          >
            <View style={{ gap: spacing.md }}>
              <Text style={{ color: colors.textSecondary }}>
                新しいパスワードを入力してください。
              </Text>
              <TextInput
                placeholder="新しいパスワード"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry
                value={newPass1}
                onChangeText={setNewPass1}
                style={[styles.input]}
              />
              <TextInput
                placeholder="新しいパスワード（確認）"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry
                value={newPass2}
                onChangeText={setNewPass2}
                style={[styles.input]}
              />
              {errorMsg ? (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>{errorMsg}</Text>
                </View>
              ) : null}
              {infoMsg ? (
                <View style={styles.infoBanner}>
                  <Text style={styles.infoText}>{infoMsg}</Text>
                </View>
              ) : null}
              <DSButton
                title={resetSubmitting ? "更新中…" : "パスワードを更新"}
                onPress={() => {
                  try {
                    void handleConfirmNewPassword();
                  } catch {}
                }}
                loading={resetSubmitting}
              />
            </View>
          </Modal>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const createAuthStyles = (colors: ColorPalette, insets: EdgeInsets) =>
  StyleSheet.create({
    container: {
      flexGrow: 1,
      backgroundColor: colors.backgroundSecondary,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing["2xl"],
      paddingTop: spacing["2xl"] + insets.top,
      paddingBottom:
        spacing["2xl"] + Math.max(insets.bottom, spacing.lg),
    },
    containerKeyboard: {
      justifyContent: "flex-start",
      paddingTop: spacing.xl + insets.top,
    },
    card: {
      width: "100%",
      maxWidth: 520,
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 20,
      padding: spacing["2xl"],
      borderWidth: 1,
      borderColor: colors.borderPrimary,
      shadowColor: "#000",
      shadowOpacity: 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
    brand: {
      fontSize: typography.fontSize["2xl"],
      fontWeight: "800",
      color: colors.textPrimary,
      textAlign: "center",
      letterSpacing: 0.5,
    },
    // ピル型タブ
    tabsPillsWrapper: { marginTop: spacing.lg },
    tabsPillsBg: {
      flexDirection: "row",
      backgroundColor: colors.backgroundSecondary,
      padding: 4,
      borderRadius: 999,
    },
    pill: {
      flex: 1,
      paddingVertical: spacing.md,
      borderRadius: 999,
      alignItems: "center",
    },
    pillActive: {
      backgroundColor: colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: colors.borderPrimary,
    },
    pillText: { color: colors.textSecondary, fontWeight: "700" },
    pillTextActive: { color: colors.textPrimary },
    label: {
      color: colors.textSecondary,
      fontWeight: "700",
      marginBottom: 6,
      marginTop: spacing.lg,
    },
    // 入力文字がダークでも読めるように text color を明示
    input: {
      borderWidth: 1,
      borderColor: colors.borderPrimary,
      borderRadius: 12,
      paddingHorizontal: spacing.lg,
      paddingVertical: 16,
      backgroundColor: colors.backgroundSecondary,
      color: colors.textPrimary,
    },
    inputError: { borderColor: colors.error },
    hint: { color: colors.textSecondary, fontSize: 12, marginTop: 6 },
    hintError: { color: colors.error, fontSize: 12, marginTop: 6 },
    linksRow: {
      flexDirection: "row",
      justifyContent: "flex-end",
      marginTop: spacing.sm,
    },
    link: { color: colors.primary, fontWeight: "700" },
    linkGoogle: { color: "#1a73e8", fontWeight: "700" },
    keepRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: spacing.sm,
    },
    termsRow: { alignItems: "flex-start", marginTop: spacing.md },
    termsText: { color: colors.textSecondary, flex: 1 },
    termsLineText: {
      color: colors.textPrimary,
      fontSize: typography.fontSize.base,
    },
    termsLineSmall: {
      color: colors.textPrimary,
      fontSize: typography.fontSize.sm,
    },
    checkbox: {
      width: 18,
      height: 18,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: colors.borderPrimary,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.backgroundSecondary,
    },
    checkboxInner: { width: 0, height: 0 },
    checkboxChecked: { borderColor: colors.primary },
    iconBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: colors.borderPrimary,
      alignItems: "center",
      justifyContent: "center",
    },
    iconBtnDisabled: {
      opacity: 0.5,
      backgroundColor: colors.backgroundSecondary,
    },
    ok: { color: "#1a7f37" },
    ng: { color: colors.textSecondary },
    dividerRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: spacing.lg,
    },
    divider: { flex: 1, height: 1, backgroundColor: colors.borderPrimary },
    // Google button styled like outline spec
    googleBtn: {
      width: "100%",
      marginTop: spacing.md,
      backgroundColor: colors.backgroundSecondary,
      borderColor: "#dadce0",
      borderWidth: 1,
      borderRadius: 12,
      paddingVertical: 14,
    },
    googleBtnEnabled: {
      borderColor: "#dadce0",
      backgroundColor: colors.backgroundSecondary,
    },
    googleBtnDisabled: {
      borderColor: colors.gray300,
      backgroundColor: colors.gray100,
    },
    googleText: { color: colors.textPrimary, fontWeight: "700" },
    googleTextDisabled: { color: colors.gray500, fontWeight: "700" },
    googleIcon: { width: 18, height: 18, marginRight: 8 },
    infoBanner: {
      marginTop: spacing.sm,
      paddingVertical: 10,
      paddingHorizontal: spacing.md,
      backgroundColor: "#ECFDF5",
      borderRadius: 8,
      borderWidth: 1,
      borderColor: "#A7F3D0",
    },
    infoText: { color: "#065F46", fontSize: 12 },
    errorBanner: {
      marginTop: spacing.sm,
      paddingVertical: 10,
      paddingHorizontal: spacing.md,
      backgroundColor: "#FEF2F2",
      borderRadius: 8,
      borderWidth: 1,
      borderColor: "#FCA5A5",
    },
    errorText: { color: "#991B1B", fontSize: 12 },
  });

export default AuthScreen;
