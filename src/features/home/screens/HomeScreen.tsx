import type { StackNavigationProp } from '@react-navigation/stack';
import React from 'react';
import { SafeAreaView, StatusBar, StyleSheet, View } from 'react-native';

import type { RootStackParamList } from '@app/navigation/RootNavigator';
import TimerScreen from '@features/challenge/screens/TimerScreen';
import HistoryButton from '@features/home/components/HistoryButton';
import RankingButton from '@features/home/components/RankingButton';
import { colors, spacing } from '@shared/theme';

type HomeNav = StackNavigationProp<RootStackParamList>;

const HomeScreen = ({ navigation }: { navigation: HomeNav }) => (
  <SafeAreaView style={styles.container}>
    <StatusBar barStyle="dark-content" backgroundColor={colors.backgroundTertiary} />
    <TimerScreen />
    <View style={styles.buttonContainer}>
      <View style={styles.quickBtn}>
        <HistoryButton
          onPress={() => {
            void navigation.navigate('History');
          }}
        />
      </View>
      <View style={styles.quickBtn}>
        <RankingButton
          onPress={() => {
            void navigation.navigate('Ranking');
          }}
          style={{ width: '100%' }}
        />
      </View>
      <View style={styles.quickBtn}>
        <RankingButton
          title="商品"
          onPress={() => {
            // TODO: Products画面のナビゲーション型を追加
            void (navigation as any).navigate('Products');
          }}
          style={{ width: '100%' }}
        />
      </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: 0,
    paddingBottom: spacing.lg,
  },
  quickBtn: {
    flex: 1,
    minWidth: 0,
    alignItems: 'stretch',
    paddingHorizontal: spacing.xs,
  },
});

export default HomeScreen;
