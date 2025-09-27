import type { StackNavigationProp } from '@react-navigation/stack';
import React, { useCallback, useEffect, useState } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { RootStackParamList } from '@app/navigation/RootNavigator';
import TimerScreen from '@features/challenge/screens/TimerScreen';
import HistoryButton from '@features/home/components/HistoryButton';
import RankingButton from '@features/home/components/RankingButton';
import ProfileSetupModal from '@features/home/components/ProfileSetupModal';
import DiaryButton from '@features/diary/components/DiaryButton';
import { useAuth } from '@app/contexts/AuthContext';
import { colors, spacing } from '@shared/theme';

const PROFILE_SETUP_SEEN_KEY = 'profile_setup_seen_v1';
const forceProfileModal = String(
  // Allow forcing the profile setup modal to stay open (dev convenience)
  (typeof process !== 'undefined' && (process as unknown as { env?: Record<string, string | undefined> }).env?.EXPO_PUBLIC_FORCE_PROFILE_SETUP_MODAL) ||
  ''
).toLowerCase() === 'true';

type HomeNav = StackNavigationProp<RootStackParamList>;

type HomeScreenProps = {
  navigation: HomeNav;
};

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { user, updateProfile } = useAuth();
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [checkingFirstLaunch, setCheckingFirstLaunch] = useState(true);
  const [persistingFlag, setPersistingFlag] = useState(false);

  useEffect(() => {
    if (forceProfileModal) {
      setProfileModalVisible(true);
      setCheckingFirstLaunch(false);
      return;
    }
    let active = true;
    (async () => {
      try {
        const seenFlag = await AsyncStorage.getItem(PROFILE_SETUP_SEEN_KEY);
        if (!seenFlag && active) {
          setProfileModalVisible(true);
        }
      } catch (error) {
        console.warn('HomeScreen: failed to read profile setup flag', error);
      } finally {
        if (active) {
          setCheckingFirstLaunch(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const markFlagAsSeen = useCallback(async () => {
    if (persistingFlag) return;
    setPersistingFlag(true);
    try {
      await AsyncStorage.setItem(PROFILE_SETUP_SEEN_KEY, 'true');
    } catch (error) {
      console.warn('HomeScreen: failed to persist profile setup flag', error);
    } finally {
      setPersistingFlag(false);
    }
  }, [persistingFlag]);

  const handleProfileSubmit = useCallback(
    async (nextName: string, avatar?: string) => {
      await updateProfile(nextName, avatar);
      if (!forceProfileModal) {
        await markFlagAsSeen();
        setProfileModalVisible(false);
      }
    },
    [updateProfile, markFlagAsSeen]
  );

  const handleProfileSkip = useCallback(async () => {
    if (forceProfileModal) return; // keep open
    setProfileModalVisible(false);
    await markFlagAsSeen();
  }, [markFlagAsSeen]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.backgroundTertiary} />
      <TimerScreen />

      <ProfileSetupModal
        visible={(forceProfileModal || profileModalVisible) && !checkingFirstLaunch}
        initialName={user?.displayName || ''}
        onSubmit={handleProfileSubmit}
        initialAvatar={user?.avatarUrl}
        onSkip={handleProfileSkip}
      />

      <View style={styles.buttonContainer}>
        <View style={styles.quickBtn}>
          <HistoryButton onPress={() => navigation.navigate('History')} />
        </View>
        <View style={styles.quickBtn}>
          <DiaryButton onPress={() => navigation.navigate('Diary')} />
        </View>
        <View style={styles.quickBtn}>
          <RankingButton
            onPress={() => navigation.navigate('Ranking')}
            style={{ width: '100%' }}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

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
    minWidth: 120,
    alignItems: 'stretch',
    paddingHorizontal: spacing.xs,
  },
});

export default HomeScreen;

