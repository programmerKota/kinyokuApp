import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from '../contexts/AuthContext';
import { useModal } from './index';
import { ChallengeService } from '../services/firestore';

export type ChallengeStatus = 'active' | 'completed' | 'failed' | 'paused';

export interface CurrentSession {
  id: string;
  goalDays: number;
  penaltyAmount: number;
  status: ChallengeStatus;
  startedAt: Date;
  completedAt?: Date | null;
  failedAt?: Date | null;
}

export interface UseTimerState {
  goalDays: number;
  penaltyAmount: number;
  isLoading: boolean;
  isStarting: boolean;
  currentSession: CurrentSession | null;
  actualDuration: number; // seconds
  progressPercent: number; // 0-100
  isGoalAchieved: boolean;
  challengeModalVisible: boolean;
  stopModalVisible: boolean;
}

export interface UseTimerActions {
  setGoalDays: (days: number) => void;
  setPenaltyAmount: (amount: number) => void;
  showChallengeModal: () => void;
  hideChallengeModal: () => void;
  showStopModal: () => void;
  hideStopModal: () => void;
  startChallenge: (goalDays: number, penaltyAmount: number) => Promise<void>;
  stopChallenge: (isCompleted: boolean) => Promise<void>;
}

function safeToDate(input: unknown): Date | undefined {
  if (!input) return undefined;
  if (input instanceof Date) return input;
  if (typeof (input as { toDate?: () => Date })?.toDate === 'function') {
    try {
      return (input as { toDate: () => Date }).toDate();
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export const useTimer = (): [UseTimerState, UseTimerActions] => {
  const { user } = useAuth();
  const challengeModal = useModal();
  const stopModal = useModal();

  const [goalDays, setGoalDays] = useState<number>(7);
  const [penaltyAmount, setPenaltyAmount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isStarting, setIsStarting] = useState<boolean>(false);
  const [currentSession, setCurrentSession] = useState<CurrentSession | null>(null);
  const [actualDuration, setActualDuration] = useState<number>(0);

  useEffect(() => {
    if (!user?.uid) return;
    setIsLoading(true);
    const unsubscribe = ChallengeService.subscribeToActiveChallenge(user.uid, (activeChallenge) => {
      if (activeChallenge) {
        const startedAt = safeToDate(activeChallenge.startedAt) ?? new Date();
        const session: CurrentSession = {
          id: activeChallenge.id,
          goalDays: activeChallenge.goalDays,
          penaltyAmount: activeChallenge.penaltyAmount,
          status: activeChallenge.status as ChallengeStatus,
          startedAt,
          completedAt: safeToDate(activeChallenge.completedAt) ?? null,
          failedAt: safeToDate(activeChallenge.failedAt) ?? null,
        };
        setCurrentSession(session);
      } else {
        setCurrentSession(null);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [user?.uid]);

  const calculateActualDuration = useCallback((): number => {
    if (!currentSession) return 0;
    const startTime = currentSession.startedAt.getTime();
    const endTime =
      currentSession.status === 'completed' && currentSession.completedAt
        ? currentSession.completedAt.getTime()
        : currentSession.status === 'failed' && currentSession.failedAt
          ? currentSession.failedAt.getTime()
          : Date.now();
    return Math.floor((endTime - startTime) / 1000);
  }, [currentSession]);

  useEffect(() => {
    if (!currentSession) {
      setActualDuration(0);
      return;
    }
    const update = () => setActualDuration(calculateActualDuration());
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [currentSession, calculateActualDuration]);

  const totalSeconds = currentSession
    ? currentSession.goalDays * 24 * 60 * 60
    : goalDays * 24 * 60 * 60;
  const progressPercent = currentSession ? Math.min((actualDuration / totalSeconds) * 100, 100) : 0;
  const isGoalAchieved = currentSession ? actualDuration >= totalSeconds : false;

  const startChallenge = useCallback(
    async (days: number, amount: number) => {
      if (!user?.uid) throw new Error('ユーザーが認証されていません');
      if (isStarting) return;
      setIsStarting(true);
      try {
        const existing = await ChallengeService.getActiveChallenge(user.uid);
        if (existing) {
          throw new Error('ALREADY_ACTIVE');
        }
        const now = new Date();
        await ChallengeService.createChallenge({
          userId: user.uid,
          goalDays: days,
          penaltyAmount: amount,
          status: 'active' as const,
          startedAt: now,
          completedAt: null,
          failedAt: null,
          totalPenaltyPaid: 0,
        });
      } finally {
        setIsStarting(false);
      }
    },
    [user?.uid, isStarting],
  );

  const stopChallenge = useCallback(
    async (isCompleted: boolean) => {
      if (!currentSession) throw new Error('進行中のチャレンジがありません');
      setIsLoading(true);
      try {
        const now = new Date();
        await ChallengeService.updateChallenge(currentSession.id, {
          status: (isCompleted ? 'completed' : 'failed') as 'completed' | 'failed',
          completedAt: isCompleted ? now : null,
          failedAt: !isCompleted ? now : null,
          totalPenaltyPaid: isCompleted ? 0 : currentSession.penaltyAmount,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [currentSession],
  );

  const state: UseTimerState = useMemo(
    () => ({
      goalDays,
      penaltyAmount,
      isLoading,
      isStarting,
      currentSession,
      actualDuration,
      progressPercent,
      isGoalAchieved,
      challengeModalVisible: challengeModal.visible,
      stopModalVisible: stopModal.visible,
    }),
    [
      goalDays,
      penaltyAmount,
      isLoading,
      isStarting,
      currentSession,
      actualDuration,
      progressPercent,
      isGoalAchieved,
      challengeModal.visible,
      stopModal.visible,
    ],
  );

  const actions: UseTimerActions = {
    setGoalDays,
    setPenaltyAmount,
    showChallengeModal: challengeModal.show,
    hideChallengeModal: challengeModal.hide,
    showStopModal: stopModal.show,
    hideStopModal: stopModal.hide,
    startChallenge,
    stopChallenge,
  };

  return [state, actions];
};

export default useTimer;
