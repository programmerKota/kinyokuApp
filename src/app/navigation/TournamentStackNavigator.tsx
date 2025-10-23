import { createStackNavigator } from "@react-navigation/stack";
import React from "react";

import UserDetailScreen from "@features/profile/screens/UserDetailScreen";
import TournamentRoomScreen from "@features/tournaments/screens/TournamentRoomScreen";
import TournamentsScreen from "@features/tournaments/screens/TournamentsScreen";

export type TournamentStackParamList = {
  TournamentsList: undefined;
  TournamentRoom: {
    tournamentId: string;
  };
  UserDetail: { userId: string; userName?: string; userAvatar?: string };
};

const Stack = createStackNavigator<TournamentStackParamList>();

const TournamentStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="TournamentsList" component={TournamentsScreen} />
      <Stack.Screen name="TournamentRoom" component={TournamentRoomScreen} />
      <Stack.Screen name="UserDetail" component={UserDetailScreen} />
    </Stack.Navigator>
  );
};

export default TournamentStackNavigator;
