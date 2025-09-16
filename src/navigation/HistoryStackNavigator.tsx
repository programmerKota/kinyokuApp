import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import HistoryScreen from '../screens/HistoryScreen';

export type HistoryStackParamList = {
    HistoryMain: undefined;
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
        </Stack.Navigator>
    );
};

export default HistoryStackNavigator;

