import React from 'react';
import { SafeAreaView, StatusBar, StyleSheet, View } from 'react-native';
import TimerScreen from './TimerScreen';
import { colors, spacing } from '../theme';
import HistoryButton from '../components/HistoryButton';
import RankingButton from '../components/RankingButton';

const HomeScreen = ({ navigation }: { navigation: any }) => (
  <SafeAreaView style={styles.container}>
    <StatusBar barStyle="dark-content" backgroundColor={colors.backgroundTertiary} />
    <TimerScreen />
    <View style={styles.buttonContainer}>
      <HistoryButton onPress={() => navigation.navigate('History')} />
      <RankingButton onPress={() => navigation.navigate('Ranking')} />
    </View>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundTertiary,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: spacing.lg,
  },
});

export default HomeScreen;

