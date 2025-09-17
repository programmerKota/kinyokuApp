import { useCallback } from "react";
import { Alert } from "react-native";

export interface ErrorContext {
  component: string;
  action: string;
  userId?: string;
}

export interface ErrorHandlerOptions {
  showAlert?: boolean;
  logError?: boolean;
  fallbackMessage?: string;
}

export const useErrorHandler = () => {
  const handleError = useCallback(
    (
      error: unknown,
      context: ErrorContext,
      options: ErrorHandlerOptions = {},
    ) => {
      const {
        showAlert = true,
        logError = true,
        fallbackMessage = "予期しないエラーが発生しました",
      } = options;

      // エラーログの出力
      if (logError) {
        console.error(`[${context.component}] ${context.action}:`, error);
      }

      // ユーザーへの通知
      if (showAlert) {
        let message = fallbackMessage;

        if (error instanceof Error) {
          // 既知のエラーメッセージのマッピング
          switch (error.message) {
            case "ALREADY_ACTIVE":
              message =
                "既に進行中のチャレンジがあります。停止してから開始してください。";
              break;
            case "permission-denied":
              message = "アクセス権限がありません";
              break;
            case "not-found":
              message = "データが見つかりません";
              break;
            case "already-exists":
              message = "データが既に存在します";
              break;
            case "resource-exhausted":
              message =
                "リソースが不足しています。しばらく待ってから再試行してください";
              break;
            case "unauthenticated":
              message = "認証が必要です。ログインし直してください";
              break;
            case "network-error":
              message =
                "ネットワークエラーが発生しました。接続を確認してください";
              break;
            default:
              // エラーメッセージが日本語でない場合は、フォールバックメッセージを使用
              if (
                error.message.includes("Error") ||
                error.message.includes("error")
              ) {
                message = fallbackMessage;
              } else {
                message = error.message;
              }
          }
        }

        Alert.alert("エラー", message);
      }

      return {
        message: error instanceof Error ? error.message : "Unknown error",
        context,
        timestamp: new Date().toISOString(),
      };
    },
    [],
  );

  const handleAsyncError = useCallback(
    async (
      asyncFn: () => Promise<void>,
      context: ErrorContext,
      options: ErrorHandlerOptions = {},
    ) => {
      try {
        await asyncFn();
      } catch (error) {
        return handleError(error, context, options);
      }
    },
    [handleError],
  );

  return {
    handleError,
    handleAsyncError,
  };
};

export default useErrorHandler;

