import { useMemo } from "react";
import { StyleSheet } from "react-native";

import { colorSchemes } from "./colors";
import { useAppTheme } from "./ThemeProvider";

type NamedStyles<T> = { [P in keyof T]: any };

export function useThemedStyles<T extends NamedStyles<T>>(
  factory: (palette: ReturnType<typeof getPalette>) => T,
): T {
  const { mode } = useAppTheme();
  return useMemo(() => StyleSheet.create(factory(getPalette(mode))), [mode]);
}

function getPalette(mode: keyof typeof colorSchemes) {
  return colorSchemes[mode];
}
