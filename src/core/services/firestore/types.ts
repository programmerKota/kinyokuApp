import type { Timestamp } from 'firebase/firestore';

export interface FirestoreUser {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface FirestoreChallenge {
  id: string;
  userId: string;
  goalDays: number;
  penaltyAmount: number;
  status: 'active' | 'completed' | 'failed' | 'paused';
  startedAt: Timestamp | Date;
  completedAt?: Timestamp | Date | null;
  failedAt?: Timestamp | Date | null;
  totalPenaltyPaid: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface FirestoreTournament {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  maxParticipants: number;
  entryFee: number;
  prizePool: number;
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  recruitmentOpen: boolean;
  startDate: Timestamp;
  endDate: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface FirestoreTournamentParticipant {
  id: string;
  tournamentId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  status: 'joined' | 'left' | 'kicked' | 'completed' | 'failed';
  joinedAt: Timestamp;
  leftAt?: Timestamp;
  progressPercent?: number;
  currentDay?: number;
}

export interface FirestoreTournamentJoinRequest {
  id: string;
  tournamentId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Timestamp;
}

export interface FirestoreTournamentMessage {
  id: string;
  tournamentId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  text: string;
  type: 'text' | 'system';
  createdAt: Timestamp;
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
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

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
  type: 'penalty' | 'entry_fee' | 'prize';
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  transactionId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
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
