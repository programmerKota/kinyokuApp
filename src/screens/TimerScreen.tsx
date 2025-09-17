import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import useTimer from '../hooks/useTimer';
import useErrorHandler from '../hooks/useErrorHandler';
import TimerDisplay from '../components/TimerDisplay';
import ChallengeModal from '../components/ChallengeModal';
import StopModal from '../components/StopModal';
import LoadingState from '../components/LoadingState';
import { colors, spacing, typography } from '../theme';

const TimerScreen: React.FC = () => {
  const [state, actions] = useTimer();
  const { handleError } = useErrorHandler();
  const {
    goalDays,
    penaltyAmount,
    isLoading,
    isStarting,
    currentSession,
    actualDuration,
    progressPercent,
    isGoalAchieved,
    challengeModalVisible,
    stopModalVisible,
  } = state;
  const {
    setGoalDays,
    setPenaltyAmount,
    showChallengeModal,
    hideChallengeModal,
    showStopModal,
    hideStopModal,
    startChallenge,
    stopChallenge,
  } = actions;

  const handleStart = async () => {
    try {
      await startChallenge(goalDays, penaltyAmount);
      hideChallengeModal();
    } catch (error) {
      handleError(error, {
        component: 'TimerScreen',
        action: 'startChallenge',
      }, {
        fallbackMessage: 'チャレンジの開始に失敗しました',
      });
    }
  };

  const handleConfirmStop = async () => {
    if (!currentSession) return;
    const completed = isGoalAchieved;
    try {
      await stopChallenge(completed);
      if (completed) {
        // 成功時のメッセージは別途表示
        console.log('チャレンジ完了');
      } else {
        // ここでは追加ダイアログを表示しない（要望により支払いフローは起動しない）
      }
    } catch (error) {
      handleError(error, {
        component: 'TimerScreen',
        action: 'stopChallenge',
      }, {
        fallbackMessage: 'チャレンジの停止に失敗しました',
      });
    }
    hideStopModal();
  };

  const handleStartPress = () => {
    setGoalDays(7);
    setPenaltyAmount(0);
    showChallengeModal();
  };

  if (isLoading) {
    return (
      <View style={styles.timerContainer}>
        <LoadingState message="読み込み中..." variant="default" />
      </View>
    );
  }

  return (
    <View style={styles.timerContainer}>
      <TimerDisplay
        actualDuration={actualDuration}
        currentSession={currentSession}
        progressPercent={progressPercent}
        isGoalAchieved={isGoalAchieved}
        onStartPress={handleStartPress}
        onStopPress={showStopModal}
      />

      <ChallengeModal
        visible={challengeModalVisible}
        onClose={hideChallengeModal}
        goalDays={goalDays}
        penaltyAmount={penaltyAmount}
        onGoalDaysChange={setGoalDays}
        onPenaltyAmountChange={setPenaltyAmount}
        onStart={handleStart}
        isStarting={isStarting}
      />

      <StopModal
        visible={stopModalVisible}
        onClose={hideStopModal}
        currentSession={currentSession}
        actualDuration={actualDuration}
        isGoalAchieved={isGoalAchieved}
        onConfirm={handleConfirmStop}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  timerContainer: {
    flex: 1,
  },
});

export default TimerScreen;
