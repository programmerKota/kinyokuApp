import React from "react";
import { StatusBar } from "react-native";

import { useAppTheme } from "./ThemeProvider";
import { colors } from "./colors";

type Props = {
  backgroundColor?: string;
};

export const AppStatusBar: React.FC<Props> = ({ backgroundColor }) => {
  const { isDark } = useAppTheme();
  return (
    <StatusBar
      barStyle={isDark ? "light-content" : "dark-content"}
      backgroundColor={backgroundColor ?? colors.backgroundSecondary}
    />
  );
};

export default AppStatusBar;

