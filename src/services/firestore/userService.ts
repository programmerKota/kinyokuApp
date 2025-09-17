import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';

import { db } from '../../config/firebase.config';
import type { FirestoreUser } from './types';
import { COLLECTIONS, DISABLE_FIRESTORE } from './constants';

export class FirestoreUserService {
  static async getCurrentUserId(): Promise<string> {
    const UserService = (await import('../userService')).default;
    const userService = UserService.getInstance();
    return await userService.getUserId();
  }

  static async getCurrentUserName(): Promise<string> {
    const UserService = (await import('../userService')).default;
    const userService = UserService.getInstance();
    return await userService.getUserName();
  }

  static async getCurrentUserAvatar(): Promise<string | undefined> {
    const UserService = (await import('../userService')).default;
    const userService = UserService.getInstance();
    return await userService.getAvatarUrl();
  }

  static async getUserById(
    userId: string,
  ): Promise<Pick<FirestoreUser, 'displayName' | 'photoURL'> | null> {
    try {
      if (DISABLE_FIRESTORE) {
        const UserService = (await import('../userService')).default;
        const userService = UserService.getInstance();
        const currentId = await userService.getUserId();
        if (currentId === userId) {
          return {
            displayName: await userService.getUserName(),
            photoURL: await userService.getAvatarUrl(),
          } as any;
        }
        return null;
      }

      const ref = doc(db, COLLECTIONS.USERS, userId);
      const snap = await getDoc(ref);
      if (!snap.exists()) return null;
      const data = snap.data() as Partial<FirestoreUser>;
      return {
        displayName: data.displayName ?? 'ユーザー',
        photoURL: data.photoURL,
      };
    } catch (e) {
      console.warn('getUserById failed', e);
      return null;
    }
  }

  static async setUserProfile(
    userId: string,
    profile: { displayName: string; photoURL?: string },
  ): Promise<void> {
    if (DISABLE_FIRESTORE) return;

    const ref = doc(db, COLLECTIONS.USERS, userId);
    const now = Timestamp.now();
    const snapshot = await getDoc(ref);

    await setDoc(
      ref,
      {
        displayName: profile.displayName,
        photoURL: profile.photoURL ?? null,
        updatedAt: now,
        createdAt: snapshot.exists() ? undefined : now,
      },
      { merge: true },
    );
  }
}
