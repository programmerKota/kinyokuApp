import {
  collection,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  writeBatch,
  Timestamp,
} from "firebase/firestore";

import { db, COLLECTIONS } from "./firestore";
import type {
  StrictTournamentParticipant,
  StrictCommunityPost,
} from "../types/strict";

// バッチサイズの定数
const BATCH_SIZE = 500; // Firestoreの制限内
const QUERY_LIMIT = 100; // 一度に取得する最大件数

// 最適化されたクエリサービス
export class OptimizedFirestoreService {
  // 複数の大会の参加者を一括取得
  static async getMultipleTournamentParticipants(
    tournamentIds: string[],
  ): Promise<Record<string, StrictTournamentParticipant[]>> {
    if (tournamentIds.length === 0) return {};

    const result: Record<string, StrictTournamentParticipant[]> = {};

    // バッチサイズに分けて処理
    for (let i = 0; i < tournamentIds.length; i += BATCH_SIZE) {
      const batch = tournamentIds.slice(i, i + BATCH_SIZE);

      // 各大会の参加者を並列取得
      const promises = batch.map(async (tournamentId) => {
        try {
          const q = query(
            collection(db, COLLECTIONS.TOURNAMENT_PARTICIPANTS),
            where("tournamentId", "==", tournamentId),
            orderBy("joinedAt", "asc"),
          );
          const querySnapshot = await getDocs(q);
          const participants = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            joinedAt:
              doc.data().joinedAt?.toDate?.() || new Date(doc.data().joinedAt),
            leftAt: doc.data().leftAt?.toDate?.() || null,
          })) as StrictTournamentParticipant[];

          return { tournamentId, participants };
        } catch (error) {
          console.warn(
            `Failed to fetch participants for tournament ${tournamentId}:`,
            error,
          );
          return { tournamentId, participants: [] };
        }
      });

      const results = await Promise.allSettled(promises);

      results.forEach((result) => {
        if (result.status === "fulfilled") {
          result.value.participants.forEach((p) => {
            if (!result[result.value.tournamentId]) {
              result[result.value.tournamentId] = [];
            }
            result[result.value.tournamentId].push(p);
          });
        }
      });
    }

    return result;
  }

  // ページネーション対応の投稿取得
  static async getCommunityPostsPage(
    pageSize: number = QUERY_LIMIT,
    lastDoc?: any,
  ): Promise<{
    posts: StrictCommunityPost[];
    lastDoc?: any;
    hasMore: boolean;
  }> {
    const baseQuery = [
      orderBy("createdAt", "desc"),
      limit(pageSize + 1), // 1つ多く取得してhasMoreを判定
    ];

    if (lastDoc) {
      baseQuery.push(startAfter(lastDoc));
    }

    const q = query(collection(db, COLLECTIONS.COMMUNITY_POSTS), ...baseQuery);
    const querySnapshot = await getDocs(q);

    const posts = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt:
        doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
      updatedAt:
        doc.data().updatedAt?.toDate?.() || new Date(doc.data().updatedAt),
    })) as StrictCommunityPost[];

    const hasMore = posts.length > pageSize;
    const actualPosts = hasMore ? posts.slice(0, pageSize) : posts;
    const newLastDoc = hasMore ? querySnapshot.docs[pageSize - 1] : undefined;

    return {
      posts: actualPosts,
      lastDoc: newLastDoc,
      hasMore,
    };
  }

  // バッチ更新の最適化
  static async batchUpdateDocuments(
    updates: Array<{ collection: string; docId: string; data: any }>,
  ): Promise<void> {
    if (updates.length === 0) return;

    // Firestoreの制限（500件）に分けて処理
    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      const batchUpdates = updates.slice(i, i + BATCH_SIZE);

      batchUpdates.forEach(({ collection: coll, docId, data }) => {
        const docRef = doc(db, coll, docId);
        batch.update(docRef, {
          ...data,
          updatedAt: Timestamp.now(),
        });
      });

      await batch.commit();
    }
  }

  // インデックス最適化のためのクエリ
  static async getTournamentsWithParticipants(
    limitCount: number = QUERY_LIMIT,
  ): Promise<Array<{ tournament: any; participantCount: number }>> {
    const tournamentsQuery = query(
      collection(db, COLLECTIONS.TOURNAMENTS),
      orderBy("createdAt", "desc"),
      limit(limitCount),
    );

    const tournamentsSnapshot = await getDocs(tournamentsQuery);
    const tournaments = tournamentsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // 参加者数を一括取得
    const tournamentIds = tournaments.map((t) => t.id);
    const participantsMap =
      await this.getMultipleTournamentParticipants(tournamentIds);

    return tournaments.map((tournament) => ({
      tournament,
      participantCount: participantsMap[tournament.id]?.length || 0,
    }));
  }

  // キャッシュ対応のユーザー情報取得
  static async getUsersByIds(userIds: string[]): Promise<Record<string, any>> {
    if (userIds.length === 0) return {};

    const result: Record<string, any> = {};
    const uniqueUserIds = [...new Set(userIds)]; // 重複除去

    // バッチサイズに分けて処理
    for (let i = 0; i < uniqueUserIds.length; i += BATCH_SIZE) {
      const batch = uniqueUserIds.slice(i, i + BATCH_SIZE);

      const promises = batch.map(async (userId) => {
        try {
          const userDoc = await getDocs(
            query(
              collection(db, COLLECTIONS.USERS),
              where("__name__", "==", userId),
            ),
          );

          if (!userDoc.empty) {
            const userData = userDoc.docs[0].data();
            return { userId, userData };
          }
          return { userId, userData: null };
        } catch (error) {
          console.warn(`Failed to fetch user ${userId}:`, error);
          return { userId, userData: null };
        }
      });

      const results = await Promise.allSettled(promises);

      results.forEach((result) => {
        if (result.status === "fulfilled" && result.value.userData) {
          result[result.value.userId] = result.value.userData;
        }
      });
    }

    return result;
  }

  // 統計情報の一括取得
  static async getStats(): Promise<{
    totalUsers: number;
    totalTournaments: number;
    totalPosts: number;
    activeChallenges: number;
  }> {
    const [
      usersSnapshot,
      tournamentsSnapshot,
      postsSnapshot,
      challengesSnapshot,
    ] = await Promise.all([
      getDocs(collection(db, COLLECTIONS.USERS)),
      getDocs(collection(db, COLLECTIONS.TOURNAMENTS)),
      getDocs(collection(db, COLLECTIONS.COMMUNITY_POSTS)),
      getDocs(
        query(
          collection(db, COLLECTIONS.CHALLENGES),
          where("status", "==", "active"),
        ),
      ),
    ]);

    return {
      totalUsers: usersSnapshot.size,
      totalTournaments: tournamentsSnapshot.size,
      totalPosts: postsSnapshot.size,
      activeChallenges: challengesSnapshot.size,
    };
  }
}

export default OptimizedFirestoreService;

