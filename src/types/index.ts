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
  createdAt: Date;
  updatedAt: Date;
}

// 大会関連の型定義
export interface Tournament {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  maxParticipants: number;
  entryFee: number;
  prizePool: number;
  status: "upcoming" | "active" | "completed" | "cancelled";
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TournamentParticipant {
  id: string;
  tournamentId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  status: "joined" | "left" | "kicked" | "completed" | "failed";
  joinedAt: Date;
  leftAt?: Date;
  progressPercent?: number;
  currentDay?: number;
}

export interface TournamentMessage {
  id: string;
  tournamentId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  text: string;
  type: "text" | "system";
  createdAt: Date;
  moderation?: ModerationInfo;
}

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
  status: 'clean' | 'pending' | 'flagged' | 'blocked';
  reasons?: string[];
  severity?: number; // 1-5
  checkedAt?: Date | { toDate: () => Date };
  checkedBy?: 'auto' | string; // uid or auto
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

// ナビゲーション関連の型定義
export type RootTabParamList = {
  Home: undefined;
  Tournaments: undefined;
  Community: undefined;
  History: undefined;
  Profile: undefined;
};

export type TournamentStackParamList = {
  TournamentsList: undefined;
  TournamentRoom: { tournamentId: string };
  CreateTournament: undefined;
};

