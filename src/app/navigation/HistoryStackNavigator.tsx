import { createStackNavigator } from "@react-navigation/stack";
import React from "react";

import HistoryScreen from "@features/history/screens/HistoryScreen";
import FailureSummaryScreen from "@features/history/screens/FailureSummaryScreen";

export type HistoryStackParamList = {
  HistoryMain: undefined;
  FailureSummary: undefined;
};

const Stack = createStackNavigator<HistoryStackParamList>();

const HistoryStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="HistoryMain" component={HistoryScreen} />
      <Stack.Screen name="FailureSummary" component={FailureSummaryScreen} />
    </Stack.Navigator>
  );
};

export default HistoryStackNavigator;
