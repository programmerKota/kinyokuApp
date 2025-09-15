import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../theme';
import HomeScreen from '../screens/HomeScreen';
import TournamentStackNavigator from './TournamentStackNavigator';
import HistoryStackNavigator from './HistoryStackNavigator';
import RankingStackNavigator from './RankingStackNavigator';
import CommunityScreen from '../screens/CommunityScreen';
import ProfileScreen from '../screens/ProfileScreen';
import UserDetailScreen from '../screens/UserDetailScreen';

const Tab = createBottomTabNavigator();
const RootStack = createStackNavigator();

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
    <Tab.Screen name="Tournaments" component={TournamentStackNavigator} options={{ tabBarLabel: '大会' }} />
    <Tab.Screen name="Community" component={CommunityScreen} options={{ tabBarLabel: '投稿' }} />
    <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: '設定' }} />
  </Tab.Navigator>
);

const RootNavigator: React.FC = () => (
  <NavigationContainer>
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="MainTabs" component={MainTabs} />
      <RootStack.Screen name="History" component={HistoryStackNavigator} />
      <RootStack.Screen name="Ranking" component={RankingStackNavigator} />
      <RootStack.Screen name="UserDetail" component={UserDetailScreen} />
    </RootStack.Navigator>
  </NavigationContainer>
);

export default RootNavigator;

