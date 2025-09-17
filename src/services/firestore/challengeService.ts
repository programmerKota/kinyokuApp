import type { Unsubscribe } from 'firebase/firestore';
import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

import { db } from '../../config/firebase.config';
import { FirestoreError } from './errors';
import { COLLECTIONS } from './constants';
import type { FirestoreChallenge } from './types';

export class ChallengeService {
  static async createChallenge(
    challengeData: Omit<FirestoreChallenge, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<string> {
    try {
      const activeQ = query(
        collection(db, COLLECTIONS.CHALLENGES),
        where('userId', '==', challengeData.userId),
        where('status', '==', 'active'),
        limit(1),
      );
      const activeSnap = await getDocs(activeQ);
      if (!activeSnap.empty) {
        throw new FirestoreError(
          '既に進行中のチャレンジがあります。停止してから開始してください。',
          'conflict',
        );
      }
    } catch (e) {
      if (e instanceof FirestoreError && e.code === 'conflict') throw e;
    }

    const now = Timestamp.now();
    const docRef = await addDoc(collection(db, COLLECTIONS.CHALLENGES), {
      ...challengeData,
      startedAt:
        challengeData.startedAt instanceof Date
          ? Timestamp.fromDate(challengeData.startedAt)
          : challengeData.startedAt,
      completedAt:
        challengeData.completedAt instanceof Date
          ? Timestamp.fromDate(challengeData.completedAt)
          : challengeData.completedAt,
      failedAt:
        challengeData.failedAt instanceof Date
          ? Timestamp.fromDate(challengeData.failedAt)
          : challengeData.failedAt,
      createdAt: now,
      updatedAt: now,
    });
    return docRef.id;
  }

  static async getUserChallenges(userId: string): Promise<FirestoreChallenge[]> {
    const q = query(
      collection(db, COLLECTIONS.CHALLENGES),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        startedAt: data.startedAt?.toDate?.() || new Date(data.startedAt),
        completedAt: data.completedAt?.toDate?.() || null,
        failedAt: data.failedAt?.toDate?.() || null,
      };
    }) as FirestoreChallenge[];
  }

  static async updateChallenge(
    challengeId: string,
    challengeData: Partial<Omit<FirestoreChallenge, 'id' | 'createdAt'>>,
  ): Promise<void> {
    const docRef = doc(db, COLLECTIONS.CHALLENGES, challengeId);
    const updateData: Record<string, unknown> = {
      ...challengeData,
      updatedAt: Timestamp.now(),
    };

    if (challengeData.completedAt instanceof Date) {
      updateData.completedAt = Timestamp.fromDate(challengeData.completedAt);
    }
    if (challengeData.failedAt instanceof Date) {
      updateData.failedAt = Timestamp.fromDate(challengeData.failedAt);
    }

    await updateDoc(docRef, updateData as Record<string, unknown>);
  }

  static async safeStart(
    userId: string,
    data: Omit<FirestoreChallenge, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<string> {
    const exists = await this.getActiveChallenge(userId);
    if (exists) {
      throw new FirestoreError(
        '既に進行中のチャレンジがあります。停止してから開始してください。',
        'conflict',
      );
    }
    return await this.createChallenge(data);
  }

  static async getActiveChallenge(userId: string): Promise<FirestoreChallenge | null> {
    const q = query(
      collection(db, COLLECTIONS.CHALLENGES),
      where('userId', '==', userId),
      where('status', '==', 'active'),
      limit(1),
    );

    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return null;

    const docSnap = querySnapshot.docs[0];
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      startedAt: data.startedAt?.toDate?.() || new Date(data.startedAt),
      completedAt: data.completedAt?.toDate?.() || null,
      failedAt: data.failedAt?.toDate?.() || null,
    } as FirestoreChallenge;
  }

  static subscribeToActiveChallenge(
    userId: string,
    callback: (challenge: FirestoreChallenge | null) => void,
  ): Unsubscribe {
    const q = query(
      collection(db, COLLECTIONS.CHALLENGES),
      where('userId', '==', userId),
      where('status', '==', 'active'),
      limit(1),
    );

    return onSnapshot(
      q,
      (querySnapshot) => {
        if (querySnapshot.empty) {
          callback(null);
          return;
        }

        const docSnap = querySnapshot.docs[0];
        const data = docSnap.data();
        const challenge = {
          id: docSnap.id,
          ...data,
          startedAt: data.startedAt?.toDate?.() || new Date(data.startedAt),
          completedAt: data.completedAt?.toDate?.() || null,
          failedAt: data.failedAt?.toDate?.() || null,
        } as FirestoreChallenge;

        callback(challenge);
      },
      (error) => {
        console.warn('subscribeToActiveChallenge onSnapshot error:', error);
        try {
          callback(null);
        } catch {}
      },
    );
  }
}

