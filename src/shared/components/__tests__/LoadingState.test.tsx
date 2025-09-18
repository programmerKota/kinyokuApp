import { render } from "@testing-library/react-native";
import React from "react";

import LoadingState from "../LoadingState";

describe("LoadingState", () => {
  it("should render with default props", () => {
    const { getByText, getByTestId } = render(<LoadingState />);

    expect(getByText("読み込み中...")).toBeTruthy();
    expect(getByTestId("loading-activity-indicator")).toBeTruthy();
  });

  it("should render with custom message", () => {
    const { getByText } = render(<LoadingState message="カスタムメッセージ" />);

    expect(getByText("カスタムメッセージ")).toBeTruthy();
  });

  it("should render without message", () => {
    const { queryByText } = render(<LoadingState message="" />);

    expect(queryByText("読み込み中...")).toBeFalsy();
  });

  it("should render with different variants", () => {
    const variants = ["default", "overlay", "inline", "minimal"] as const;

    variants.forEach((variant) => {
      const { getByTestId } = render(
        <LoadingState variant={variant} testID="loading-activity-indicator" />,
      );

      expect(getByTestId("loading-activity-indicator")).toBeTruthy();
    });
  });

  it("should render with different sizes", () => {
    const { getByTestId: getByTestIdSmall } = render(
      <LoadingState size="small" testID="loading-activity-indicator" />,
    );
    const { getByTestId: getByTestIdLarge } = render(
      <LoadingState size="large" testID="loading-activity-indicator" />,
    );

    expect(getByTestIdSmall("loading-activity-indicator")).toBeTruthy();
    expect(getByTestIdLarge("loading-activity-indicator")).toBeTruthy();
  });

  it("should render with custom color", () => {
    const { getByTestId } = render(
      <LoadingState color="#FF0000" testID="loading-activity-indicator" />,
    );

    expect(getByTestId("loading-activity-indicator")).toBeTruthy();
  });

  it("should apply custom style", () => {
    const customStyle = { backgroundColor: "#F0F0F0" };
    const { getByTestId } = render(
      <LoadingState style={customStyle} testID="loading-container" />,
    );

    const container = getByTestId("loading-container");
    expect(container).toBeTruthy();
  });

  it("should render minimal variant with smaller text", () => {
    const { getByText } = render(
      <LoadingState variant="minimal" message="最小表示" />,
    );

    expect(getByText("最小表示")).toBeTruthy();
  });

  it("should render overlay variant", () => {
    const { getByTestId } = render(
      <LoadingState variant="overlay" testID="loading-container" />,
    );

    const container = getByTestId("loading-container");
    expect(container).toBeTruthy();
  });
});
