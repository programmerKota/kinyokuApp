export class FirestoreError extends Error {
  constructor(
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = "FirestoreError";
  }
}

export const handleFirestoreError = (error: unknown): FirestoreError => {
  // keep console for diagnostics in dev
  // eslint-disable-next-line no-console
  console.error("Firestore Error:", error);

  const hasCode = (e: unknown): e is { code: string } =>
    typeof (e as { code?: unknown })?.code === "string";

  if (hasCode(error)) {
    switch (error.code) {
      case "permission-denied":
        return new FirestoreError("アクセス権限がありません", error.code);
      case "not-found":
        return new FirestoreError("データが見つかりません", error.code);
      case "already-exists":
        return new FirestoreError("データは既に存在します", error.code);
      case "resource-exhausted":
        return new FirestoreError("リソースが枯渇しています", error.code);
      case "unauthenticated":
        return new FirestoreError("認証が必要です", error.code);
      default:
        return new FirestoreError(
          "データベースエラーが発生しました",
          error.code,
        );
    }
  }

  return new FirestoreError("不明なエラーが発生しました");
};
