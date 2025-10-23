import React, { useState } from "react";
import { View, StyleSheet } from "react-native";

import ChallengeModal from "@features/challenge/components/ChallengeModal";
import StopModal from "@features/challenge/components/StopModal";
import TimerDisplay from "@features/challenge/components/TimerDisplay";
import useTimer from "@features/challenge/hooks/useTimer";
import LoadingState from "@shared/components/LoadingState";
import useErrorHandler from "@shared/hooks/useErrorHandler";
import { useAuthPrompt } from "@shared/auth/AuthPromptProvider";
import PenaltyPaywall from "@shared/payments/PenaltyPaywall";
import { useAuth } from "@app/contexts/AuthContext";
import { PaymentFirestoreService } from "@core/services/firestore";

interface TimerScreenProps {
  onChallengeStarted?: () => void;
}

const TimerScreen: React.FC<TimerScreenProps> = ({ onChallengeStarted }) => {
  const [state, actions] = useTimer();
  const { handleError } = useErrorHandler();
  const { requireAuth } = useAuthPrompt();
  const { user } = useAuth();
  const [paywallVisible, setPaywallVisible] = useState(false);
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
      if (!completed) {
        const penalty = currentSession?.penaltyAmount ?? 0;
        if (penalty > 0) {
          // 罰金あり: 支払いモーダルを表示
          setPaywallVisible(true);
          return;
        }
        // 罰金0円: そのまま失敗として確定（支払い不要）
        await stopChallenge(false);
        return;
      }
      // 目標達成時
      await stopChallenge(true);
      if (completed && __DEV__) {
        try {
          console.log("Challenge completed");
        } catch {}
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

      {/* Penalty payment block */}
      <PenaltyPaywall
        amountJPY={currentSession?.penaltyAmount || 0}
        visible={paywallVisible}
        onPaid={async (info) => {
          try {
            setPaywallVisible(false);
            // Record payment best-effort here
            try {
              if (user?.uid && currentSession?.penaltyAmount) {
                await PaymentFirestoreService.addPayment({
                  userId: user.uid,
                  amount: currentSession.penaltyAmount,
                  type: "penalty",
                  status: "completed",
                  transactionId:
                    info?.transactionId || info?.productIdentifier || undefined,
                });
              }
            } catch {}
            await stopChallenge(false);
          } catch (e) {
            handleError(
              e,
              { component: "TimerScreen", action: "stopAfterPay" },
              { fallbackMessage: "Failed to finalize challenge." },
            );
          }
        }}
        onError={(e) => {
          handleError(
            e,
            { component: "TimerScreen", action: "purchasePenalty" },
            { fallbackMessage: "支払いに失敗しました。" },
          );
        }}
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
