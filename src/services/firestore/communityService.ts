import type { Unsubscribe } from 'firebase/firestore';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  startAfter,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

import { db } from '../../config/firebase.config';
import { moderateText } from '../moderation';
import ProfileCache from '../profileCache';
import type { CommunityComment } from '../../types';
import { BlockService } from './blockService';
import { COLLECTIONS, DISABLE_FIRESTORE } from './constants';
import type { FirestoreCommunityPost } from './types';
import { FirestoreUserService } from './userService';

export class CommunityService {
  static async reflectUserProfile(
    userId: string,
    displayName?: string,
    photoURL?: string,
  ): Promise<void> {
    if (DISABLE_FIRESTORE) return;
    const updates: Array<Promise<void>> = [];

    const updateMany = async (
      coll: string,
      idField: 'authorId' | 'userId',
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
        updates.push(batch.commit());
      }
    };

    await Promise.allSettled([
      updateMany(COLLECTIONS.COMMUNITY_POSTS, 'authorId', 'authorName', 'authorAvatar'),
      updateMany(COLLECTIONS.COMMUNITY_COMMENTS, 'authorId', 'authorName', 'authorAvatar'),
    ]);

    await Promise.allSettled(updates);
  }

  static async getRecentPostsPage(
    pageSize: number,
    afterCreatedAt?: Timestamp,
  ): Promise<{ items: FirestoreCommunityPost[]; nextCursor?: Timestamp }> {
    const coll = collection(db, COLLECTIONS.COMMUNITY_POSTS);
    const qy = afterCreatedAt
      ? query(coll, orderBy('createdAt', 'desc'), startAfter(afterCreatedAt), limit(pageSize))
      : query(coll, orderBy('createdAt', 'desc'), limit(pageSize));
    const qs = await getDocs(qy);
    const items = qs.docs.map((d) => ({
      id: d.id,
      ...(d.data() as any),
    })) as FirestoreCommunityPost[];
    const last = qs.docs[qs.docs.length - 1];
    const nextCursor = last ? ((last.data() as any).createdAt as Timestamp) : undefined;
    return { items, nextCursor };
  }

  static async getUserPosts(userId: string): Promise<FirestoreCommunityPost[]> {
    const qy = query(
      collection(db, COLLECTIONS.COMMUNITY_POSTS),
      where('authorId', '==', userId),
      orderBy('createdAt', 'desc'),
    );
    const qs = await getDocs(qy);
    return qs.docs.map((d) => ({
      id: d.id,
      ...(d.data() as any),
    })) as FirestoreCommunityPost[];
  }

  static async addPost(data: { content: string }): Promise<string> {
    const now = Timestamp.now();
    const authorId = await FirestoreUserService.getCurrentUserId();
    const author = await FirestoreUserService.getUserById(authorId);
    const m = await moderateText(data.content || '');
    const docRef = await addDoc(collection(db, COLLECTIONS.COMMUNITY_POSTS), {
      authorId,
      authorName: author?.displayName || 'ユーザー',
      authorAvatar: author?.photoURL,
      title: '',
      content: data.content,
      imageUrl: null,
      likes: 0,
      comments: 0,
      createdAt: now,
      updatedAt: now,
      moderation: {
        status: m.status,
        reasons: m.reasons,
        severity: m.severity,
        checkedAt: now,
        checkedBy: m.checkedBy,
      },
    });
    return docRef.id;
  }

  static subscribeToRecentPosts(
    callback: (posts: FirestoreCommunityPost[]) => void,
    max: number = 200,
  ): Unsubscribe {
    const useLimit = Number.isFinite(max) && max > 0;
    const qy = useLimit
      ? query(collection(db, COLLECTIONS.COMMUNITY_POSTS), orderBy('createdAt', 'desc'), limit(max))
      : query(collection(db, COLLECTIONS.COMMUNITY_POSTS), orderBy('createdAt', 'desc'));
    let base: FirestoreCommunityPost[] = [];
    let unsubs: Unsubscribe | undefined;

    const emit = (map?: Map<string, { displayName?: string; photoURL?: string } | undefined>) => {
      const merged = base.map((p) => {
        const prof = map?.get(p.authorId);
        return {
          ...p,
          authorName: prof?.displayName ?? p.authorName,
          authorAvatar: prof?.photoURL ?? p.authorAvatar,
        } as FirestoreCommunityPost;
      });
      callback(merged);
    };

    const postsUnsub = onSnapshot(qy, async (qs) => {
      base = qs.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      })) as FirestoreCommunityPost[];
      const ids = base.map((p) => p.authorId);
      if (unsubs) unsubs();
      unsubs = ProfileCache.getInstance().subscribeMany(ids, (m) => emit(m));
      emit();
    });

    return () => {
      postsUnsub();
      if (unsubs) unsubs();
    };
  }

  static subscribeToUserPosts(
    userId: string,
    callback: (posts: FirestoreCommunityPost[]) => void,
  ): Unsubscribe {
    const qy = query(
      collection(db, COLLECTIONS.COMMUNITY_POSTS),
      where('authorId', '==', userId),
      orderBy('createdAt', 'desc'),
    );
    let base: FirestoreCommunityPost[] = [];
    let profileUnsub: Unsubscribe | undefined;

    const emit = (map?: Map<string, { displayName?: string; photoURL?: string } | undefined>) => {
      const merged = base.map((p) => {
        const prof = map?.get(p.authorId);
        return {
          ...p,
          authorName: prof?.displayName ?? p.authorName,
          authorAvatar: prof?.photoURL ?? p.authorAvatar,
        } as FirestoreCommunityPost;
      });
      callback(merged);
    };

    const postsUnsub = onSnapshot(qy, (qs) => {
      base = qs.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      })) as FirestoreCommunityPost[];
      const ids = base.map((p) => p.authorId);
      if (profileUnsub) profileUnsub();
      profileUnsub = ProfileCache.getInstance().subscribeMany(ids, (m) => emit(m));
      emit();
    });

    return () => {
      postsUnsub();
      if (profileUnsub) profileUnsub();
    };
  }

  static subscribeToFollowingPosts(
    userIds: string[],
    callback: (posts: FirestoreCommunityPost[]) => void,
  ): Unsubscribe {
    if (userIds.length === 0) {
      callback([]);
      return () => undefined;
    }

    const chunks: string[][] = [];
    for (let i = 0; i < userIds.length; i += 10) {
      chunks.push(userIds.slice(i, i + 10));
    }

    const chunkData = new Map<number, FirestoreCommunityPost[]>();
    let profileUnsub: Unsubscribe | undefined;

    const emit = (map?: Map<string, { displayName?: string; photoURL?: string } | undefined>) => {
      const combined = Array.from(chunkData.values()).flat();
      combined.sort((a, b) => {
        const toDate = (input: unknown) =>
          typeof (input as { toDate?: () => Date })?.toDate === 'function'
            ? (input as { toDate: () => Date }).toDate()
            : input instanceof Date
              ? input
              : new Date(input as any);
        const aDate = toDate(a.createdAt);
        const bDate = toDate(b.createdAt);
        return bDate.getTime() - aDate.getTime();
      });

      const merged = combined.map((p) => {
        const prof = map?.get(p.authorId);
        return {
          ...p,
          authorName: prof?.displayName ?? p.authorName,
          authorAvatar: prof?.photoURL ?? p.authorAvatar,
        } as FirestoreCommunityPost;
      });
      callback(merged);
    };

    const resubscribeProfiles = () => {
      const ids = new Set<string>();
      chunkData.forEach((list) => {
        list.forEach((p) => ids.add(p.authorId));
      });

      if (profileUnsub) profileUnsub();
      if (ids.size === 0) {
        profileUnsub = undefined;
        callback([]);
        return;
      }

      profileUnsub = ProfileCache.getInstance().subscribeMany(Array.from(ids), (m) => emit(m));
      emit();
    };

    const unsubscribes = chunks.map((chunk, index) => {
      const qy = query(
        collection(db, COLLECTIONS.COMMUNITY_POSTS),
        where('authorId', 'in', chunk),
        orderBy('createdAt', 'desc'),
      );
      return onSnapshot(qy, (qs) => {
        const items = qs.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        })) as FirestoreCommunityPost[];
        chunkData.set(index, items);
        resubscribeProfiles();
      });
    });

    return () => {
      unsubscribes.forEach((unsub) => unsub());
      if (profileUnsub) profileUnsub();
    };
  }
  static async addReply(postId: string, data: { content: string }): Promise<string> {
    const now = Timestamp.now();
    const authorId = await FirestoreUserService.getCurrentUserId();
    const author = await FirestoreUserService.getUserById(authorId);
    const moderation = await moderateText(data.content || '');
    const docRef = await addDoc(collection(db, COLLECTIONS.COMMUNITY_COMMENTS), {
      postId,
      authorId,
      authorName: author?.displayName || 'ユーザー',
      authorAvatar: author?.photoURL,
      content: data.content,
      createdAt: now,
      updatedAt: now,
      moderation,
    });

    await this.updatePostReplyCount(postId, 1);
    return docRef.id;
  }

  static async deleteReply(replyId: string, postId: string): Promise<void> {
    const replyRef = doc(db, COLLECTIONS.COMMUNITY_COMMENTS, replyId);
    await deleteDoc(replyRef);
    await this.updatePostReplyCount(postId, -1);
  }

  static async deletePost(postId: string): Promise<void> {
    if (DISABLE_FIRESTORE) return;

    const postRef = doc(db, COLLECTIONS.COMMUNITY_POSTS, postId);
    const repliesQuery = query(
      collection(db, COLLECTIONS.COMMUNITY_COMMENTS),
      where('postId', '==', postId),
    );

    const repliesSnapshot = await getDocs(repliesQuery);
    const batch = writeBatch(db);
    repliesSnapshot.forEach((replyDoc) => {
      batch.delete(replyDoc.ref);
    });

    batch.delete(postRef);
    await batch.commit();
  }

  static async updatePostReplyCount(postId: string, delta: number): Promise<void> {
    const postRef = doc(db, COLLECTIONS.COMMUNITY_POSTS, postId);
    await updateDoc(postRef, {
      comments: increment(delta),
    });
  }

  static async getPostReplies(postId: string): Promise<CommunityComment[]> {
    const q = query(
      collection(db, COLLECTIONS.COMMUNITY_COMMENTS),
      where('postId', '==', postId),
      orderBy('createdAt', 'asc'),
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as CommunityComment[];
  }

  static subscribeToPostReplies(
    postId: string,
    callback: (replies: CommunityComment[]) => void,
  ): Unsubscribe {
    const q = query(
      collection(db, COLLECTIONS.COMMUNITY_COMMENTS),
      where('postId', '==', postId),
      orderBy('createdAt', 'asc'),
    );
    let base: CommunityComment[] = [];
    let unsubs: Unsubscribe | undefined;
    let blockedIds: Set<string> = new Set();
    let unsubscribeBlocks: Unsubscribe | undefined;

    const emit = (map?: Map<string, { displayName?: string; photoURL?: string } | undefined>) => {
      const filtered = base.filter((r) => !blockedIds.has(r.authorId));
      const merged = filtered.map((r) => {
        const prof = map?.get(r.authorId);
        return {
          ...r,
          authorName: prof?.displayName ?? r.authorName,
          authorAvatar: prof?.photoURL ?? r.authorAvatar,
        } as CommunityComment;
      });
      callback(merged);
    };

    const repliesUnsub = onSnapshot(q, (querySnapshot) => {
      base = querySnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as CommunityComment[];
      const ids = base.map((r) => r.authorId);
      if (unsubs) unsubs();
      unsubs = ProfileCache.getInstance().subscribeMany(ids, (m) => emit(m));
      emit();
    });

    void (async () => {
      try {
        const currentUserId = await FirestoreUserService.getCurrentUserId();
        unsubscribeBlocks = BlockService.subscribeBlockedIds(currentUserId, (ids) => {
          blockedIds = new Set(ids);
          emit();
        });
      } catch {
        // noop
      }
    })();

    return () => {
      repliesUnsub();
      if (unsubs) unsubs();
      if (unsubscribeBlocks) unsubscribeBlocks();
    };
  }

  static async toggleLike(postId: string): Promise<boolean> {
    const userId = await FirestoreUserService.getCurrentUserId();
    const likeDocId = `${userId}_${postId}`;
    const likeRef = doc(db, COLLECTIONS.COMMUNITY_LIKES, likeDocId);

    try {
      const likeDoc = await getDoc(likeRef);

      if (likeDoc.exists()) {
        await deleteDoc(likeRef);
        await this.updatePostLikeCount(postId, -1);
        return false;
      } else {
        await setDoc(likeRef, {
          userId,
          postId,
          createdAt: Timestamp.now(),
        });
        await this.updatePostLikeCount(postId, 1);
        return true;
      }
    } catch (error) {
      console.error('いいねの切り替えに失敗しました:', error);
      throw error;
    }
  }

  static async updatePostLikeCount(postId: string, incrementValue: number): Promise<void> {
    const postRef = doc(db, COLLECTIONS.COMMUNITY_POSTS, postId);
    await updateDoc(postRef, {
      likes: increment(incrementValue),
    });
  }

  static async isPostLikedByUser(postId: string, userId: string): Promise<boolean> {
    const likeDocId = `${userId}_${postId}`;
    const likeRef = doc(db, COLLECTIONS.COMMUNITY_LIKES, likeDocId);
    const likeDoc = await getDoc(likeRef);
    return likeDoc.exists();
  }
}


