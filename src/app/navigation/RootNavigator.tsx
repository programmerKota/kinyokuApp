import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import React, { useMemo } from "react";

import CommunityScreen from "@features/community/screens/CommunityScreen";
import FeedbackScreen from "@features/feedback/screens/FeedbackScreen";
import HomeScreen from "@features/home/screens/HomeScreen";
import BlockedUsersScreen from "@features/profile/screens/BlockedUsersScreen";
import FollowListScreen from "@features/profile/screens/FollowListScreen";
import UserDetailScreen from "@features/profile/screens/UserDetailScreen";
import ProfileScreen from "@features/profile/screens/ProfileScreen";
import { useAppTheme } from "@shared/theme";
import E2EScreen from "@features/e2e/screens/E2EScreen";

import DiaryStackNavigator from "./DiaryStackNavigator";
import HistoryStackNavigator from "./HistoryStackNavigator";
import RankingStackNavigator from "./RankingStackNavigator";
import TournamentStackNavigator from "./TournamentStackNavigator";

// DEV screen (lazy import to avoid prod impact)
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-member-access
const DevCrudTestScreen: React.ComponentType<any> | null = __DEV__
  ? require("@features/dev/screens/SupabaseCrudTestScreen").default
  : null;

const Tab = createBottomTabNavigator();
export type RootStackParamList = {
  MainTabs: undefined;
  History: undefined;
  Diary: undefined;
  Ranking: undefined;
  UserDetail: { userId: string; userName?: string; userAvatar?: string };
  FollowList: {
    userId: string;
    userName?: string;
    mode: "following" | "followers";
  };
  BlockedUsers: undefined;
  Feedback: undefined;
  DevCrud?: undefined;
  E2E: undefined;
};

const RootStack = createStackNavigator<RootStackParamList>();

const MainTabs: React.FC = () => {
  const { mode } = useAppTheme();
  const { colorSchemes } = require("@shared/theme/colors");
  const colors = useMemo(() => colorSchemes[mode], [mode]);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({
          focused,
          color,
          size,
        }: {
          focused: boolean;
          color: string;
          size: number;
        }) => {
          let iconName: keyof typeof Ionicons.glyphMap;
          if (route.name === "Home") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Tournaments") {
            iconName = focused ? "trophy" : "trophy-outline";
          } else if (route.name === "Community") {
            iconName = focused ? "chatbubble" : "chatbubble-outline";
          } else if (route.name === "Settings") {
            iconName = focused ? "settings" : "settings-outline";
          } else {
            iconName = "help-outline";
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.backgroundSecondary,
          borderTopWidth: 1,
          borderTopColor: colors.borderPrimary,
          paddingBottom: 8,
          paddingTop: 8,
          height: 88,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: "500" },
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: "ホーム" }}
      />
      <Tab.Screen
        name="Tournaments"
        component={TournamentStackNavigator}
        options={{ tabBarLabel: "トーナメント" }}
      />
      <Tab.Screen
        name="Community"
        component={CommunityScreen}
        options={{ tabBarLabel: "投稿" }}
      />
      <Tab.Screen
        name="Settings"
        component={ProfileScreen}
        options={{ tabBarLabel: "設定" }}
      />
    </Tab.Navigator>
  );
};

const RootNavigator: React.FC = () => {
  const enableE2E = (() => {
    try {
      if (__DEV__) return true;
      // Allow enabling E2E route explicitly via env in preview builds
      const env = (typeof process !== "undefined"
        ? ((process as unknown) as { env?: Record<string, string | undefined> })
            .env
        : undefined) as Record<string, string | undefined> | undefined;
      return env?.EXPO_PUBLIC_ENABLE_E2E === "true";
    } catch {
      return false;
    }
  })();

  const isE2ERequested = (() => {
    try {
      if (typeof window !== "undefined") {
        return new URLSearchParams(window.location.search).get("e2e") === "1";
      }
    } catch {}
    return false;
  })();
  const { navigationTheme } = useAppTheme();
  return (
    <NavigationContainer theme={navigationTheme}>
      <RootStack.Navigator
        screenOptions={{ headerShown: false }}
        initialRouteName={enableE2E && isE2ERequested ? "E2E" : "MainTabs"}
      >
        <RootStack.Screen name="MainTabs" component={MainTabs} />
        <RootStack.Screen name="History" component={HistoryStackNavigator} />
        <RootStack.Screen name="Diary" component={DiaryStackNavigator} />
        <RootStack.Screen name="Ranking" component={RankingStackNavigator} />
        <RootStack.Screen name="UserDetail" component={UserDetailScreen} />
        <RootStack.Screen name="FollowList" component={FollowListScreen} />
        <RootStack.Screen name="BlockedUsers" component={BlockedUsersScreen} />
        <RootStack.Screen name="Feedback" component={FeedbackScreen} />
        {DevCrudTestScreen && (
          <RootStack.Screen name="DevCrud" component={DevCrudTestScreen} />
        )}
        {enableE2E && (
          <RootStack.Screen name="E2E" component={E2EScreen} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;
