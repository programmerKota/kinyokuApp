import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';

import DiaryByDayScreen from '@features/diary/screens/DiaryByDayScreen';
import DiaryAddScreen from '@features/diary/screens/DiaryAddScreen';

export type DiaryStackParamList = {
  DiaryByDay: undefined;
  DiaryAdd: undefined;
};

const Stack = createStackNavigator<DiaryStackParamList>();

const DiaryStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DiaryByDay" component={DiaryByDayScreen} />
      <Stack.Screen name="DiaryAdd" component={DiaryAddScreen} />
    </Stack.Navigator>
  );
};

export default DiaryStackNavigator;
