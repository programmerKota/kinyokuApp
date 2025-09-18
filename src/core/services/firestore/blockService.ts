import type { Unsubscribe } from 'firebase/firestore';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  setDoc,
  Timestamp,
  where,
} from 'firebase/firestore';

import { db } from '@app/config/firebase.config';
import { COLLECTIONS, DISABLE_FIRESTORE } from './constants';
import { FirestoreUserService } from './userService';

export class BlockService {
  static async getBlockDocId(targetUserId: string): Promise<string> {
    const currentUserId = await FirestoreUserService.getCurrentUserId();
    return `${currentUserId}_${targetUserId}`;
  }

  static async isBlocked(targetUserId: string): Promise<boolean> {
    if (DISABLE_FIRESTORE) return false;
    const currentUserId = await FirestoreUserService.getCurrentUserId();
    const id = `${currentUserId}_${targetUserId}`;
    const ref = doc(db, COLLECTIONS.BLOCKS, id);
    const snap = await getDoc(ref);
    return snap.exists();
  }

  static async block(targetUserId: string): Promise<void> {
    if (DISABLE_FIRESTORE) return;
    const currentUserId = await FirestoreUserService.getCurrentUserId();
    const id = `${currentUserId}_${targetUserId}`;
    const ref = doc(db, COLLECTIONS.BLOCKS, id);
    await setDoc(ref, {
      blockerId: currentUserId,
      blockedId: targetUserId,
      createdAt: Timestamp.now(),
    });
  }

  static async unblock(targetUserId: string): Promise<void> {
    if (DISABLE_FIRESTORE) return;
    const currentUserId = await FirestoreUserService.getCurrentUserId();
    const id = `${currentUserId}_${targetUserId}`;
    const ref = doc(db, COLLECTIONS.BLOCKS, id);
    await deleteDoc(ref);
  }

  static subscribeBlockedIds(
    userId: string,
    callback: (blockedIds: string[]) => void,
  ): Unsubscribe {
    const qy = query(collection(db, COLLECTIONS.BLOCKS), where('blockerId', '==', userId));
    return onSnapshot(qy, (qs) => {
      const ids = qs.docs.map((docSnap) => (docSnap.data() as any).blockedId as string);
      callback(ids);
    });
  }
}
