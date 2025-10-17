import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Appearance, Platform, Text, View, ScrollView, SafeAreaView, TextInput } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Provider as PaperProvider, MD3DarkTheme, MD3LightTheme, type MD3Theme } from "react-native-paper";
import { DarkTheme as NavigationDarkTheme, DefaultTheme as NavigationDefaultTheme, type Theme as NavigationTheme } from "@react-navigation/native";

import { applyColorScheme, colorSchemes, type ColorSchemeName } from "./colors";

const THEME_KEY = "@app_theme_mode";
type ThemeMode = Extract<ColorSchemeName, "light" | "dark">;

// 自動追従は不要：初期はライトに固定（保存値があれば上書き）
const initialMode: ThemeMode = "light";
applyColorScheme(initialMode);

type ThemeCtx = {
  mode: ThemeMode;
  isDark: boolean;
  setMode: (m: ThemeMode) => void;
  toggle: () => void;
  paperTheme: MD3Theme;
  navigationTheme: NavigationTheme;
};

const ThemeContext = createContext<ThemeCtx | undefined>(undefined);

export const ThemeProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>(initialMode);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_KEY);
        if (saved === "light" || saved === "dark") {
          applyColorScheme(saved);
          setMode(saved);
        }
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    applyColorScheme(mode);
    void AsyncStorage.setItem(THEME_KEY, mode).catch(() => {});
    // 未指定箇所のデフォルト色を全画面で統一
    const defaultTextColor = mode === "dark" ? "#FFFFFF" : "#000000"; // light→黒, dark→白
    const defaultBackground = mode === "dark" ? "#000000" : "#FFFFFF"; // light→白, dark→黒

    // Text（文字色）
    try {
      const prev = (Text as any).defaultProps?.style;
      (Text as any).defaultProps = (Text as any).defaultProps || {};
      (Text as any).defaultProps.style = [
        { color: defaultTextColor },
        prev,
      ];
    } catch {}

    // TextInput（文字色）
    try {
      const prev = (TextInput as any).defaultProps?.style;
      (TextInput as any).defaultProps = (TextInput as any).defaultProps || {};
      (TextInput as any).defaultProps.style = [
        { color: defaultTextColor },
        prev,
      ];
      // placeholderTextColor は別プロップ
      (TextInput as any).defaultProps.placeholderTextColor = mode === "dark" ? "#9CA3AF" : "#94A3B8";
    } catch {}

    // View 系（背景色）
    const applyBg = (Comp: any) => {
      try {
        const prev = Comp.defaultProps?.style;
        Comp.defaultProps = Comp.defaultProps || {};
        Comp.defaultProps.style = [
          { backgroundColor: defaultBackground },
          prev,
        ];
      } catch {}
    };
    applyBg(View as any);
    applyBg(ScrollView as any);
    applyBg(SafeAreaView as any);
  }, [mode, hydrated]);

  const paperTheme = useMemo<MD3Theme>(() => {
    const base = mode === "dark" ? MD3DarkTheme : MD3LightTheme;
    const p = colorSchemes[mode];
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: p.primary,
        primaryContainer: p.primaryLight,
        secondary: p.secondary,
        secondaryContainer: p.secondaryLight,
        background: p.backgroundPrimary,
        surface: p.backgroundSecondary,
        surfaceVariant: p.backgroundTertiary,
        onPrimary: p.textInverse,
        onSecondary: p.textInverse,
        onSurface: p.textPrimary,
        onSurfaceVariant: p.textSecondary,
        outline: p.borderPrimary,
        error: p.error,
      },
    };
  }, [mode]);

  const navigationTheme = useMemo<NavigationTheme>(() => {
    const base = mode === "dark" ? NavigationDarkTheme : NavigationDefaultTheme;
    const p = colorSchemes[mode];
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: p.primary,
        background: p.backgroundPrimary,
        card: p.backgroundSecondary,
        text: p.textPrimary,
        border: p.borderPrimary,
        notification: p.info,
      },
    };
  }, [mode]);

  const value = useMemo<ThemeCtx>(
    () => ({
      mode,
      isDark: mode === "dark",
      setMode,
      toggle: () => setMode((m) => (m === "light" ? "dark" : "light")),
      paperTheme,
      navigationTheme,
    }),
    [mode, paperTheme, navigationTheme]
  );

  if (Platform.OS === "web" && !hydrated) return null;

  return (
    <ThemeContext.Provider value={value}>
      <PaperProvider theme={paperTheme}>{children}</PaperProvider>
    </ThemeContext.Provider>
  );
};

export const useAppTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useAppTheme must be used within ThemeProvider");
  return ctx;
};
