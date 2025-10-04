import React from "react";
import { View, StyleSheet } from "react-native";

import ChallengeModal from "@features/challenge/components/ChallengeModal";
import StopModal from "@features/challenge/components/StopModal";
import TimerDisplay from "@features/challenge/components/TimerDisplay";
import useTimer from "@features/challenge/hooks/useTimer";
import LoadingState from "@shared/components/LoadingState";
import useErrorHandler from "@shared/hooks/useErrorHandler";
import { useAuthPrompt } from "@shared/auth/AuthPromptProvider";

interface TimerScreenProps {
  onChallengeStarted?: () => void;
}

const TimerScreen: React.FC<TimerScreenProps> = ({ onChallengeStarted }) => {
  const [state, actions] = useTimer();
  const { handleError } = useErrorHandler();
  const { requireAuth } = useAuthPrompt();
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
      // チャレンジ開始後にホーム画面を更新
      onChallengeStarted?.();
    } catch (error) {
      handleError(
        error,
        { component: "TimerScreen", action: "startChallenge" },
        { fallbackMessage: "Failed to start challenge." },
      );
    }
  };

  const handleConfirmStop = async () => {
    const ok = await requireAuth();
    if (!ok) return;
    if (!currentSession) return;
    const completed = isGoalAchieved;
    try {
      hideStopModal();
      await stopChallenge(completed);
      if (completed) {
        console.log("Challenge completed");
      }
    } catch (error) {
      handleError(
        error,
        { component: "TimerScreen", action: "stopChallenge" },
        { fallbackMessage: "Failed to stop challenge." },
      );
    }
  };

  const handleStartPress = async () => {
    const ok = await requireAuth();
    if (!ok) return;
    setGoalDays(7);
    setPenaltyAmount(0);
    showChallengeModal();
  };

  if (isLoading) {
    return (
      <View style={styles.timerContainer}>
        <LoadingState message="Loading..." variant="default" />
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
