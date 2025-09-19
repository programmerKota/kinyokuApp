import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";

import { db } from "@app/config/firebase.config";
import { COLLECTIONS } from "./constants";
import type { FirestoreDiary } from "./types";
import { ChallengeService } from "./challengeService";
import { FirestoreError } from "./errors";

export class DiaryService {
  static async getUserDiaries(userId: string): Promise<FirestoreDiary[]> {
    const q = query(
      collection(db, COLLECTIONS.DIARIES),
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as any),
    })) as FirestoreDiary[];
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

  static async addDiaryForActiveChallenge(
    userId: string,
    content: string,
    options?: { day?: number },
  ): Promise<string> {
    const active = await ChallengeService.getActiveChallenge(userId).catch(() => null);
    if (!active) {
      throw new FirestoreError(
        "アクティブなチャレンジがありません。開始後に日記を追加できます。",
        "no-active-challenge",
      );
    }

    const startedAt = (active.startedAt as any)?.toDate?.() || (active.startedAt as any);
    const now = new Date();
    const computedDay = Math.floor((now.getTime() - startedAt.getTime()) / (24 * 3600 * 1000)) + 1;
    let day: number = options?.day && options.day > 0 ? options.day : computedDay;

    // Enforce: only allow posting for the current challenge day
    if (day !== computedDay) {
      throw new FirestoreError(
        `現在のチャレンジ日数（${computedDay}日目）にのみ投稿できます。`,
        "invalid-day",
      );
    }

    const ref = await addDoc(collection(db, COLLECTIONS.DIARIES), {
      userId,
      content,
      challengeId: active?.id ?? null,
      day,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  }

  static async getDiariesByDay(
    day: number,
    max: number = 100,
  ): Promise<FirestoreDiary[]> {
    const q = query(
      collection(db, COLLECTIONS.DIARIES),
      where("day", "==", day),
      orderBy("createdAt", "desc"),
      limit(max),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as any),
    })) as FirestoreDiary[];
  }

  static async deleteDiary(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTIONS.DIARIES, id));
  }
}
