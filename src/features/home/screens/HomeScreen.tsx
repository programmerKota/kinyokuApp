import AsyncStorage from "@react-native-async-storage/async-storage";
import type { StackNavigationProp } from "@react-navigation/stack";
import React, { useCallback, useState, useMemo, useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@app/contexts/AuthContext";
import type { RootStackParamList } from "@app/navigation/RootNavigator";
import TimerScreen from "@features/challenge/screens/TimerScreen";
import DiaryButton from "@features/diary/components/DiaryButton";
import HistoryButton from "@features/home/components/HistoryButton";
import RankingButton from "@features/home/components/RankingButton";
import ProfileEditModal from "@features/profile/components/ProfileEditModal";
import { spacing, useAppTheme } from "@shared/theme";
import AppStatusBar from "@shared/theme/AppStatusBar";

// プロフィール初期設定モーダルの自動表示は廃止

type HomeNav = StackNavigationProp<RootStackParamList>;

type HomeScreenProps = {
  navigation: HomeNav;
};

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const { mode } = useAppTheme();
  const styles = useMemo(() => createStyles(mode), [mode]);

  const refreshHomeScreen = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  // Show profile setup modal if flagged by signup flow
  const checkProfileFlag = useCallback(async () => {
    try {
      const v = await AsyncStorage.getItem("__post_signup_profile");
      if (v === "1") setShowProfileSetup(true);
    } catch {}
  }, []);

  useEffect(() => {
    void checkProfileFlag();
  }, [checkProfileFlag]);
  useEffect(() => {
    void checkProfileFlag();
  }, [user?.uid, checkProfileFlag]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <AppStatusBar />
      <ProfileEditModal
        visible={showProfileSetup}
        onClose={async () => {
          setShowProfileSetup(false);
          try {
            await AsyncStorage.removeItem("__post_signup_profile");
          } catch {}
        }}
        onSaved={async () => {
          try {
            await AsyncStorage.removeItem("__post_signup_profile");
          } catch {}
        }}
      />
      <TimerScreen key={refreshKey} onChallengeStarted={refreshHomeScreen} />

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
      paddingBottom: spacing.md,
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
