import type { Challenge } from "@project-types";

export interface ChallengeStats {
  totalChallenges: number;
  completedChallenges: number;
  activeChallenges: number;
  failedChallenges: number;
  averageTime: number;
  longestTime: number;
  successRate: number;
}

export class StatsService {
  /**
   * チャレンジ統計を計算する
   */
  static calculateStats(challenges: Challenge[]): ChallengeStats {
    const totalChallenges = challenges.length;
    const completedChallenges = challenges.filter(
      (c) => c.status === "completed",
    ).length;
    const activeChallenges = challenges.filter(
      (c) => c.status === "active",
    ).length;
    const failedChallenges = challenges.filter(
      (c) => c.status === "failed",
    ).length;

    const averageTime = this.calculateAverageTime(challenges);
    const longestTime = this.calculateLongestTime(challenges);
    const successRate =
      totalChallenges > 0
        ? Math.round((completedChallenges / totalChallenges) * 100)
        : 0;

    return {
      totalChallenges,
      completedChallenges,
      activeChallenges,
      failedChallenges,
      averageTime,
      longestTime,
      successRate,
    };
  }

  /**
   * チャレンジの平均継続時間を計算（完了・失敗・進行中すべて含む）
   */
  static calculateAverageTime(challenges: Challenge[]): number {
    const validChallenges = challenges.filter(
      (c) =>
        c.status === "completed" ||
        c.status === "failed" ||
        c.status === "active",
    );
    if (validChallenges.length === 0) return 0;

    const totalTime = validChallenges.reduce((sum, challenge) => {
      const startTime = challenge.startedAt.getTime();
      const endTime = this.getChallengeEndTime(challenge);
      return sum + (endTime - startTime) / 1000; // 秒単位
    }, 0);

    return totalTime / validChallenges.length;
  }

  /**
   * 全チャレンジの中での最長継続時間を計算（進行中も含む）
   */
  static calculateLongestTime(challenges: Challenge[]): number {
    const allChallenges = challenges.filter(
      (c) =>
        c.status === "completed" ||
        c.status === "failed" ||
        c.status === "active",
    );

    if (allChallenges.length === 0) return 0;

    let longestTime = 0;
    allChallenges.forEach((challenge) => {
      const startTime = challenge.startedAt.getTime();
      const endTime = this.getChallengeEndTime(challenge);
      const duration = (endTime - startTime) / 1000; // 秒単位

      if (duration > longestTime) {
        longestTime = duration;
      }
    });

    return longestTime;
  }

  /**
   * チャレンジの終了時間を取得（進行中の場合は現在時刻）
   */
  private static getChallengeEndTime(challenge: Challenge): number {
    if (challenge.status === "completed" && challenge.completedAt) {
      return challenge.completedAt.getTime();
    }
    if (challenge.status === "failed" && challenge.failedAt) {
      return challenge.failedAt.getTime();
    }
    // 進行中またはその他の場合は現在時刻
    return Date.now();
  }

  /**
   * 秒を「X日 HH:mm:ss」形式にフォーマット
   */
  static formatDuration(seconds: number): string {
    const days = Math.floor(seconds / (24 * 3600));
    const hours = Math.floor((seconds % (24 * 3600)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (days > 0) {
      return `${days}日 ${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    } else {
      return `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
  }

  /**
   * フォーマットされた時間を日数と時間部分に分割
   */
  static splitFormattedDuration(formattedTime: string): {
    days: string;
    time: string;
  } {
    const parts = formattedTime.split(" ");
    if (parts.length === 2) {
      return { days: parts[0], time: parts[1] };
    } else {
      return { days: "0日", time: formattedTime };
    }
  }
}
