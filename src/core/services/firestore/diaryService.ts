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
import { httpsCallable } from "firebase/functions";
import { fbFunctions, enableFunctionsCalls, useEmulator } from "@app/config/firebase.config";

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

    // Enforce: 1 entry per day per user/challenge (client-side check)
    const dupQ = query(
      collection(db, COLLECTIONS.DIARIES),
      where("userId", "==", userId),
      where("challengeId", "==", active.id),
      where("day", "==", day),
      limit(1),
    );
    const dupSnap = await getDocs(dupQ);
    if (!dupSnap.empty) {
      throw new FirestoreError("この日は既に投稿済みです。", "already-exists");
    }

    // Try server-side callable first (authoritative path) if enabled
    if (enableFunctionsCalls && !useEmulator) {
      try {
        const addCallable = httpsCallable(fbFunctions, "addDiaryForToday");
        const res = (await addCallable({ content })) as unknown as { data?: { id: string } };
        const id = (res && (res as any).data && (res as any).data.id) || undefined;
        if (id) return id;
        // fallthrough to direct write if no id returned
      } catch (e: any) {
        const code = e?.code || e?.details?.code;
        const msg = e?.message || e?.details?.message;
        // Map known server-side errors
        if (code === "already-exists") throw new FirestoreError("この日は既に投稿済みです。", code);
        if (code === "invalid-day") throw new FirestoreError("現在のチャレンジ日（当日）のみ投稿できます。", code);
        if (code === "no-active-challenge" || code === "failed-precondition")
          throw new FirestoreError("アクティブなチャレンジがありません。", "no-active-challenge");
        // Otherwise, prefer failing closed only in prod
        if (process.env.NODE_ENV === "production" && msg) {
          throw new FirestoreError(msg, code);
        }
        // Dev: continue to client write
      }
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

  static async hasDiaryForActiveChallengeDay(
    userId: string,
    day: number,
  ): Promise<boolean> {
    const active = await ChallengeService.getActiveChallenge(userId).catch(() => null);
    if (!active) return false;
    const qy = query(
      collection(db, COLLECTIONS.DIARIES),
      where("userId", "==", userId),
      where("challengeId", "==", active.id),
      where("day", "==", day),
      limit(1),
    );
    const snap = await getDocs(qy);
    return !snap.empty;
  }
}
