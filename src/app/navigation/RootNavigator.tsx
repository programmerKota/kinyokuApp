import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import React from "react";

import CommunityScreen from "@features/community/screens/CommunityScreen";
import FeedbackScreen from "@features/feedback/screens/FeedbackScreen";
import HomeScreen from "@features/home/screens/HomeScreen";
import BlockedUsersScreen from "@features/profile/screens/BlockedUsersScreen";
import ProfileScreen from "@features/profile/screens/ProfileScreen";
import { colors } from "@shared/theme";

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
  BlockedUsers: undefined;
  Feedback: undefined;
  DevCrud?: undefined;
};

const RootStack = createStackNavigator<RootStackParamList>();

const MainTabs: React.FC = () => (
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
        backgroundColor: "white",
        borderTopWidth: 1,
        borderTopColor: colors.borderPrimary,
        paddingBottom: 8,
        paddingTop: 8,
        height: 88,
      },
      tabBarLabelStyle: {
        fontSize: 12,
        fontWeight: "500",
      },
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
      options={{ tabBarLabel: "大会" }}
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

const RootNavigator: React.FC = () => (
  <NavigationContainer>
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="MainTabs" component={MainTabs} />
      <RootStack.Screen name="History" component={HistoryStackNavigator} />
      <RootStack.Screen name="Diary" component={DiaryStackNavigator} />
      <RootStack.Screen name="Ranking" component={RankingStackNavigator} />
      <RootStack.Screen name="BlockedUsers" component={BlockedUsersScreen} />
      <RootStack.Screen name="Feedback" component={FeedbackScreen} />
      {/* 設定はタブから直接プロフィール編集画面を表示するため、追加のスタックは不要 */}
      {__DEV__ && DevCrudTestScreen && (
        <RootStack.Screen name="DevCrud" component={DevCrudTestScreen} />
      )}
    </RootStack.Navigator>
  </NavigationContainer>
);

export default RootNavigator;
