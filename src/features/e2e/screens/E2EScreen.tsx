import React from "react";
import { View } from "react-native";
import { RadioButton, List } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import TimerScreen from "@features/challenge/screens/TimerScreen";
import { colors, useAppTheme } from "@shared/theme";
import AppStatusBar from "@shared/theme/AppStatusBar";

const E2EScreen: React.FC = () => {
  const { mode, setMode } = useAppTheme();

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.backgroundTertiary }}
    >
      <AppStatusBar />

      {/* 簡易テーマ切替（自動なし：ライト/ダークのみ） */}
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>
        <RadioButton.Group
          onValueChange={(v) => setMode(v as "light" | "dark")}
          value={mode}
        >
          <List.Item
            title="ライト"
            description="明るいテーマ"
            left={() => <List.Icon icon="white-balance-sunny" />}
            right={() => <RadioButton value="light" />}
            style={{
              backgroundColor: colors.backgroundSecondary,
              borderRadius: 8,
              marginBottom: 8,
            }}
          />
          <List.Item
            title="ダーク"
            description="暗いテーマ"
            left={() => <List.Icon icon="weather-night" />}
            right={() => <RadioButton value="dark" />}
            style={{
              backgroundColor: colors.backgroundSecondary,
              borderRadius: 8,
            }}
          />
        </RadioButton.Group>
      </View>

      <TimerScreen />
    </SafeAreaView>
  );
};

export default E2EScreen;
