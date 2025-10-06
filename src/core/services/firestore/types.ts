export interface FirestoreUser {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FirestoreChallenge {
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

export interface FirestoreTournament {
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

export interface FirestoreTournamentParticipant {
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

export interface FirestoreTournamentJoinRequest {
  id: string;
  tournamentId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  status: "pending" | "approved" | "rejected";
  createdAt: Date;
}

export interface FirestoreTournamentMessage {
  id: string;
  tournamentId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  text: string;
  type: "text" | "system";
  createdAt: Date;
}

export interface FirestoreCommunityPost {
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
}

// Firebase依存を排除するための簡易型エイリアス
type Timestamp = Date;

export interface FirestoreFollow {
  id: string;
  followerId: string;
  followeeId: string;
  createdAt: Timestamp;
}

export interface FirestorePayment {
  id: string;
  userId: string;
  amount: number;
  type: "penalty" | "entry_fee" | "prize";
  status: "pending" | "completed" | "failed" | "refunded";
  transactionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FirestoreDiary {
  id: string;
  userId: string;
  content: string;
  challengeId?: string;
  day?: number; // 1-based
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
