// 日付関連のユーティリティ関数（使用中のもののみ残しています）

export const formatDuration = (seconds: number): string => {
  const days = Math.floor(seconds / (24 * 3600));
  const hours = Math.floor((seconds % (24 * 3600)) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return `${days}日 ${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export type DateLike =
  | Date
  | number
  | string
  | { toDate?: () => Date; getTime?: () => number }
  | null
  | undefined;

// 共通: Date/Firestore.Timestamp/文字列などから Date に変換（安全版）
export const toDate = (input: DateLike): Date => {
  if (!input) return new Date();
  if (input instanceof Date) return input;
  const maybe = input as { toDate?: () => Date; getTime?: () => number };
  if (typeof maybe.toDate === 'function') {
    try {
      return maybe.toDate();
    } catch {
      return new Date();
    }
  }
  if (typeof maybe.getTime === 'function') return input as Date;
  if (typeof input === 'string' || typeof input === 'number') return new Date(input);
  return new Date();
};

// 共通: 日本語の日時表示（例: 2024/9/10 12:34）
export const formatDateTimeJP = (date: Date): string => {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  };
  return date.toLocaleDateString('ja-JP', options);
};

// 共通: 相対時間表示
// showSeconds=true の場合は「x秒前」まで表示、false の場合は 1分未満は「たった今」
export const formatRelative = (value: DateLike, opts: { showSeconds?: boolean } = {}): string => {
  const { showSeconds = true } = opts;
  const date = toDate(value);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (showSeconds) {
    if (seconds < 60) return `${seconds}秒前`;
    if (minutes < 60) return `${minutes}分前`;
  } else {
    if (minutes < 1) return 'たった今';
    if (minutes < 60) return `${minutes}分前`;
  }
  if (hours < 24) return `${hours}時間前`;
  if (days === 1) return '昨日';
  if (days < 7) return `${days}日前`;
  return date.toLocaleDateString('ja-JP');
};
