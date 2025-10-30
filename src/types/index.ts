import type {
  FailureDeviceKey,
  FailureFeelingKey,
  FailureOtherKey,
  FailurePlaceKey,
  FailureTimeSlotKey,
} from "@features/challenge/constants/failureReflectionOptions";

export type FailureSingleOptionSelection<T extends string> = {
  option: T | FailureOtherKey | null;
  customValue?: string | null;
};

export interface FailureReflection {
  timeSlot: FailureSingleOptionSelection<FailureTimeSlotKey>;
  device: FailureSingleOptionSelection<FailureDeviceKey>;
  feelings: Array<FailureSingleOptionSelection<FailureFeelingKey>>;
  place: FailureSingleOptionSelection<FailurePlaceKey>;
  otherNote?: string | null;
  recordedAt?: string;
}

// ユーザー関連の型定義
export interface User {
  uid: string;
  displayName: string;
  avatarUrl?: string;
  avatarVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

// チャレンジ関連の型定義
export interface Challenge {
  id: string;
  userId: string;
  goalDays: number;
  penaltyAmount: number;
  status: "active" | "completed" | "failed" | "paused";
  startedAt: Date;
  completedAt?: Date;
  failedAt?: Date;
  totalPenaltyPaid: number;
  reflectionNote?: string | null;
  reflection?: FailureReflection | null;
  createdAt: Date;
  updatedAt: Date;
}

// 旧トーナメント系の型は未使用のため削除しました（Firestore層の型を使用）

// コミュニティ関連の型定義
export interface CommunityPost {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  title?: string;
  content: string;
  imageUrl?: string;
  likes: number;
  comments: number;
  // Firestore Timestamp or Date
  createdAt: Date | { toDate: () => Date };
  updatedAt: Date | { toDate: () => Date };
  moderation?: ModerationInfo;
}

export interface CommunityComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  createdAt: Date | { toDate: () => Date };
  updatedAt: Date | { toDate: () => Date };
  moderation?: ModerationInfo;
}

// モデレーション情報
export interface ModerationInfo {
  status: "clean" | "pending" | "flagged" | "blocked";
  reasons?: string[];
  severity?: number; // 1-5
  checkedAt?: Date | { toDate: () => Date };
  checkedBy?: string; // uid or system marker
}

// 支払い関連の型定義
export interface Payment {
  id: string;
  userId: string;
  amount: number;
  type: "penalty" | "entry_fee" | "prize";
  status: "pending" | "completed" | "failed" | "refunded";
  transactionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// 旧ナビゲーション型は未使用のため削除しました（各Navigatorで定義）
