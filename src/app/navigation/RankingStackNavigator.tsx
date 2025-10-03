import { createStackNavigator } from "@react-navigation/stack";
import React from "react";

import RankingScreen from "@features/ranking/screens/RankingScreen";

export type RankingStackParamList = {
  RankingMain: undefined;
};

const Stack = createStackNavigator<RankingStackParamList>();

const RankingStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="RankingMain" component={RankingScreen} />
    </Stack.Navigator>
  );
};

export default RankingStackNavigator;
