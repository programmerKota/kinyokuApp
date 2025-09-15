import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  DocumentData,
  QuerySnapshot,
  Unsubscribe,
  setDoc,
  increment,
  writeBatch,
} from "firebase/firestore";
import { db } from "../config/firebase.config";
import ProfileCache from "./profileCache";
import { moderateText } from "./moderation";
import { CommunityComment } from "../types";
const DISABLE_FIRESTORE = process.env.EXPO_PUBLIC_DISABLE_FIRESTORE === "true";

// コレクション名の定数
export const COLLECTIONS = {
  USERS: "users",
  CHALLENGES: "challenges",
  TOURNAMENTS: "tournaments",
  TOURNAMENT_PARTICIPANTS: "tournamentParticipants",
  TOURNAMENT_MESSAGES: "tournamentMessages",
  COMMUNITY_POSTS: "communityPosts",
  COMMUNITY_COMMENTS: "communityComments",
  COMMUNITY_LIKES: "communityLikes",
  PAYMENTS: "payments",
  FOLLOWS: "follows",
} as const;

// 型定義
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
  status: "active" | "completed" | "failed" | "paused";
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
  status: "upcoming" | "active" | "completed" | "cancelled";
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
  status: "joined" | "left" | "kicked" | "completed" | "failed";
  joinedAt: Timestamp;
  leftAt?: Timestamp;
  progressPercent?: number;
  currentDay?: number;
}

export interface FirestoreTournamentMessage {
  id: string;
  tournamentId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  text: string;
  type: "text" | "system";
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
  id: string; // `${followerId}_${followeeId}`
  followerId: string;
  followeeId: string;
  createdAt: Timestamp;
}

// ユーザー関連のサービス（Firestore用）
export class FirestoreUserService {
  // 現在のユーザーIDを取得（UserServiceから）
  static async getCurrentUserId(): Promise<string> {
    const UserService = (await import("./userService")).default;
    const userService = UserService.getInstance();
    return await userService.getUserId();
  }

  // 現在のユーザー名を取得（UserServiceから）
  static async getCurrentUserName(): Promise<string> {
    const UserService = (await import("./userService")).default;
    const userService = UserService.getInstance();
    return await userService.getUserName();
  }

  // 現在のユーザーアバターを取得（UserServiceから）
  static async getCurrentUserAvatar(): Promise<string | undefined> {
    const UserService = (await import("./userService")).default;
    const userService = UserService.getInstance();
    return await userService.getAvatarUrl();
  }

  // users/{userId} を取得（表示は常にユーザーテーブルの最新を優先）
  static async getUserById(
    userId: string
  ): Promise<Pick<FirestoreUser, "displayName" | "photoURL"> | null> {
    try {
      if (DISABLE_FIRESTORE) {
        const UserService = (await import("./userService")).default;
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
        displayName: data.displayName ?? "ユーザー",
        photoURL: data.photoURL,
      };
    } catch (e) {
      console.warn("getUserById failed", e);
      return null;
    }
  }

  // users/{userId} を作成/更新
  static async setUserProfile(
    userId: string,
    profile: { displayName: string; photoURL?: string }
  ): Promise<void> {
    if (DISABLE_FIRESTORE) return; // ローカル専用モードでは何もしない
    const ref = doc(db, COLLECTIONS.USERS, userId);
    const now = Timestamp.now();
    await setDoc(
      ref,
      {
        displayName: profile.displayName,
        photoURL: profile.photoURL ?? null,
        updatedAt: now,
        createdAt: (await getDoc(ref)).exists() ? undefined : now,
      },
      { merge: true }
    );
  }
}

// チャレンジ関連のサービス
export class ChallengeService {
  static async createChallenge(
    challengeData: Omit<FirestoreChallenge, "id" | "createdAt" | "updatedAt">
  ): Promise<string> {
    // すでにアクティブなチャレンジが存在しないか事前チェック
    try {
      const activeQ = query(
        collection(db, COLLECTIONS.CHALLENGES),
        where("userId", "==", challengeData.userId),
        where("status", "==", "active"),
        limit(1)
      );
      const activeSnap = await getDocs(activeQ);
      if (!activeSnap.empty) {
        // 既に進行中のチャレンジがある場合はエラーを投げる
        throw new FirestoreError(
          "既に進行中のチャレンジがあります。停止してから開始してください。",
          "conflict"
        );
      }
    } catch (e) {
      // Firestore接続が不安定な場合でも二重作成を避けるため、明示的なconflictのみ伝播
      if (e instanceof FirestoreError && e.code === "conflict") throw e;
      // それ以外の読み取りエラーは、そのまま続行（オフライン時はSDKのローカルキューに委ねる）
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

  static async getUserChallenges(
    userId: string
  ): Promise<FirestoreChallenge[]> {
    const q = query(
      collection(db, COLLECTIONS.CHALLENGES),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        startedAt: data.startedAt?.toDate?.() || new Date(data.startedAt),
        completedAt: data.completedAt?.toDate?.() || null,
        failedAt: data.failedAt?.toDate?.() || null,
      };
    }) as FirestoreChallenge[];
  }

  static async updateChallenge(
    challengeId: string,
    challengeData: Partial<Omit<FirestoreChallenge, "id" | "createdAt">>
  ): Promise<void> {
    const docRef = doc(db, COLLECTIONS.CHALLENGES, challengeId);
    const updateData: any = {
      ...challengeData,
      updatedAt: Timestamp.now(),
    };

    // Date オブジェクトを Timestamp に変換
    if (challengeData.completedAt instanceof Date) {
      updateData.completedAt = Timestamp.fromDate(challengeData.completedAt);
    }
    if (challengeData.failedAt instanceof Date) {
      updateData.failedAt = Timestamp.fromDate(challengeData.failedAt);
    }

    await updateDoc(docRef, updateData);
  }

  /**
   * 安全に新規開始: 既存のアクティブがある場合はエラーにするヘルパー
   */
  static async safeStart(
    userId: string,
    data: Omit<FirestoreChallenge, "id" | "createdAt" | "updatedAt">
  ): Promise<string> {
    const exists = await this.getActiveChallenge(userId);
    if (exists) {
      throw new FirestoreError(
        "既に進行中のチャレンジがあります。停止してから開始してください。",
        "conflict"
      );
    }
    return await this.createChallenge(data);
  }

  static async getActiveChallenge(
    userId: string
  ): Promise<FirestoreChallenge | null> {
    const q = query(
      collection(db, COLLECTIONS.CHALLENGES),
      where("userId", "==", userId),
      where("status", "==", "active"),
      limit(1)
    );

    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return null;

    const doc = querySnapshot.docs[0];
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      startedAt: data.startedAt?.toDate?.() || new Date(data.startedAt),
      completedAt: data.completedAt?.toDate?.() || null,
      failedAt: data.failedAt?.toDate?.() || null,
    } as FirestoreChallenge;
  }

  // アクティブなチャレンジを購読
  static subscribeToActiveChallenge(
    userId: string,
    callback: (challenge: FirestoreChallenge | null) => void
  ): Unsubscribe {
    const q = query(
      collection(db, COLLECTIONS.CHALLENGES),
      where("userId", "==", userId),
      where("status", "==", "active"),
      limit(1)
    );

    return onSnapshot(
      q,
      (querySnapshot) => {
        if (querySnapshot.empty) {
          callback(null);
          return;
        }

        const doc = querySnapshot.docs[0];
        const data = doc.data();
        const challenge = {
          id: doc.id,
          ...data,
          startedAt: data.startedAt?.toDate?.() || new Date(data.startedAt),
          completedAt: data.completedAt?.toDate?.() || null,
          failedAt: data.failedAt?.toDate?.() || null,
        } as FirestoreChallenge;

        callback(challenge);
      },
      (error) => {
        console.warn("subscribeToActiveChallenge onSnapshot error:", error);
        // ネットワークエラー時もUIが固まらないよう、nullを通知
        try { callback(null); } catch {}
      }
    );
  }
}

// フォロー関連のサービス
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
      { merge: true }
    );
  }

  static async unfollow(targetUserId: string): Promise<void> {
    if (DISABLE_FIRESTORE) return;
    const currentUserId = await FirestoreUserService.getCurrentUserId();
    const id = `${currentUserId}_${targetUserId}`;
    const ref = doc(db, COLLECTIONS.FOLLOWS, id);
    await deleteDoc(ref);
  }

  // フォロー中のユーザーID一覧を取得
  static async getFollowingUserIds(followerId: string): Promise<string[]> {
    const q = query(
      collection(db, COLLECTIONS.FOLLOWS),
      where("followerId", "==", followerId)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => doc.data().followeeId);
  }

  // フォロー中のユーザーID一覧を購読
  static subscribeToFollowingUserIds(
    followerId: string,
    callback: (userIds: string[]) => void
  ): Unsubscribe {
    const q = query(
      collection(db, COLLECTIONS.FOLLOWS),
      where("followerId", "==", followerId)
    );
    return onSnapshot(q, (querySnapshot) => {
      const userIds = querySnapshot.docs.map((doc) => doc.data().followeeId);
      callback(userIds);
    });
  }

  // ユーザーをフォロー（既存のfollowメソッドのエイリアス）
  static async followUser(
    followerId: string,
    followeeId: string
  ): Promise<void> {
    const docId = `${followerId}_${followeeId}`;
    const docRef = doc(db, COLLECTIONS.FOLLOWS, docId);
    await setDoc(docRef, {
      followerId,
      followeeId,
      createdAt: Timestamp.now(),
    });
  }

  // ユーザーのフォローを解除（既存のunfollowメソッドのエイリアス）
  static async unfollowUser(
    followerId: string,
    followeeId: string
  ): Promise<void> {
    const docId = `${followerId}_${followeeId}`;
    const docRef = doc(db, COLLECTIONS.FOLLOWS, docId);
    await deleteDoc(docRef);
  }
}

// コミュニティ関連のサービス
export class CommunityService {
  // ユーザープロフィール更新に伴い、投稿/返信の冗長フィールドを一括更新
  static async reflectUserProfile(
    userId: string,
    displayName?: string,
    photoURL?: string
  ): Promise<void> {
    if (DISABLE_FIRESTORE) return;
    const updates: Array<Promise<void>> = [];

    const updateMany = async (
      coll: string,
      idField: "authorId" | "userId",
      nameField: string,
      avatarField: string
    ) => {
      const qy = query(collection(db, coll), where(idField, "==", userId));
      const snap = await getDocs(qy);
      const docs = snap.docs;
      const chunkSize = 400; // safety margin (< 500)
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
      updateMany(
        COLLECTIONS.COMMUNITY_POSTS,
        "authorId",
        "authorName",
        "authorAvatar"
      ),
      updateMany(
        COLLECTIONS.COMMUNITY_COMMENTS,
        "authorId",
        "authorName",
        "authorAvatar"
      ),
    ]);

    await Promise.allSettled(updates);
  }
  static async getUserPosts(userId: string): Promise<FirestoreCommunityPost[]> {
    const qy = query(
      collection(db, COLLECTIONS.COMMUNITY_POSTS),
      where("authorId", "==", userId),
      orderBy("createdAt", "desc")
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
    const m = await moderateText(data.content || "");
    const docRef = await addDoc(collection(db, COLLECTIONS.COMMUNITY_POSTS), {
      authorId,
      authorName: author?.displayName || "ユーザー",
      authorAvatar: author?.photoURL,
      title: "", // タイトルフィールドは空文字で固定
      content: data.content,
      imageUrl: null, // 画像機能は一旦無効化
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
    max: number = 200
  ): Unsubscribe {
    const useLimit = Number.isFinite(max) && (max as number) > 0;
    const qy = useLimit
      ? query(
          collection(db, COLLECTIONS.COMMUNITY_POSTS),
          orderBy("createdAt", "desc"),
          limit(max as number)
        )
      : query(collection(db, COLLECTIONS.COMMUNITY_POSTS), orderBy("createdAt", "desc"));
    let base: FirestoreCommunityPost[] = [];
    let unsubs: Unsubscribe | undefined;

    const emit = (
      map?: Map<string, { displayName?: string; photoURL?: string } | undefined>
    ) => {
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
      unsubs = ProfileCache.getInstance().subscribeMany(ids, (m) => {
        emit(m);
      });
      emit();
    });

    return () => {
      postsUnsub();
      if (unsubs) unsubs();
    };
  }

  // 特定のユーザーの投稿を購読
  static subscribeToUserPosts(
    userId: string,
    callback: (posts: FirestoreCommunityPost[]) => void,
    max: number = 200
  ): Unsubscribe {
    const useLimit = Number.isFinite(max) && (max as number) > 0;
    const qy = useLimit
      ? query(
          collection(db, COLLECTIONS.COMMUNITY_POSTS),
          where("authorId", "==", userId),
          orderBy("createdAt", "desc"),
          limit(max as number)
        )
      : query(
          collection(db, COLLECTIONS.COMMUNITY_POSTS),
          where("authorId", "==", userId),
          orderBy("createdAt", "desc")
        );
    // 作者は固定なので authorId のユーザーを常時監視してマージ
    let base: FirestoreCommunityPost[] = [];
    const emit = (displayName?: string, photoURL?: string) => {
      const merged = base.map((p) => ({
        ...p,
        authorName: displayName ?? p.authorName,
        authorAvatar: photoURL ?? p.authorAvatar,
      })) as FirestoreCommunityPost[];
      callback(merged);
    };

    const userUnsub = ProfileCache.getInstance().subscribe(userId, (p) => {
      emit(p?.displayName, p?.photoURL);
    });

    const postsUnsub = onSnapshot(qy, (qs) => {
      base = qs.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      })) as FirestoreCommunityPost[];
      emit();
    });

    return () => {
      postsUnsub();
      userUnsub();
    };
  }

  // フォロー中のユーザーの投稿を購読
  static subscribeToFollowingPosts(
    followingUserIds: string[],
    callback: (posts: FirestoreCommunityPost[]) => void,
    max: number = 200
  ): Unsubscribe {
    if (followingUserIds.length === 0) {
      callback([]);
      return () => {};
    }

    // Firestore の `in` は10件まで。チャンクに分けて購読し、マージする。
    const chunks: string[][] = [];
    for (let i = 0; i < followingUserIds.length; i += 10) {
      chunks.push(followingUserIds.slice(i, i + 10));
    }

    const useLimit = Number.isFinite(max) && (max as number) > 0;
    const unsubsList: Unsubscribe[] = [];
    let store = new Map<string, FirestoreCommunityPost>();
    let profileUnsub: Unsubscribe | undefined;

    const emit = (
      map?: Map<string, { displayName?: string; photoURL?: string } | undefined>
    ) => {
      let arr = Array.from(store.values());
      // 最新順
      arr.sort((a, b) => {
        const at = (a as any).createdAt?.toDate?.()?.getTime?.() ?? new Date(a.createdAt as any).getTime?.() ?? 0;
        const bt = (b as any).createdAt?.toDate?.()?.getTime?.() ?? new Date(b.createdAt as any).getTime?.() ?? 0;
        return bt - at;
      });
      if (useLimit) arr = arr.slice(0, max as number);
      const merged = arr.map((p) => {
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
      const ids = Array.from(new Set(Array.from(store.values()).map((p) => p.authorId)));
      if (profileUnsub) profileUnsub();
      profileUnsub = ProfileCache.getInstance().subscribeMany(ids, (m) => emit(m));
    };

    chunks.forEach((chunk) => {
      const qy = useLimit
        ? query(
            collection(db, COLLECTIONS.COMMUNITY_POSTS),
            where("authorId", "in", chunk),
            orderBy("createdAt", "desc"),
            limit(max as number)
          )
        : query(
            collection(db, COLLECTIONS.COMMUNITY_POSTS),
            where("authorId", "in", chunk),
            orderBy("createdAt", "desc")
          );
      const unsub = onSnapshot(qy, (qs) => {
        qs.docs.forEach((d) => {
          const v = { id: d.id, ...(d.data() as any) } as FirestoreCommunityPost;
          store.set(d.id, v);
        });
        resubscribeProfiles();
        emit();
      });
      unsubsList.push(unsub);
    });

    return () => {
      unsubsList.forEach((u) => u());
      if (profileUnsub) profileUnsub();
    };
  }

  // 返信を追加
  static async addReply(
    postId: string,
    data: { content: string }
  ): Promise<string> {
    const now = Timestamp.now();
    const authorId = await FirestoreUserService.getCurrentUserId();
    const author = await FirestoreUserService.getUserById(authorId);
    const m = await moderateText(data.content || "");

    const docRef = await addDoc(
      collection(db, COLLECTIONS.COMMUNITY_COMMENTS),
      {
        postId,
        authorId,
        authorName: author?.displayName || "ユーザー",
        authorAvatar: author?.photoURL,
        content: data.content,
        createdAt: now,
        updatedAt: now,
        moderation: {
          status: m.status,
          reasons: m.reasons,
          severity: m.severity,
          checkedAt: now,
          checkedBy: m.checkedBy,
        },
      }
    );

    // 投稿のコメント数を更新
    await this.updatePostCommentCount(postId, 1);

    return docRef.id;
  }

  // 投稿のコメント数を更新
  static async updatePostCommentCount(
    postId: string,
    delta: number
  ): Promise<void> {
    const postRef = doc(db, COLLECTIONS.COMMUNITY_POSTS, postId);
    await updateDoc(postRef, {
      comments: increment(delta),
    });
  }

  // 投稿の返信一覧を取得
  static async getPostReplies(postId: string): Promise<CommunityComment[]> {
    const q = query(
      collection(db, COLLECTIONS.COMMUNITY_COMMENTS),
      where("postId", "==", postId),
      orderBy("createdAt", "asc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as CommunityComment[];
  }

  // 投稿の返信一覧を購読
  static subscribeToPostReplies(
    postId: string,
    callback: (replies: CommunityComment[]) => void
  ): Unsubscribe {
    const q = query(
      collection(db, COLLECTIONS.COMMUNITY_COMMENTS),
      where("postId", "==", postId),
      orderBy("createdAt", "asc")
    );
    let base: CommunityComment[] = [];
    let unsubs: Unsubscribe | undefined;

    const emit = (
      map?: Map<string, { displayName?: string; photoURL?: string } | undefined>
    ) => {
      const merged = base.map((r) => {
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
      base = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as CommunityComment[];
      const ids = base.map((r) => r.authorId);
      if (unsubs) unsubs();
      unsubs = ProfileCache.getInstance().subscribeMany(ids, (m) => emit(m));
      emit();
    });

    return () => {
      repliesUnsub();
      if (unsubs) unsubs();
    };
  }

  // 投稿にいいねを追加/削除
  static async toggleLike(postId: string): Promise<boolean> {
    const userId = await FirestoreUserService.getCurrentUserId();
    const likeDocId = `${userId}_${postId}`;
    const likeRef = doc(db, COLLECTIONS.COMMUNITY_LIKES, likeDocId);

    try {
      const likeDoc = await getDoc(likeRef);

      if (likeDoc.exists()) {
        // いいねを削除
        await deleteDoc(likeRef);
        await this.updatePostLikeCount(postId, -1);
        return false; // いいね解除
      } else {
        // いいねを追加
        await setDoc(likeRef, {
          userId,
          postId,
          createdAt: Timestamp.now(),
        });
        await this.updatePostLikeCount(postId, 1);
        return true; // いいね追加
      }
    } catch (error) {
      console.error("いいねの切り替えに失敗しました:", error);
      throw error;
    }
  }

  // 投稿のいいね数を更新
  static async updatePostLikeCount(
    postId: string,
    incrementValue: number
  ): Promise<void> {
    const postRef = doc(db, COLLECTIONS.COMMUNITY_POSTS, postId);
    await updateDoc(postRef, {
      likes: increment(incrementValue),
    });
  }

  // ユーザーが投稿にいいねしているかチェック
  static async isPostLikedByUser(
    postId: string,
    userId: string
  ): Promise<boolean> {
    const likeDocId = `${userId}_${postId}`;
    const likeRef = doc(db, COLLECTIONS.COMMUNITY_LIKES, likeDocId);
    const likeDoc = await getDoc(likeRef);
    return likeDoc.exists();
  }
}

// 大会関連のサービス
export class TournamentService {
  // ユーザープロフィール更新に伴い、大会関連の冗長フィールドを一括更新
  static async reflectUserProfile(
    userId: string,
    displayName?: string,
    photoURL?: string
  ): Promise<void> {
    if (DISABLE_FIRESTORE) return;

    const updates: Array<Promise<void>> = [];
    const updateMany = async (
      coll: string,
      idField: "userId" | "authorId",
      nameField: string,
      avatarField: string
    ) => {
      const qy = query(collection(db, coll), where(idField, "==", userId));
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
      updateMany(
        COLLECTIONS.TOURNAMENT_PARTICIPANTS,
        "userId",
        "userName",
        "userAvatar"
      ),
      updateMany(
        COLLECTIONS.TOURNAMENT_MESSAGES,
        "authorId",
        "authorName",
        "authorAvatar"
      ),
    ]);

    await Promise.allSettled(updates);
  }
  static async createTournament(
    tournamentData: Omit<FirestoreTournament, "id" | "createdAt" | "updatedAt">
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
    const q = query(
      collection(db, COLLECTIONS.TOURNAMENTS),
      orderBy("createdAt", "desc")
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as FirestoreTournament[];
  }

  static async getTournament(
    tournamentId: string
  ): Promise<FirestoreTournament | null> {
    const docRef = doc(db, COLLECTIONS.TOURNAMENTS, tournamentId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as FirestoreTournament;
    }
    return null;
  }

  // 大会を削除（主催者のみ）
  static async deleteTournament(tournamentId: string): Promise<void> {
    const t = await this.getTournament(tournamentId);
    if (!t) throw new FirestoreError("大会が見つかりません", "not-found");
    const uid = await FirestoreUserService.getCurrentUserId();
    if (t.ownerId !== uid)
      throw new FirestoreError("削除権限がありません", "permission-denied");

    // 付随データ（参加者・メッセージ）を削除
    const partsQ = query(
      collection(db, COLLECTIONS.TOURNAMENT_PARTICIPANTS),
      where("tournamentId", "==", tournamentId)
    );
    const msgsQ = query(
      collection(db, COLLECTIONS.TOURNAMENT_MESSAGES),
      where("tournamentId", "==", tournamentId)
    );

    const [partsSnap, msgsSnap] = await Promise.all([
      getDocs(partsQ),
      getDocs(msgsQ),
    ]);

    const ops: Promise<void>[] = [];
    partsSnap.forEach((d) => ops.push(deleteDoc(d.ref)));
    msgsSnap.forEach((d) => ops.push(deleteDoc(d.ref)));
    ops.push(deleteDoc(doc(db, COLLECTIONS.TOURNAMENTS, tournamentId)));
    await Promise.all(ops);
  }

  static async joinTournament(
    tournamentId: string,
    userId?: string,
    userName?: string,
    userAvatar?: string
  ): Promise<string> {
    const now = Timestamp.now();
    const docRef = await addDoc(
      collection(db, COLLECTIONS.TOURNAMENT_PARTICIPANTS),
      {
        tournamentId,
        userId: userId || (await FirestoreUserService.getCurrentUserId()),
        userName: userName || (await FirestoreUserService.getCurrentUserName()),
        userAvatar:
          userAvatar || (await FirestoreUserService.getCurrentUserAvatar()),
        status: "joined",
        joinedAt: now,
      }
    );
    return docRef.id;
  }

  // 参加者を退会させる（主催者のみ）
  static async kickParticipant(
    tournamentId: string,
    targetUserId: string
  ): Promise<void> {
    const t = await this.getTournament(tournamentId);
    if (!t) throw new FirestoreError("大会が見つかりません", "not-found");
    const uid = await FirestoreUserService.getCurrentUserId();
    if (t.ownerId !== uid)
      throw new FirestoreError("操作権限がありません", "permission-denied");
    if (targetUserId === t.ownerId) return; // オーナーは退会させない

    const qy = query(
      collection(db, COLLECTIONS.TOURNAMENT_PARTICIPANTS),
      where("tournamentId", "==", tournamentId),
      where("userId", "==", targetUserId)
    );
    const snap = await getDocs(qy);
    const ops: Promise<void>[] = [];
    snap.forEach((d) => ops.push(deleteDoc(d.ref)));
    await Promise.all(ops);
  }

  static async getTournamentParticipants(
    tournamentId: string
  ): Promise<FirestoreTournamentParticipant[]> {
    const q = query(
      collection(db, COLLECTIONS.TOURNAMENT_PARTICIPANTS),
      where("tournamentId", "==", tournamentId),
      orderBy("joinedAt", "asc")
    );

    const querySnapshot = await getDocs(q);
    const base = querySnapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as FirestoreTournamentParticipant[];

    // usersテーブルで上書き（表示は常に最新）
    const merged = await Promise.all(
      base.map(async (p) => {
        const u = await FirestoreUserService.getUserById(p.userId);
        return {
          ...p,
          userName: u?.displayName ?? p.userName,
          userAvatar: u?.photoURL ?? p.userAvatar,
        } as FirestoreTournamentParticipant;
      })
    );
    return merged;
  }

  static async sendMessage(
    tournamentId: string,
    authorId?: string,
    authorName?: string,
    text?: string,
    authorAvatar?: string
  ): Promise<string> {
    const now = Timestamp.now();
    const m = await moderateText(text || "");
    const docRef = await addDoc(
      collection(db, COLLECTIONS.TOURNAMENT_MESSAGES),
      {
        tournamentId,
        authorId: authorId || (await FirestoreUserService.getCurrentUserId()),
        authorName:
          authorName || (await FirestoreUserService.getCurrentUserName()),
        authorAvatar:
          authorAvatar || (await FirestoreUserService.getCurrentUserAvatar()),
        text: text || "",
        type: "text",
        createdAt: now,
        moderation: {
          status: m.status,
          reasons: m.reasons,
          severity: m.severity,
          checkedAt: now,
          checkedBy: m.checkedBy,
        },
      }
    );
    return docRef.id;
  }

  static subscribeToMessages(
    tournamentId: string,
    callback: (messages: FirestoreTournamentMessage[]) => void
  ): Unsubscribe {
    const q = query(
      collection(db, COLLECTIONS.TOURNAMENT_MESSAGES),
      where("tournamentId", "==", tournamentId),
      orderBy("createdAt", "asc")
    );
    let base: FirestoreTournamentMessage[] = [];
    let unsubs: Unsubscribe | undefined;

    const emit = (
      map?: Map<string, { displayName?: string; photoURL?: string } | undefined>
    ) => {
      const merged = base.map((m) => {
        const prof = map?.get(m.authorId);
        return {
          ...m,
          authorName: prof?.displayName ?? m.authorName,
          authorAvatar: prof?.photoURL ?? m.authorAvatar,
        } as FirestoreTournamentMessage;
      });
      callback(merged);
    };

    const msgsUnsub = onSnapshot(
      q,
      (querySnapshot: QuerySnapshot<DocumentData>) => {
        base = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as FirestoreTournamentMessage[];
        const ids = base.map((m) => m.authorId);
        if (unsubs) unsubs();
        unsubs = ProfileCache.getInstance().subscribeMany(ids, (m) => emit(m));
        emit();
      }
    );

    return () => {
      msgsUnsub();
      if (unsubs) unsubs();
    };
  }

  // 大会一覧の購読
  static subscribeToTournaments(
    callback: (tournaments: FirestoreTournament[]) => void
  ): Unsubscribe {
    const qy = query(
      collection(db, COLLECTIONS.TOURNAMENTS),
      orderBy("createdAt", "desc")
    );
    return onSnapshot(qy, (qs) => {
      const items = qs.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as FirestoreTournament[];
      callback(items);
    });
  }

  // 参加者の購読（usersテーブルで上書きして返す）
  static subscribeToParticipants(
    tournamentId: string,
    callback: (participants: FirestoreTournamentParticipant[]) => void
  ): Unsubscribe {
    const qy = query(
      collection(db, COLLECTIONS.TOURNAMENT_PARTICIPANTS),
      where("tournamentId", "==", tournamentId),
      orderBy("joinedAt", "asc")
    );
    let base: FirestoreTournamentParticipant[] = [];
    let unsubs: Unsubscribe | undefined;

    const emit = (
      map?: Map<string, { displayName?: string; photoURL?: string } | undefined>
    ) => {
      const merged = base.map((p) => {
        const prof = map?.get(p.userId);
        return {
          ...p,
          userName: prof?.displayName ?? p.userName,
          userAvatar: prof?.photoURL ?? p.userAvatar,
        } as FirestoreTournamentParticipant;
      });
      callback(merged);
    };

    const partUnsub = onSnapshot(qy, (qs) => {
      base = qs.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as FirestoreTournamentParticipant[];
      const ids = base.map((p) => p.userId);
      if (unsubs) unsubs();
      unsubs = ProfileCache.getInstance().subscribeMany(ids, (m) => emit(m));
      emit();
    });

    return () => {
      partUnsub();
      if (unsubs) unsubs();
    };
  }
}

// エラーハンドリング用のユーティリティ
export class FirestoreError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = "FirestoreError";
  }
}

// エラーハンドリング用のラッパー関数
export const handleFirestoreError = (error: any): FirestoreError => {
  console.error("Firestore Error:", error);

  if (error.code) {
    switch (error.code) {
      case "permission-denied":
        return new FirestoreError("アクセス権限がありません", error.code);
      case "not-found":
        return new FirestoreError("データが見つかりません", error.code);
      case "already-exists":
        return new FirestoreError("データが既に存在します", error.code);
      case "resource-exhausted":
        return new FirestoreError("リソースが不足しています", error.code);
      case "unauthenticated":
        return new FirestoreError("認証が必要です", error.code);
      default:
        return new FirestoreError(
          "データベースエラーが発生しました",
          error.code
        );
    }
  }

  return new FirestoreError("不明なエラーが発生しました");
};
