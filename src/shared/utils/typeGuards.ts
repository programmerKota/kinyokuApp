// 型ガード関数の定義
// ランタイムで型をチェックし、TypeScriptの型システムと連携

import type {
  StrictUser,
  StrictChallenge,
  StrictTournament,
  StrictCommunityPost,
} from "@project-types/strict";

// 基本的な型ガード
export const isString = (value: unknown): value is string => {
  return typeof value === "string";
};

export const isNumber = (value: unknown): value is number => {
  return typeof value === "number" && Number.isFinite(value as number);
};

export const isBoolean = (value: unknown): value is boolean => {
  return typeof value === "boolean";
};

export const isDate = (value: unknown): value is Date => {
  return value instanceof Date && !isNaN(value.getTime());
};

export const isObject = (value: unknown): value is Record<string, unknown> => {
  return value !== null && typeof value === "object" && !Array.isArray(value);
};

// 配列の型ガード
export const isStringArray = (value: unknown): value is string[] => {
  return Array.isArray(value) && value.every(isString);
};

export const isNumberArray = (value: unknown): value is number[] => {
  return Array.isArray(value) && value.every(isNumber);
};

// ユーザー関連の型ガード
export const isStrictUser = (value: unknown): value is StrictUser => {
  if (!isObject(value)) return false;

  return (
    isString(value.uid) &&
    isString(value.displayName) &&
    (value.avatarUrl === undefined || isString(value.avatarUrl)) &&
    isNumber(value.avatarVersion) &&
    isDate(value.createdAt) &&
    isDate(value.updatedAt)
  );
};

// チャレンジ関連の型ガード
export const isStrictChallenge = (value: unknown): value is StrictChallenge => {
  if (!isObject(value)) return false;

  return (
    isString(value.id) &&
    isString(value.userId) &&
    isNumber(value.goalDays) &&
    isNumber(value.penaltyAmount) &&
    isString(value.status) &&
    ["active", "completed", "failed", "paused"].includes(value.status) &&
    isDate(value.startedAt) &&
    (value.completedAt === null ||
      value.completedAt === undefined ||
      isDate(value.completedAt)) &&
    (value.failedAt === null ||
      value.failedAt === undefined ||
      isDate(value.failedAt)) &&
    isNumber(value.totalPenaltyPaid) &&
    isDate(value.createdAt) &&
    isDate(value.updatedAt)
  );
};

// 大会関連の型ガード
export const isStrictTournament = (
  value: unknown,
): value is StrictTournament => {
  if (!isObject(value)) return false;

  return (
    isString(value.id) &&
    isString(value.name) &&
    isString(value.description) &&
    isString(value.ownerId) &&
    isNumber(value.maxParticipants) &&
    isNumber(value.entryFee) &&
    isNumber(value.prizePool) &&
    isString(value.status) &&
    ["upcoming", "active", "completed", "cancelled"].includes(value.status) &&
    isBoolean(value.recruitmentOpen) &&
    isDate(value.startDate) &&
    isDate(value.endDate) &&
    isDate(value.createdAt) &&
    isDate(value.updatedAt)
  );
};

// コミュニティ投稿関連の型ガード
export const isStrictCommunityPost = (
  value: unknown,
): value is StrictCommunityPost => {
  if (!isObject(value)) return false;

  return (
    isString(value.id) &&
    isString(value.authorId) &&
    isString(value.authorName) &&
    (value.authorAvatar === undefined || isString(value.authorAvatar)) &&
    (value.title === undefined || isString(value.title)) &&
    isString(value.content) &&
    (value.imageUrl === undefined || isString(value.imageUrl)) &&
    isNumber(value.likes) &&
    isNumber(value.comments) &&
    isDate(value.createdAt) &&
    isDate(value.updatedAt)
  );
};

// エラー関連の型ガード
export const isError = (value: unknown): value is Error => {
  return value instanceof Error;
};

export const isStrictError = (
  value: unknown,
): value is { message: string; code?: string } => {
  return isObject(value) && isString(value.message);
};

// 配列の型ガード（ジェネリック）
export const isArrayOf = <T>(
  value: unknown,
  typeGuard: (item: unknown) => item is T,
): value is T[] => {
  return Array.isArray(value) && value.every(typeGuard);
};

// オプショナルな値の型ガード
export const isOptional = <T>(
  value: unknown,
  typeGuard: (item: unknown) => item is T,
): value is T | undefined => {
  return value === undefined || typeGuard(value);
};

// ユニオン型の型ガード
export const isOneOf = <T>(
  value: unknown,
  typeGuards: Array<(item: unknown) => item is T>,
): value is T => {
  return typeGuards.some((guard) => guard(value));
};

// 文字列リテラル型の型ガード
export const isStringLiteral = <T extends string>(
  value: unknown,
  literals: readonly T[],
): value is T => {
  return isString(value) && literals.includes(value as T);
};

// 数値範囲の型ガード
export const isNumberInRange = (
  value: unknown,
  min: number,
  max: number,
): value is number => {
  return isNumber(value) && value >= min && value <= max;
};

// 正の整数の型ガード
export const isPositiveInteger = (value: unknown): value is number => {
  return isNumber(value) && Number.isInteger(value) && value > 0;
};

// 非負の整数の型ガード
export const isNonNegativeInteger = (value: unknown): value is number => {
  return isNumber(value) && Number.isInteger(value) && value >= 0;
};

// 空でない文字列の型ガード
export const isNonEmptyString = (value: unknown): value is string => {
  return isString(value) && value.length > 0;
};

// 有効なURLの型ガード
export const isValidUrl = (value: unknown): value is string => {
  if (!isString(value)) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

// 有効なメールアドレスの型ガード
export const isValidEmail = (value: unknown): value is string => {
  if (!isString(value)) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
};
