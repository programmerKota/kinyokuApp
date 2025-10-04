// 厳密な型定義ファイル
// 既存の型定義をより厳密にし、any型を排除

// ユーザー関連の厳密な型定義
export interface StrictUser {
  uid: string;
  displayName: string;
  avatarUrl?: string;
  avatarVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

// チャレンジ関連の厳密な型定義
export interface StrictChallenge {
  id: string;
  userId: string;
  goalDays: number;
  penaltyAmount: number;
  status: "active" | "completed" | "failed" | "paused";
  startedAt: Date;
  completedAt?: Date | null;
  failedAt?: Date | null;
  totalPenaltyPaid: number;
  createdAt: Date;
  updatedAt: Date;
}

// 大会関連の厳密な型定義
export interface StrictTournament {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  maxParticipants: number;
  entryFee: number;
  prizePool: number;
  status: "upcoming" | "active" | "completed" | "cancelled";
  recruitmentOpen: boolean;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface StrictTournamentParticipant {
  id: string;
  tournamentId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  status: "joined" | "left" | "kicked" | "completed" | "failed";
  joinedAt: Date;
  leftAt?: Date | null;
  progressPercent?: number;
  currentDay?: number;
}

// コミュニティ関連の厳密な型定義
export interface StrictCommunityPost {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  title?: string;
  content: string;
  imageUrl?: string;
  likes: number;
  comments: number;
  createdAt: Date;
  updatedAt: Date;
  moderation?: StrictModerationInfo;
}

export interface StrictCommunityComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  moderation?: StrictModerationInfo;
}

// モデレーション情報の厳密な型定義
export interface StrictModerationInfo {
  status: "clean" | "pending" | "flagged" | "blocked";
  reasons?: string[];
  severity?: number; // 1-5
  checkedAt?: Date;
  checkedBy?: string; // uid or system marker
}

// 支払い関連の厳密な型定義
export interface StrictPayment {
  id: string;
  userId: string;
  amount: number;
  type: "penalty" | "entry_fee" | "prize";
  status: "pending" | "completed" | "failed" | "refunded";
  transactionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// フォロー関連の厳密な型定義
export interface StrictFollow {
  id: string; // `${followerId}_${followeeId}`
  followerId: string;
  followeeId: string;
  createdAt: Date;
}

// ブロック関連の厳密な型定義
export interface StrictBlock {
  id: string; // `${blockerId}_${blockedId}`
  blockerId: string;
  blockedId: string;
  createdAt: Date;
}

// エラー関連の厳密な型定義
export interface StrictError {
  message: string;
  code?: string;
  context?: {
    component: string;
    action: string;
    userId?: string;
  };
  timestamp: string;
}

// API レスポンスの厳密な型定義
export interface StrictApiResponse<T> {
  success: boolean;
  data?: T;
  error?: StrictError;
  timestamp: string;
}

// ページネーション関連の厳密な型定義
export interface StrictPaginationParams {
  page: number;
  limit: number;
  cursor?: string;
}

export interface StrictPaginationResponse<T> {
  items: T[];
  hasMore: boolean;
  nextCursor?: string;
  total?: number;
}

// フォーム関連の厳密な型定義
export interface StrictFormState<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
  isValid: boolean;
}

// モーダル関連の厳密な型定義
export interface StrictModalState {
  visible: boolean;
  loading?: boolean;
  error?: string;
}

// ローディング関連の厳密な型定義
export type StrictLoadingVariant = "default" | "overlay" | "inline" | "minimal";
export type StrictLoadingSize = "small" | "large";

// ユーティリティ型
export type StrictNonNullable<T> = T extends null | undefined ? never : T;
export type StrictOptional<T, K extends keyof T> = Omit<T, K> &
  Partial<Pick<T, K>>;
export type StrictRequired<T, K extends keyof T> = T & Required<Pick<T, K>>;

// イベントハンドラーの厳密な型定義
export type StrictEventHandler<T = void> = (data: T) => void | Promise<void>;
export type StrictAsyncEventHandler<T = void> = (data: T) => Promise<void>;

// コンポーネントプロパティの厳密な型定義
export interface StrictComponentProps {
  className?: string;
  style?: Record<string, unknown>;
  testID?: string;
}

// ナビゲーション関連の厳密な型定義
export interface StrictNavigationParams {
  [key: string]: string | number | boolean | undefined;
}

// 検索・フィルター関連の厳密な型定義
export interface StrictSearchParams {
  query?: string;
  filters?: Record<string, unknown>;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// 統計関連の厳密な型定義
export interface StrictStats {
  totalUsers: number;
  activeChallenges: number;
  completedChallenges: number;
  totalTournaments: number;
  totalPosts: number;
  lastUpdated: Date;
}





