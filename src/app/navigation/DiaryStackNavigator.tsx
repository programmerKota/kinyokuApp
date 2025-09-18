import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';

import DiaryByDayScreen from '@features/diary/screens/DiaryByDayScreen';

export type DiaryStackParamList = {
  DiaryByDay: undefined;
};

const Stack = createStackNavigator<DiaryStackParamList>();

const DiaryStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DiaryByDay" component={DiaryByDayScreen} />
    </Stack.Navigator>
  );
};

export default DiaryStackNavigator;
