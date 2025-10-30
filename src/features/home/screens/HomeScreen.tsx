import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import type { StackNavigationProp } from "@react-navigation/stack";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState, useMemo, useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@app/contexts/AuthContext";
import type { RootStackParamList } from "@app/navigation/RootNavigator";
import TimerScreen from "@features/challenge/screens/TimerScreen";
import DiaryButton from "@features/diary/components/DiaryButton";
import HistoryButton from "@features/home/components/HistoryButton";
import RankingButton from "@features/home/components/RankingButton";
import ProfileEditModal from "@features/profile/components/ProfileEditModal";
import FailureStrategyService from "@core/services/supabase/failureStrategyService";
import { spacing, useAppTheme } from "@shared/theme";
import type { ColorPalette } from "@shared/theme/colors";
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
  const [strategy, setStrategy] = useState("");
  const [strategyLoading, setStrategyLoading] = useState(false);
  const { mode } = useAppTheme();
  const { colorSchemes } = require("@shared/theme/colors");
  const colors: ColorPalette = colorSchemes[mode];
  const styles = useMemo(() => createStyles(colors), [colors]);

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

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      const fetchStrategy = async () => {
        if (!user?.uid) {
          setStrategy("");
          return;
        }

        setStrategyLoading(true);
        try {
          const value = await FailureStrategyService.getStrategy(user.uid);
          if (!cancelled) {
            setStrategy(value);
          }
        } catch (error) {
          if (!cancelled) {
            console.error("HomeScreen.fetchStrategy", error);
            setStrategy("");
          }
        } finally {
          if (!cancelled) {
            setStrategyLoading(false);
          }
        }
      };

      void fetchStrategy();

      return () => {
        cancelled = true;
      };
    }, [user?.uid]),
  );

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

      <View style={styles.strategyCard}>
        <View style={styles.strategyTitleRow}>
          <Ionicons
            name="bulb-outline"
            size={20}
            color={colors.primary}
            style={styles.strategyIcon}
          />
          <Text style={styles.strategyCardTitle}>戦略</Text>
        </View>
        {strategyLoading ? (
          <View style={styles.strategyMeta}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.strategyMetaText}>戦略を読み込み中...</Text>
          </View>
        ) : strategy ? (
          <Text style={styles.strategyBody}>{strategy}</Text>
        ) : (
          <Text style={styles.strategyPlaceholder}>
            原因サマリーで立てた戦略はここに表示されます。
          </Text>
        )}
      </View>

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

const createStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.backgroundTertiary,
    },
    strategyCard: {
      marginHorizontal: spacing.xl,
      marginTop: spacing.lg,
      marginBottom: spacing["2xl"],
      padding: spacing.lg,
      borderRadius: 16,
      backgroundColor: colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: colors.borderPrimary,
      shadowColor: colors.shadowMedium,
      shadowOpacity: 0.1,
      shadowOffset: { width: 0, height: 10 },
      shadowRadius: 14,
      elevation: 5,
      alignItems: "center",
    },
    strategyTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      columnGap: spacing.xs,
    },
    strategyIcon: {
      marginRight: spacing.xs,
    },
    strategyCardTitle: {
      fontSize: 18,
      fontWeight: "800",
      color: colors.textPrimary,
      textAlign: "center",
    },
    strategyMeta: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: spacing.md,
    },
    strategyMetaText: {
      fontSize: 12,
      color: colors.textSecondary,
      marginLeft: spacing.xs,
      textAlign: "center",
    },
    strategyBody: {
      marginTop: spacing.md,
      fontSize: 16,
      color: colors.textPrimary,
      lineHeight: 22,
      textAlign: "center",
      width: "100%",
    },
    strategyPlaceholder: {
      marginTop: spacing.md,
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
      textAlign: "center",
      width: "100%",
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

export default HomeScreen;
