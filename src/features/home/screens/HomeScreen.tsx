import type { StackNavigationProp } from "@react-navigation/stack";
import React, { useCallback, useState, useMemo } from "react";
import { SafeAreaView, StyleSheet, View } from "react-native";
import AppStatusBar from "@shared/theme/AppStatusBar";

import { useAuth } from "@app/contexts/AuthContext";
import type { RootStackParamList } from "@app/navigation/RootNavigator";
import TimerScreen from "@features/challenge/screens/TimerScreen";
import DiaryButton from "@features/diary/components/DiaryButton";
import HistoryButton from "@features/home/components/HistoryButton";
import RankingButton from "@features/home/components/RankingButton";
import { spacing, useAppTheme } from "@shared/theme";

// プロフィール初期設定モーダルの自動表示は廃止

type HomeNav = StackNavigationProp<RootStackParamList>;

type HomeScreenProps = {
  navigation: HomeNav;
};

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const { mode } = useAppTheme();
  const styles = useMemo(() => createStyles(mode), [mode]);

  const refreshHomeScreen = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <AppStatusBar />
      <TimerScreen
        key={refreshKey}
        onChallengeStarted={refreshHomeScreen}
      />

      <View style={styles.buttonContainer}>
        <View style={styles.quickBtn}>
          <HistoryButton onPress={() => navigation.navigate("History")} />
        </View>
        <View style={styles.quickBtn}>
          <DiaryButton onPress={() => navigation.navigate("Diary")} />
        </View>
        <View style={styles.quickBtn}>
          <RankingButton
            onPress={() => navigation.navigate("Ranking")}
            style={{ width: "100%" }}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const createStyles = (mode: "light" | "dark") => {
  const { colorSchemes } = require("@shared/theme/colors");
  const colors = colorSchemes[mode];

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.backgroundTertiary,
    },
    buttonContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: 0,
      paddingBottom: spacing.lg,
    },
    quickBtn: {
      flex: 1,
      minWidth: 120,
      alignItems: "stretch",
      paddingHorizontal: spacing.xs,
    },
  });
};

export default HomeScreen;
