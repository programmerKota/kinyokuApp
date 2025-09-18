import { addDoc, collection, deleteDoc, doc, getDocs, limit, orderBy, query, serverTimestamp, where } from 'firebase/firestore';

import { db } from '@app/config/firebase.config';
import { COLLECTIONS } from './constants';
import type { FirestoreDiary } from './types';
import { ChallengeService } from './challengeService';

export class DiaryService {
  static async getUserDiaries(userId: string): Promise<FirestoreDiary[]> {
    const q = query(
      collection(db, COLLECTIONS.DIARIES),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as FirestoreDiary[];
  }

  static async addDiary(userId: string, content: string): Promise<string> {
    // Backward compatible simple add (no day/challenge)
    const ref = await addDoc(collection(db, COLLECTIONS.DIARIES), {
      userId,
      content,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  }

  static async addDiaryForActiveChallenge(userId: string, content: string): Promise<string> {
    const active = await ChallengeService.getActiveChallenge(userId);
    if (!active) {
      // fallback to simple add if no active challenge
      return await this.addDiary(userId, content);
    }
    const startedAt = (active.startedAt as any)?.toDate?.() || (active.startedAt as any);
    const now = new Date();
    const day = Math.floor((now.getTime() - startedAt.getTime()) / (24 * 3600 * 1000)) + 1;

    // Optional: ensure one diary per (userId, challengeId, day)
    // Not enforcing strictly; could add query+update here if needed.

    const ref = await addDoc(collection(db, COLLECTIONS.DIARIES), {
      userId,
      content,
      challengeId: active.id,
      day,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  }

  static async getDiariesByDay(day: number, max: number = 100): Promise<FirestoreDiary[]> {
    const q = query(
      collection(db, COLLECTIONS.DIARIES),
      where('day', '==', day),
      orderBy('createdAt', 'desc'),
      limit(max),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as FirestoreDiary[];
  }

  static async deleteDiary(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTIONS.DIARIES, id));
  }
}
