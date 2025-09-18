import type { CommunityPost } from "@project-types";
import type { FirestoreCommunityPost } from "@core/services/firestore/types";

// Accepts either UI-level CommunityPost or FirestoreCommunityPost and
// returns the same shape with safe numeric fields.
export function normalizeCommunityPosts<T extends { id: string; likes?: number; comments?: number }>(
  list: T[],
): T[] {
  return list.map((p) => ({
    ...p,
    likes: Math.max(0, p.likes || 0),
    comments: Math.max(0, p.comments || 0),
  })) as T[];
}

// Build a reply count map keyed by post id using the redundant `comments` field.
export function buildReplyCountMapFromPosts<T extends { id: string; comments?: number }>(
  list: T[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const p of list) {
    map.set(p.id, p.comments || 0);
  }
  return map;
}

// Update likes count in a list immutably for a given post id
export function toggleLikeInList<T extends { id: string; likes: number }>(
  list: T[],
  postId: string,
  isLiked: boolean,
): T[] {
  return list.map((p) =>
    p.id === postId ? { ...p, likes: isLiked ? p.likes + 1 : Math.max(0, p.likes - 1) } : p,
  ) as T[];
}

// Immutable map increment helper
export function incrementCountMap<K>(
  map: Map<K, number>,
  key: K,
  delta = 1,
): Map<K, number> {
  const next = new Map(map);
  next.set(key, (next.get(key) || 0) + delta);
  return next;
}

// Type helpers for clarity when the caller wants explicit types
export const normalizeCommunityPostsUI = (
  list: CommunityPost[],
): CommunityPost[] => normalizeCommunityPosts(list);

export const normalizeCommunityPostsFirestore = (
  list: FirestoreCommunityPost[],
): FirestoreCommunityPost[] => normalizeCommunityPosts(list);
