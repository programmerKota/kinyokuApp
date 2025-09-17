import type { Unsubscribe } from 'firebase/firestore';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  Timestamp,
  where,
} from 'firebase/firestore';

import { db } from '../../config/firebase.config';
import { COLLECTIONS, DISABLE_FIRESTORE } from './constants';
import { FirestoreUserService } from './userService';

export class FollowService {
  static async getFollowDocId(targetUserId: string): Promise<string> {
    const currentUserId = await FirestoreUserService.getCurrentUserId();
    return `${currentUserId}_${targetUserId}`;
  }

  static async isFollowing(targetUserId: string): Promise<boolean> {
    if (DISABLE_FIRESTORE) {
      return false;
    }
    const currentUserId = await FirestoreUserService.getCurrentUserId();
    const id = `${currentUserId}_${targetUserId}`;
    const ref = doc(db, COLLECTIONS.FOLLOWS, id);
    const snap = await getDoc(ref);
    return snap.exists();
  }

  static async follow(targetUserId: string): Promise<void> {
    if (DISABLE_FIRESTORE) return;
    const currentUserId = await FirestoreUserService.getCurrentUserId();
    const id = `${currentUserId}_${targetUserId}`;
    const ref = doc(db, COLLECTIONS.FOLLOWS, id);
    await setDoc(
      ref,
      {
        followerId: currentUserId,
        followeeId: targetUserId,
        createdAt: Timestamp.now(),
      } as any,
      { merge: true },
    );
  }

  static async unfollow(targetUserId: string): Promise<void> {
    if (DISABLE_FIRESTORE) return;
    const currentUserId = await FirestoreUserService.getCurrentUserId();
    const id = `${currentUserId}_${targetUserId}`;
    const ref = doc(db, COLLECTIONS.FOLLOWS, id);
    await deleteDoc(ref);
  }

  static async getFollowingUserIds(followerId: string): Promise<string[]> {
    const q = query(collection(db, COLLECTIONS.FOLLOWS), where('followerId', '==', followerId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((docSnap) => docSnap.data().followeeId);
  }

  static subscribeToFollowingUserIds(
    followerId: string,
    callback: (userIds: string[]) => void,
  ): Unsubscribe {
    const q = query(collection(db, COLLECTIONS.FOLLOWS), where('followerId', '==', followerId));
    return onSnapshot(q, (querySnapshot) => {
      const userIds = querySnapshot.docs.map((docSnap) => docSnap.data().followeeId);
      callback(userIds);
    });
  }

  static async followUser(followerId: string, followeeId: string): Promise<void> {
    const docId = `${followerId}_${followeeId}`;
    const docRef = doc(db, COLLECTIONS.FOLLOWS, docId);
    await setDoc(docRef, {
      followerId,
      followeeId,
      createdAt: Timestamp.now(),
    });
  }

  static async unfollowUser(followerId: string, followeeId: string): Promise<void> {
    const docId = `${followerId}_${followeeId}`;
    const docRef = doc(db, COLLECTIONS.FOLLOWS, docId);
    await deleteDoc(docRef);
  }
}
