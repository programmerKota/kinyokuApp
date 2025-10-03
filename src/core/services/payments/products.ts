import { Platform } from "react-native";

// Map penalty amount (JPY) -> Store product identifier
// NOTE: You must create matching in‑app products in App Store / Play Console
// and connect them to RevenueCat with the same identifiers.
export const PRODUCTS_BY_AMOUNT: Record<
  "ios" | "android",
  Record<number, string>
> = {
  ios: {
    10: "penalty_10",
    100: "penalty_100",
    300: "penalty_300",
    500: "penalty_500",
    1000: "penalty_1000",
    10000: "penalty_10000",
  },
  android: {
    10: "penalty_10",
    100: "penalty_100",
    300: "penalty_300",
    500: "penalty_500",
    1000: "penalty_1000",
    10000: "penalty_10000",
  },
};

export function resolveProductId(amount: number): string | undefined {
  const map = PRODUCTS_BY_AMOUNT[Platform.OS === "ios" ? "ios" : "android"];
  return map[amount];
}
