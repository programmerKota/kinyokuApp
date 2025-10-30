import React, { useCallback, useMemo, useState } from "react";
import { Alert, View, StyleSheet } from "react-native";

import { useAuth } from "@app/contexts/AuthContext";
import { PaymentFirestoreService } from "@core/services/firestore";
import ChallengeModal from "@features/challenge/components/ChallengeModal";
import { FAILURE_OTHER_OPTION_KEY } from "@features/challenge/constants/failureReflectionOptions";
import StopModal, {
  type FailureReflectionFormState,
} from "@features/challenge/components/StopModal";
import TimerDisplay from "@features/challenge/components/TimerDisplay";
import useTimerHook from "@features/challenge/hooks/useTimer";
import { useAuthPrompt } from "@shared/auth/AuthPromptProvider";
import LoadingState from "@shared/components/LoadingState";
import useErrorHandlerHook from "@shared/hooks/useErrorHandler";
import PenaltyPaywallSheet from "@shared/payments/PenaltyPaywall";
import type { FailureReflection } from "@project-types";

interface TimerScreenProps {
  onChallengeStarted?: () => void;
}

const createInitialReflectionForm = (): FailureReflectionFormState => ({
  timeSlot: { option: null, customValue: "" },
  device: { option: null, customValue: "" },
  place: { option: null, customValue: "" },
  feelings: { selected: [], otherValue: "" },
  otherNote: "",
});

const TimerScreen: React.FC<TimerScreenProps> = ({ onChallengeStarted }) => {
  const [state, actions] = useTimerHook();
  const { handleError } = useErrorHandlerHook();
  const { requireAuth } = useAuthPrompt();
  const { user } = useAuth();
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [reflectionForm, setReflectionForm] =
    useState<FailureReflectionFormState>(() => createInitialReflectionForm());
  const [pendingReflection, setPendingReflection] =
    useState<FailureReflection | null>(null);
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
    showStopModal: showStopModalAction,
    hideStopModal: hideStopModalAction,
    startChallenge,
    stopChallenge,
  } = actions;

  const resetReflectionForm = useCallback(() => {
    setReflectionForm(createInitialReflectionForm());
    setPendingReflection(null);
  }, []);

  const showStopModal = useCallback(() => {
    resetReflectionForm();
    showStopModalAction();
  }, [resetReflectionForm, showStopModalAction]);

  const handleCancelStopModal = useCallback(() => {
    resetReflectionForm();
    hideStopModalAction();
  }, [hideStopModalAction, resetReflectionForm]);

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

  const isSingleSelectionValid = useCallback(
    (selection: FailureReflectionFormState["timeSlot"]) => {
      if (!selection.option) return false;
      if (
        selection.option === FAILURE_OTHER_OPTION_KEY &&
        !(selection.customValue && selection.customValue.trim().length > 0)
      ) {
        return false;
      }
      return true;
    },
    [],
  );

  const isFeelingsValid = useCallback(
    (feelings: FailureReflectionFormState["feelings"]) => {
      if (feelings.selected.length === 0) return false;
      if (
        feelings.selected.includes(FAILURE_OTHER_OPTION_KEY) &&
        feelings.otherValue.trim().length === 0
      ) {
        return false;
      }
      return true;
    },
    [],
  );

  const reflectionReady = useMemo(() => {
    if (isGoalAchieved) return true;
    return (
      isSingleSelectionValid(reflectionForm.timeSlot) &&
      isSingleSelectionValid(reflectionForm.device) &&
      isSingleSelectionValid(reflectionForm.place) &&
      isFeelingsValid(reflectionForm.feelings)
    );
  }, [isGoalAchieved, isSingleSelectionValid, isFeelingsValid, reflectionForm]);

  const buildReflectionPayload = useCallback((): FailureReflection | null => {
    if (isGoalAchieved) return null;
    const errors: string[] = [];
    if (!isSingleSelectionValid(reflectionForm.timeSlot)) {
      errors.push("時間帯を選択してください。");
    }
    if (!isSingleSelectionValid(reflectionForm.device)) {
      errors.push("デバイスを選択してください。");
    }
    if (!isSingleSelectionValid(reflectionForm.place)) {
      errors.push("場所を選択してください。");
    }
    if (!isFeelingsValid(reflectionForm.feelings)) {
      errors.push("感情・状態を少なくとも1つ選択してください。");
    }
    if (errors.length > 0) {
      Alert.alert("入力不足", errors.join("\n"));
      return null;
    }
    const mapSelection = (
      selection: FailureReflectionFormState["timeSlot"],
    ) => ({
      option: selection.option!,
      customValue:
        selection.option === FAILURE_OTHER_OPTION_KEY
          ? selection.customValue?.trim() || null
          : null,
    });
    const timeSlotSelection = mapSelection(reflectionForm.timeSlot);
    const deviceSelection = mapSelection(reflectionForm.device);
    const placeSelection = mapSelection(reflectionForm.place);
    const feelings = reflectionForm.feelings.selected.map((key) => ({
      option: key,
      customValue:
        key === FAILURE_OTHER_OPTION_KEY
          ? reflectionForm.feelings.otherValue.trim() || null
          : null,
    })) as FailureReflection["feelings"];
    return {
      timeSlot: timeSlotSelection as FailureReflection["timeSlot"],
      device: deviceSelection as FailureReflection["device"],
      place: placeSelection as FailureReflection["place"],
      feelings,
      otherNote: reflectionForm.otherNote.trim()
        ? reflectionForm.otherNote.trim()
        : null,
    };
  }, [isGoalAchieved, isSingleSelectionValid, isFeelingsValid, reflectionForm]);

  const handleConfirmStop = async () => {
    const ok = await requireAuth();
    if (!ok) return;
    if (!currentSession) return;
    const completed = isGoalAchieved;
    try {
      if (!completed) {
        const reflectionPayload = buildReflectionPayload();
        if (!reflectionPayload) return;
        hideStopModalAction();
        const penalty = currentSession?.penaltyAmount ?? 0;
        if (penalty > 0) {
          setPendingReflection(reflectionPayload);
          setPaywallVisible(true);
          return;
        }
        await stopChallenge(false, reflectionPayload);
        resetReflectionForm();
        return;
      }
      hideStopModalAction();
      await stopChallenge(true, null);
      resetReflectionForm();
      if (__DEV__) {
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
        onClose={handleCancelStopModal}
        currentSession={currentSession}
        actualDuration={actualDuration}
        isGoalAchieved={isGoalAchieved}
        onConfirm={handleConfirmStop}
        confirmDisabled={!reflectionReady}
        reflection={reflectionForm}
        onChangeReflection={setReflectionForm}
      />

      {/* Penalty payment block */}
      <PenaltyPaywallSheet
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
            const reflectionPayload =
              pendingReflection ?? buildReflectionPayload();
            if (!reflectionPayload) {
              throw new Error("REFLECTION_REQUIRED");
            }
            await stopChallenge(false, reflectionPayload);
            resetReflectionForm();
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
