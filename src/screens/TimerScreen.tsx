import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import Modal from '../components/Modal';
import Button from '../components/Button';
import InputField from '../components/InputField';
import { useModal } from '../hooks';
import { colors, spacing, typography, shadows } from '../theme';
import { formatDuration } from '../utils';
import { useAuth } from '../contexts/AuthContext';
import { ChallengeService } from '../services/firestore';

const TimerScreen: React.FC = () => {
  const [goalDays, setGoalDays] = useState(7);
  const [penaltyAmount, setPenaltyAmount] = useState(0);

  const { user } = useAuth();
  const challengeModal = useModal();
  const stopModal = useModal();

  const [currentSession, setCurrentSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;

    setIsLoading(true);
    const unsubscribe = ChallengeService.subscribeToActiveChallenge(
      user.uid,
      (activeChallenge) => {
        if (activeChallenge) {
          const startedAt = activeChallenge.startedAt instanceof Date
            ? activeChallenge.startedAt
            : activeChallenge.startedAt.toDate();

          const now = new Date();
          const elapsedSeconds = Math.floor((now.getTime() - startedAt.getTime()) / 1000);

          setCurrentSession({
            id: activeChallenge.id,
            goalDays: activeChallenge.goalDays,
            penaltyAmount: activeChallenge.penaltyAmount,
            status: activeChallenge.status,
            startedAt,
            elapsedSeconds: Math.max(0, elapsedSeconds),
          });
        } else {
          setCurrentSession(null);
        }
        setIsLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [user?.uid]);

  const calculateActualDuration = () => {
    if (!currentSession) return 0;
    const startTime = currentSession.startedAt.getTime();
    const endTime = currentSession.status === 'completed' && currentSession.completedAt
      ? currentSession.completedAt.getTime()
      : currentSession.status === 'failed' && currentSession.failedAt
        ? currentSession.failedAt.getTime()
        : Date.now();
    return Math.floor((endTime - startTime) / 1000);
  };

  const [actualDuration, setActualDuration] = useState(0);

  useEffect(() => {
    if (!currentSession) {
      setActualDuration(0);
      return;
    }

    const updateDuration = () => {
      setActualDuration(calculateActualDuration());
    };

    updateDuration();
    const interval = setInterval(updateDuration, 1000);
    return () => clearInterval(interval);
  }, [currentSession]);

  const progress = currentSession ? (actualDuration / (currentSession.goalDays * 24 * 60 * 60)) * 100 : 0;
  const isGoalAchieved = currentSession ? actualDuration >= currentSession.goalDays * 24 * 60 * 60 : false;

  const startChallenge = async (goalDays: number, penaltyAmount: number) => {
    if (!user?.uid) throw new Error('ユーザーが認証されていません');
    // 二重タップ防止
    if (isStarting) return;
    setIsStarting(true);
    try {
      // 既存の進行中チャレンジを確認して、存在する場合は作成しない
      const existing = await ChallengeService.getActiveChallenge(user.uid);
      if (existing) {
        throw new Error('ALREADY_ACTIVE');
      }
      const now = new Date();
      const challengeData = {
        userId: user.uid,
        goalDays,
        penaltyAmount,
        status: 'active' as const,
        startedAt: now,
        completedAt: null,
        failedAt: null,
        totalPenaltyPaid: 0,
      };
      await ChallengeService.createChallenge(challengeData);
    } finally {
      setIsStarting(false);
    }
  };

  const stopChallenge = async (isCompleted: boolean) => {
    if (!currentSession) throw new Error('進行中のチャレンジがありません');
    setIsLoading(true);
    try {
      const now = new Date();
      const updateData = {
        status: (isCompleted ? 'completed' : 'failed') as 'completed' | 'failed',
        completedAt: isCompleted ? now : null,
        failedAt: !isCompleted ? now : null,
        totalPenaltyPaid: isCompleted ? 0 : currentSession.penaltyAmount,
      };
      await ChallengeService.updateChallenge(currentSession.id, updateData);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartChallenge = async () => {
    try {
      await startChallenge(goalDays, penaltyAmount);
      challengeModal.hide();
    } catch (error) {
      const msg =
        (error as any)?.code === 'conflict' || (error as any)?.message === 'ALREADY_ACTIVE'
          ? '既に進行中のチャレンジがあります。停止してから開始してください。'
          : 'チャレンジの開始に失敗しました。';
      Alert.alert('エラー', msg);
    }
  };

  const handleStopChallenge = () => {
    stopModal.show();
  };

  const confirmStopChallenge = async () => {
    if (currentSession) {
      const isCompleted = isGoalAchieved;
      try {
        await stopChallenge(isCompleted);
        if (isCompleted) {
          Alert.alert('おめでとうございます！', '目標を達成しました！');
        } else {
          Alert.alert('ペナルティ発生', `¥${currentSession.penaltyAmount}のペナルティが発生します。`);
        }
      } catch (error) {
        Alert.alert('エラー', 'チャレンジの停止に失敗しました。');
      }
    }
    stopModal.hide();
  };

  if (isLoading) {
    return (
      <View style={styles.timerContainer}>
        <View style={styles.notStartedContainer}>
          <Text style={styles.loadingText}>読み込み中...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.timerContainer}>
      {!currentSession ? (
        <View style={styles.notStartedContainer}>
          <View style={styles.timerCard}>
            <Text style={styles.dayNumber}>
              {Math.floor(actualDuration / (24 * 3600))}
            </Text>
            <Text style={styles.dayLabel}>日</Text>
            <Text style={styles.timeText}>
              {formatDuration(actualDuration).split(' ')[1]}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.startButton}
            onPress={() => {
              setGoalDays(7);
              setPenaltyAmount(0);
              challengeModal.show();
            }}
          >
            <Text style={styles.startButtonText}>禁欲開始</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.activeContainer}>
          <View style={styles.timerCard}>
            <Text style={styles.dayNumber}>
              {Math.floor(actualDuration / (24 * 3600))}
            </Text>
            <Text style={styles.dayLabel}>日</Text>
            <Text style={styles.timeText}>
              {formatDuration(actualDuration).split(' ')[1]}
            </Text>
          </View>
          <View style={styles.goalBannerActive}>
            <View pointerEvents="none" style={[styles.progressOverlay, { width: `${Math.min(progress, 100)}%` }]} />
            <View style={styles.goalBannerContent}>
              <Text style={styles.goalBannerText}>
                目標{currentSession?.goalDays || goalDays}日まで、 {Math.round(progress)}%達成！
              </Text>
            </View>
          </View>
          <Button
            title="停止"
            onPress={handleStopChallenge}
            variant="danger"
            size="large"
            style={styles.stopButton}
          />
        </View>
      )}

      <Modal visible={challengeModal.visible} onClose={challengeModal.hide} title="チャレンジ設定">
        <InputField
          label="目標日数"
          description="何日間の禁欲に挑戦しますか？"
          placeholder="例: 7"
          value={goalDays.toString()}
          onChangeText={(text) => {
            if (text === '') {
              setGoalDays(0);
            } else {
              const num = parseInt(text);
              setGoalDays(isNaN(num) ? 0 : num);
            }
          }}
          keyboardType="numeric"
        />

        <InputField
          label="ペナルティ金額"
          description="未達成時に支払う金額（0円〜10,000円）"
          hint="※ 0円に設定するとペナルティなし"
          placeholder="例: 500"
          value={penaltyAmount.toString()}
          onChangeText={(text) => {
            const num = parseInt(text || '0');
            setPenaltyAmount(isNaN(num) ? 0 : num);
          }}
          keyboardType="numeric"
        />

        <View style={styles.modalButtons}>
          <Button title="キャンセル" onPress={challengeModal.hide} variant="secondary" style={styles.modalButton} />
          <Button title="開始" onPress={handleStartChallenge} style={styles.modalButton} disabled={isStarting} loading={isStarting} />
        </View>
      </Modal>

      <Modal visible={stopModal.visible} onClose={stopModal.hide} title="チャレンジ停止">
        {currentSession ? (
          <View>
            <Text style={styles.modalMessage}>
              {isGoalAchieved
                ? '目標は達成済みです。停止して結果を確定しますか？\nペナルティは発生しません。'
                : 'このまま停止するとペナルティが発生します。停止してもよろしいですか？'}
            </Text>

            <View style={styles.modalSummaryBox}>
              <Text style={styles.modalSummaryLabel}>現在の継続時間</Text>
              <Text style={styles.modalEmphasis}>{formatDuration(actualDuration)}</Text>

              <Text style={[styles.modalSummaryLabel, { marginTop: 8 }]}>目標</Text>
              <Text style={styles.modalEmphasis}>{currentSession.goalDays}日</Text>

              {!isGoalAchieved && (
                <Text style={[styles.modalEmphasis, styles.penaltyText, { marginTop: 8 }]}>
                  ペナルティ: ¥{currentSession.penaltyAmount.toLocaleString()}
                </Text>
              )}
            </View>

            <View style={styles.modalButtons}>
              <Button title="キャンセル" onPress={stopModal.hide} variant="secondary" style={styles.modalButton} />
              <Button title="OK" onPress={confirmStopChallenge} style={styles.modalButton} />
            </View>
          </View>
        ) : (
          <>
            <Text style={styles.modalMessage}>チャレンジを停止しますか？</Text>
            <View style={styles.modalButtons}>
              <Button title="キャンセル" onPress={stopModal.hide} variant="secondary" style={styles.modalButton} />
              <Button title="OK" onPress={confirmStopChallenge} style={styles.modalButton} />
            </View>
          </>
        )}
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  timerContainer: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing['3xl'],
  },
  notStartedContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    width: '100%',
  },
  activeContainer: {
    alignItems: 'center',
    width: '100%',
    flex: 1,
    justifyContent: 'center',
  },
  timerCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: 'transparent',
    borderRadius: 0,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
    ...shadows.none,
  },
  dayNumber: {
    fontSize: 72,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: typography.letterSpacing.normal,
    lineHeight: 80,
    marginBottom: spacing.sm,
    minHeight: 80,
    includeFontPadding: false,
  },
  dayLabel: {
    fontSize: 24,
    fontWeight: typography.fontWeight.normal,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 30,
    minHeight: 30,
    includeFontPadding: false,
  },
  timeText: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.light,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: typography.letterSpacing.normal,
    fontVariant: ['tabular-nums'],
  },
  startButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing['5xl'],
    paddingVertical: spacing.lg,
    borderRadius: 12,
    marginTop: spacing['3xl'],
    ...shadows.lg,
  },
  startButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    textAlign: 'center',
  },
  stopButton: {
    marginTop: spacing['2xl'],
  },
  goalBannerActive: {
    width: '100%',
    backgroundColor: '#E8F5E8',
    borderRadius: 12,
    padding: spacing.lg,
    overflow: 'hidden',
    marginVertical: spacing.lg,
    position: 'relative',
  },
  goalBannerContent: {
    position: 'relative',
    zIndex: 2,
  },
  progressOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(76, 175, 80, 0.25)',
    zIndex: 1,
  },
  goalBannerText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing['2xl'],
  },
  modalButton: {
    flex: 1,
    marginHorizontal: spacing.sm,
  },
  modalMessage: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing['2xl'],
    lineHeight: typography.lineHeight.normal * typography.fontSize.base,
  },
  modalSummaryBox: {
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    padding: spacing.lg,
  },
  modalSummaryLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textTertiary,
  },
  modalEmphasis: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  penaltyText: {
    color: colors.error,
  },
  loadingText: {
    fontSize: typography.fontSize.lg,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default TimerScreen;
