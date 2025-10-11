import React from 'react';
import { SafeAreaView, StatusBar } from 'react-native';
import TimerScreen from '@features/challenge/screens/TimerScreen';
import { colors } from '@shared/theme';

const E2EScreen: React.FC = () => {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundTertiary }}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.backgroundTertiary} />
      <TimerScreen />
    </SafeAreaView>
  );
};

export default E2EScreen;

