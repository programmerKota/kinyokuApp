import type {
  DocumentData,
  QuerySnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

import { db } from '@app/config/firebase.config';
import ProfileCache from '../profileCache';
import { FirestoreError } from './errors';
import { COLLECTIONS, DISABLE_FIRESTORE } from './constants';
import type {
  FirestoreTournament,
  FirestoreTournamentJoinRequest,
  FirestoreTournamentMessage,
  FirestoreTournamentParticipant,
} from './types';
import { FirestoreUserService } from './userService';
import type { StrictTournamentParticipant } from '@project-types/strict';

const toDate = (value: Timestamp | Date | null | undefined): Date | undefined => {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === 'function') {
    try {
      return value.toDate();
    } catch {
      return undefined;
    }
  }
  return undefined;
};

export class TournamentService {
  static async reflectUserProfile(
    userId: string,
    displayName?: string,
    photoURL?: string,
  ): Promise<void> {
    if (DISABLE_FIRESTORE) return;

    const updateMany = async (
      coll: string,
      idField: 'userId' | 'authorId',
      nameField: string,
      avatarField: string,
    ) => {
      const qy = query(collection(db, coll), where(idField, '==', userId));
      const snap = await getDocs(qy);
      const docs = snap.docs;
      const chunkSize = 400;
      for (let i = 0; i < docs.length; i += chunkSize) {
        const batch = writeBatch(db);
        const slice = docs.slice(i, i + chunkSize);
        slice.forEach((d) => {
          batch.update(d.ref, {
            [nameField]: displayName ?? null,
            [avatarField]: photoURL ?? null,
          });
        });
        await batch.commit();
      }
    };

    await Promise.allSettled([
      updateMany(COLLECTIONS.TOURNAMENT_PARTICIPANTS, 'userId', 'userName', 'userAvatar'),
      updateMany(COLLECTIONS.TOURNAMENT_MESSAGES, 'authorId', 'authorName', 'authorAvatar'),
    ]);
  }

  static async createTournament(
    tournamentData: Omit<FirestoreTournament, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<string> {
    const now = Timestamp.now();
    const docRef = await addDoc(collection(db, COLLECTIONS.TOURNAMENTS), {
      ...tournamentData,
      createdAt: now,
      updatedAt: now,
    });
    return docRef.id;
  }

  static async getTournaments(): Promise<FirestoreTournament[]> {
    const q = query(collection(db, COLLECTIONS.TOURNAMENTS), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as FirestoreTournament[];
  }

  static async getTournament(tournamentId: string): Promise<FirestoreTournament | null> {
    const ref = doc(db, COLLECTIONS.TOURNAMENTS, tournamentId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as FirestoreTournament;
  }

  static async deleteTournament(tournamentId: string): Promise<void> {
    const tournament = await this.getTournament(tournamentId);
    if (!tournament) throw new FirestoreError('大会が見つかりません', 'not-found');
    const currentUserId = await FirestoreUserService.getCurrentUserId();
    if (tournament.ownerId !== currentUserId) throw new FirestoreError('削除権限がありません', 'permission-denied');

    const partsQuery = query(
      collection(db, COLLECTIONS.TOURNAMENT_PARTICIPANTS),
      where('tournamentId', '==', tournamentId),
    );
    const msgsQuery = query(
      collection(db, COLLECTIONS.TOURNAMENT_MESSAGES),
      where('tournamentId', '==', tournamentId),
    );

    const [partsSnap, msgsSnap] = await Promise.all([getDocs(partsQuery), getDocs(msgsQuery)]);
    const ops: Array<Promise<void>> = [];
    partsSnap.forEach((docSnap) => ops.push(deleteDoc(docSnap.ref)));
    msgsSnap.forEach((docSnap) => ops.push(deleteDoc(docSnap.ref)));
    ops.push(deleteDoc(doc(db, COLLECTIONS.TOURNAMENTS, tournamentId)));
    await Promise.all(ops);
  }

  static async joinTournament(
    tournamentId: string,
    userId?: string,
    userName?: string,
    userAvatar?: string,
  ): Promise<string> {
    const tournament = await this.getTournament(tournamentId);
    if (!tournament) throw new FirestoreError('大会が見つかりません', 'not-found');
    if (!tournament.recruitmentOpen) {
      throw new FirestoreError('現在この大会は募集停止中です', 'unavailable');
    }

    const now = Timestamp.now();
    const docRef = await addDoc(collection(db, COLLECTIONS.TOURNAMENT_PARTICIPANTS), {
      tournamentId,
      userId: userId || (await FirestoreUserService.getCurrentUserId()),
      userName: userName || (await FirestoreUserService.getCurrentUserName()),
      userAvatar: userAvatar || (await FirestoreUserService.getCurrentUserAvatar()),
      status: 'joined',
      joinedAt: now,
    });
    return docRef.id;
  }

  static async requestJoin(
    tournamentId: string,
    userId?: string,
    userName?: string,
    userAvatar?: string,
  ): Promise<string> {
    const now = Timestamp.now();
    const docRef = await addDoc(collection(db, COLLECTIONS.TOURNAMENT_JOIN_REQUESTS), {
      tournamentId,
      userId: userId || (await FirestoreUserService.getCurrentUserId()),
      userName: userName || (await FirestoreUserService.getCurrentUserName()),
      userAvatar: userAvatar || (await FirestoreUserService.getCurrentUserAvatar()),
      status: 'pending',
      createdAt: now,
    });
    return docRef.id;
  }

  static async approveJoinRequest(requestId: string): Promise<void> {
    if (DISABLE_FIRESTORE) return;

    const requestRef = doc(db, COLLECTIONS.TOURNAMENT_JOIN_REQUESTS, requestId);
    const requestSnap = await getDoc(requestRef);
    if (!requestSnap.exists()) throw new FirestoreError('参加申請が見つかりません', 'not-found');

    const request = requestSnap.data() as FirestoreTournamentJoinRequest;
    const tournament = await this.getTournament(request.tournamentId);
    if (!tournament) throw new FirestoreError('大会が見つかりません', 'not-found');

    const ownerId = tournament.ownerId;
    const currentUserId = await FirestoreUserService.getCurrentUserId();
    if (ownerId !== currentUserId) throw new FirestoreError('承認権限がありません', 'permission-denied');

    const batch = writeBatch(db);
    batch.update(requestRef, {
      status: 'approved',
      updatedAt: Timestamp.now(),
    });

    const participantRef = doc(
      db,
      COLLECTIONS.TOURNAMENT_PARTICIPANTS,
      `${request.tournamentId}_${request.userId}`,
    );
    batch.set(
      participantRef,
      {
        tournamentId: request.tournamentId,
        userId: request.userId,
        userName: request.userName,
        userAvatar: request.userAvatar,
        status: 'joined',
        joinedAt: Timestamp.now(),
      },
      { merge: true },
    );

    await batch.commit();
  }

  static async rejectJoinRequest(requestId: string): Promise<void> {
    const requestRef = doc(db, COLLECTIONS.TOURNAMENT_JOIN_REQUESTS, requestId);
    await updateDoc(requestRef, {
      status: 'rejected',
      updatedAt: Timestamp.now(),
    });
  }

  static subscribeToJoinRequests(
    tournamentId: string,
    callback: (requests: FirestoreTournamentJoinRequest[]) => void,
  ): Unsubscribe {
    const q = query(
      collection(db, COLLECTIONS.TOURNAMENT_JOIN_REQUESTS),
      where('tournamentId', '==', tournamentId),
      orderBy('createdAt', 'desc'),
    );
    return onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as any),
      })) as FirestoreTournamentJoinRequest[];
      callback(items);
    });
  }

  static async addMessage(
    tournamentId: string,
    text: string,
    authorId?: string,
    authorName?: string,
    authorAvatar?: string,
  ): Promise<string> {
    // Guard: only participants (or owner) can send messages
    const senderId = authorId || (await FirestoreUserService.getCurrentUserId());
    const t = await this.getTournament(tournamentId);
    if (!t) throw new FirestoreError('大会が見つかりません', 'not-found');
    if (t.ownerId !== senderId) {
      const qy = query(
        collection(db, COLLECTIONS.TOURNAMENT_PARTICIPANTS),
        where('tournamentId', '==', tournamentId),
        where('userId', '==', senderId),
        where('status', '==', 'joined'),
        limit(1),
      );
      const partSnap = await getDocs(qy);
      if (partSnap.empty) {
        throw new FirestoreError('参加者のみメッセージを送信できます', 'permission-denied');
      }
    }
    const now = Timestamp.now();
    const docRef = await addDoc(collection(db, COLLECTIONS.TOURNAMENT_MESSAGES), {
      tournamentId,
      authorId: senderId,
      authorName: authorName || (await FirestoreUserService.getCurrentUserName()),
      authorAvatar: authorAvatar || (await FirestoreUserService.getCurrentUserAvatar()),
      text: text ?? '',
      type: 'text',
      createdAt: now,
      moderation: {
        status: 'clean',
        reasons: [],
        severity: 0,
        checkedAt: now,
        checkedBy: 'auto',
      },
    });
    return docRef.id;
  }

  static async sendMessage(tournamentId: string, text: string): Promise<string> {
    return await this.addMessage(tournamentId, text);
  }

  static subscribeToMessages(
    tournamentId: string,
    callback: (messages: FirestoreTournamentMessage[]) => void,
  ): Unsubscribe {
    const q = query(
      collection(db, COLLECTIONS.TOURNAMENT_MESSAGES),
      where('tournamentId', '==', tournamentId),
      orderBy('createdAt', 'asc'),
    );
    let base: FirestoreTournamentMessage[] = [];
    let profileUnsub: Unsubscribe | undefined;

    const emit = (
      profiles?: Map<string, { displayName?: string; photoURL?: string } | undefined>,
    ) => {
      const merged = base.map((message) => {
        const profile = profiles?.get(message.authorId);
        return {
          ...message,
          authorName: profile?.displayName ?? message.authorName,
          authorAvatar: profile?.photoURL ?? message.authorAvatar,
        } as FirestoreTournamentMessage;
      });
      callback(merged);
    };

    const unsub = onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
      base = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as any),
      })) as FirestoreTournamentMessage[];
      const ids = base.map((msg) => msg.authorId);
      if (profileUnsub) profileUnsub();
      profileUnsub = ProfileCache.getInstance().subscribeMany(ids, (profiles) => emit(profiles));
      emit();
    });

    return () => {
      unsub();
      if (profileUnsub) profileUnsub();
    };
  }

  static subscribeToTournaments(callback: (tournaments: FirestoreTournament[]) => void): Unsubscribe {
    const q = query(collection(db, COLLECTIONS.TOURNAMENTS), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as any),
      })) as FirestoreTournament[];
      callback(items);
    });
  }

  static async setRecruitmentOpen(tournamentId: string, open: boolean): Promise<void> {
    const tournament = await this.getTournament(tournamentId);
    if (!tournament) throw new FirestoreError('大会が見つかりません', 'not-found');
    const currentUserId = await FirestoreUserService.getCurrentUserId();
    if (tournament.ownerId !== currentUserId) throw new FirestoreError('操作権限がありません', 'permission-denied');

    await updateDoc(doc(db, COLLECTIONS.TOURNAMENTS, tournamentId), {
      recruitmentOpen: open,
      updatedAt: Timestamp.now(),
    });
  }

  static async getTournamentParticipants(
    tournamentId: string,
  ): Promise<StrictTournamentParticipant[]> {
    const q = query(
      collection(db, COLLECTIONS.TOURNAMENT_PARTICIPANTS),
      where('tournamentId', '==', tournamentId),
      orderBy('joinedAt', 'asc'),
    );
    const snap = await getDocs(q);
    return snap.docs.map((docSnap) => {
      const data = docSnap.data() as FirestoreTournamentParticipant;
      return {
        id: docSnap.id,
        tournamentId: data.tournamentId,
        userId: data.userId,
        userName: data.userName,
        userAvatar: data.userAvatar,
        status: data.status,
        joinedAt: toDate(data.joinedAt) ?? new Date(),
        leftAt: toDate(data.leftAt) ?? null,
        progressPercent: data.progressPercent,
        currentDay: data.currentDay,
      } satisfies StrictTournamentParticipant;
    });
  }

  static subscribeToParticipants(
    tournamentId: string,
    callback: (participants: FirestoreTournamentParticipant[]) => void,
  ): Unsubscribe {
    const q = query(
      collection(db, COLLECTIONS.TOURNAMENT_PARTICIPANTS),
      where('tournamentId', '==', tournamentId),
      orderBy('joinedAt', 'asc'),
    );
    let base: FirestoreTournamentParticipant[] = [];
    let profileUnsub: Unsubscribe | undefined;

    const emit = (
      profiles?: Map<string, { displayName?: string; photoURL?: string } | undefined>,
    ) => {
      const merged = base.map((participant) => {
        const profile = profiles?.get(participant.userId);
        return {
          ...participant,
          userName: profile?.displayName ?? participant.userName,
          userAvatar: profile?.photoURL ?? participant.userAvatar,
        } as FirestoreTournamentParticipant;
      });
      callback(merged);
    };

    const unsub = onSnapshot(q, (snapshot) => {
      base = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as any),
      })) as FirestoreTournamentParticipant[];
      const ids = base.map((participant) => participant.userId);
      if (profileUnsub) profileUnsub();
      profileUnsub = ProfileCache.getInstance().subscribeMany(ids, (profiles) => emit(profiles));
      emit();
    });

    return () => {
      unsub();
      if (profileUnsub) profileUnsub();
    };
  }

  static async kickParticipant(tournamentId: string, userId: string): Promise<void> {
    const q = query(
      collection(db, COLLECTIONS.TOURNAMENT_PARTICIPANTS),
      where('tournamentId', '==', tournamentId),
      where('userId', '==', userId),
      limit(1),
    );
    const snap = await getDocs(q);
    if (snap.empty) return;

    await updateDoc(snap.docs[0].ref, {
      status: 'kicked',
      leftAt: Timestamp.now(),
    });
  }
}








