import { renderHook, act } from "@testing-library/react-native";
import { Alert } from "react-native";

import { useErrorHandler } from "../useErrorHandler";

// Alert.alertをモック
jest.mock("react-native", () => ({
  Alert: {
    alert: jest.fn(),
  },
}));

// console.errorをモック
const mockConsoleError = jest
  .spyOn(console, "error")
  .mockImplementation(() => {});

describe("useErrorHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
  });

  it("should handle error with default options", () => {
    const { result } = renderHook(() => useErrorHandler());
    const error = new Error("Test error");
    const context = { component: "TestComponent", action: "testAction" };

    act(() => {
      result.current.handleError(error, context);
    });

    expect(Alert.alert).toHaveBeenCalledWith("エラー", "Test error");
    expect(mockConsoleError).toHaveBeenCalledWith(
      "[TestComponent] testAction:",
      error,
    );
  });

  it("should handle known error messages", () => {
    const { result } = renderHook(() => useErrorHandler());
    const context = { component: "TestComponent", action: "testAction" };

    const testCases = [
      {
        message: "ALREADY_ACTIVE",
        expected:
          "既に進行中のチャレンジがあります。停止してから開始してください。",
      },
      { message: "permission-denied", expected: "アクセス権限がありません" },
      { message: "not-found", expected: "データが見つかりません" },
      { message: "already-exists", expected: "データが既に存在します" },
      {
        message: "resource-exhausted",
        expected:
          "リソースが不足しています。しばらく待ってから再試行してください",
      },
      {
        message: "unauthenticated",
        expected: "認証が必要です。ログインし直してください",
      },
      {
        message: "network-error",
        expected: "ネットワークエラーが発生しました。接続を確認してください",
      },
    ];

    testCases.forEach(({ message, expected }) => {
      act(() => {
        result.current.handleError(new Error(message), context);
      });

      expect(Alert.alert).toHaveBeenCalledWith("エラー", expected);
    });
  });

  it("should use fallback message for unknown errors", () => {
    const { result } = renderHook(() => useErrorHandler());
    const error = new Error("Unknown error");
    const context = { component: "TestComponent", action: "testAction" };
    const options = { fallbackMessage: "カスタムエラーメッセージ" };

    act(() => {
      result.current.handleError(error, context, options);
    });

    expect(Alert.alert).toHaveBeenCalledWith("エラー", "Unknown error");
  });

  it("should use fallback message for generic error messages", () => {
    const { result } = renderHook(() => useErrorHandler());
    const error = new Error("Some Error occurred");
    const context = { component: "TestComponent", action: "testAction" };

    act(() => {
      result.current.handleError(error, context);
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      "エラー",
      "予期しないエラーが発生しました",
    );
  });

  it("should not show alert when showAlert is false", () => {
    const { result } = renderHook(() => useErrorHandler());
    const error = new Error("Test error");
    const context = { component: "TestComponent", action: "testAction" };
    const options = { showAlert: false };

    act(() => {
      result.current.handleError(error, context, options);
    });

    expect(Alert.alert).not.toHaveBeenCalled();
    expect(mockConsoleError).toHaveBeenCalledWith(
      "[TestComponent] testAction:",
      error,
    );
  });

  it("should not log error when logError is false", () => {
    const { result } = renderHook(() => useErrorHandler());
    const error = new Error("Test error");
    const context = { component: "TestComponent", action: "testAction" };
    const options = { logError: false };

    act(() => {
      result.current.handleError(error, context, options);
    });

    expect(Alert.alert).toHaveBeenCalledWith("エラー", "Test error");
    expect(mockConsoleError).not.toHaveBeenCalled();
  });

  it("should handle non-Error objects", () => {
    const { result } = renderHook(() => useErrorHandler());
    const error = "String error";
    const context = { component: "TestComponent", action: "testAction" };

    act(() => {
      result.current.handleError(error, context);
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      "エラー",
      "予期しないエラーが発生しました",
    );
  });

  it("should return error information", () => {
    const { result } = renderHook(() => useErrorHandler());
    const error = new Error("Test error");
    const context = { component: "TestComponent", action: "testAction" };

    let errorInfo;
    act(() => {
      errorInfo = result.current.handleError(error, context);
    });

    expect(errorInfo).toEqual({
      message: "Test error",
      context,
      timestamp: expect.any(String),
    });
  });

  it("should handle async errors", async () => {
    const { result } = renderHook(() => useErrorHandler());
    const context = { component: "TestComponent", action: "testAction" };
    const asyncFn = jest.fn().mockRejectedValue(new Error("Async error"));

    await act(async () => {
      await result.current.handleAsyncError(asyncFn, context);
    });

    expect(Alert.alert).toHaveBeenCalledWith("エラー", "Async error");
    expect(mockConsoleError).toHaveBeenCalledWith(
      "[TestComponent] testAction:",
      expect.any(Error),
    );
  });

  it("should not handle successful async operations", async () => {
    const { result } = renderHook(() => useErrorHandler());
    const context = { component: "TestComponent", action: "testAction" };
    const asyncFn = jest.fn().mockResolvedValue(undefined);

    await act(async () => {
      await result.current.handleAsyncError(asyncFn, context);
    });

    expect(Alert.alert).not.toHaveBeenCalled();
    expect(mockConsoleError).not.toHaveBeenCalled();
  });
});

