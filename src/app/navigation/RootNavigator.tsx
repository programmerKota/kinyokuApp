import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';

import HistoryStackNavigator from './HistoryStackNavigator';
import RankingStackNavigator from './RankingStackNavigator';
import DiaryStackNavigator from './DiaryStackNavigator';
import TournamentStackNavigator from './TournamentStackNavigator';
import CommunityScreen from '@features/community/screens/CommunityScreen';
import HomeScreen from '@features/home/screens/HomeScreen';
import ProfileScreen from '@features/profile/screens/ProfileScreen';
import UserDetailScreen from '@features/profile/screens/UserDetailScreen';
import BlockedUsersScreen from '@features/profile/screens/BlockedUsersScreen';
import FeedbackScreen from '@features/feedback/screens/FeedbackScreen';
import { colors } from '@shared/theme';

const Tab = createBottomTabNavigator();
export type RootStackParamList = {
  MainTabs: undefined;
  History: undefined;
  Diary: undefined;
  Ranking: undefined;
  UserDetail: { userId: string; userName?: string; userAvatar?: string };
  BlockedUsers: undefined;
  Feedback: undefined;
};

const RootStack = createStackNavigator<RootStackParamList>();

const MainTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }: { focused: boolean; color: string; size: number }) => {
        let iconName: keyof typeof Ionicons.glyphMap;

        if (route.name === 'Home') {
          iconName = focused ? 'home' : 'home-outline';
        } else if (route.name === 'Tournaments') {
          iconName = focused ? 'trophy' : 'trophy-outline';
        } else if (route.name === 'Community') {
          iconName = focused ? 'chatbubble' : 'chatbubble-outline';
        } else if (route.name === 'Profile') {
          iconName = focused ? 'person' : 'person-outline';
        } else {
          iconName = 'help-outline';
        }

        return <Ionicons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.textSecondary,
      tabBarStyle: {
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: colors.borderPrimary,
        paddingBottom: 8,
        paddingTop: 8,
        height: 88,
      },
      tabBarLabelStyle: {
        fontSize: 12,
        fontWeight: '500',
      },
      headerShown: false,
    })}
  >
    <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'ホーム' }} />
    <Tab.Screen
      name="Tournaments"
      component={TournamentStackNavigator}
      options={{ tabBarLabel: '大会' }}
    />
    <Tab.Screen name="Community" component={CommunityScreen} options={{ tabBarLabel: '投稿' }} />
    <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: '設定' }} />
  </Tab.Navigator>
);

const RootNavigator: React.FC = () => (
  <NavigationContainer>
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="MainTabs" component={MainTabs} />
      <RootStack.Screen name="History" component={HistoryStackNavigator} />
      <RootStack.Screen name="Diary" component={DiaryStackNavigator} />
      <RootStack.Screen name="Ranking" component={RankingStackNavigator} />
      <RootStack.Screen name="UserDetail" component={UserDetailScreen} />
      <RootStack.Screen name="BlockedUsers" component={BlockedUsersScreen} />
      <RootStack.Screen name="Feedback" component={FeedbackScreen} />
    </RootStack.Navigator>
  </NavigationContainer>
);

export default RootNavigator;
