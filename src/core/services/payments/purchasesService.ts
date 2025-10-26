import Constants from "expo-constants";
import { Platform } from "react-native";

import { revenuecatConfig } from "@app/config/revenuecat.config";
import { supabase } from "@app/config/supabase.config";

let configured = false;
const DEV_MODE = process.env.EXPO_PUBLIC_PAYMENTS_DEV_MODE === "true";
let MOCK_MODE = false; // true when no RC key is provided (graceful fallback)

const extra: Record<string, unknown> =
  (Constants?.expoConfig as unknown as { extra?: Record<string, unknown> })
    ?.extra ??
  (Constants as unknown as { manifestExtra?: Record<string, unknown> })
    ?.manifestExtra ??
  {};
const parseCsv = (v: unknown): string[] => {
  if (typeof v !== "string") return [];
  return v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
};
const FALLBACK_PRODUCT_IDS = parseCsv(
  extra.EXPO_PUBLIC_RC_FALLBACK_PRODUCT_IDS,
) || ["penalty_10", "penalty_100", "penalty_1000", "penalty_10000"];

async function ensureConfigured() {
  if (configured) return;
  // Avoid RevenueCat in Expo Go (SDK switches to Web Billing mode and requires a different key)
  const isExpoGo =
    (Constants as unknown as { appOwnership?: string })?.appOwnership ===
    "expo";
  if (Platform.OS === "web" || DEV_MODE || isExpoGo) {
    MOCK_MODE = true;
    configured = true;
    return;
  }
  const apiKey = Platform.select({
    ios: revenuecatConfig.iosPublicApiKey,
    android: revenuecatConfig.androidPublicApiKey,
  });
  if (!apiKey) {
    // Graceful fallback for local/dev environments without a configured key
    // Prevents crashing the app while allowing UI flows and mocks
    MOCK_MODE = true;
    configured = true;
    return;
  }
  const Purchases = (await import("react-native-purchases")).default;
  Purchases.setLogLevel(Purchases.LOG_LEVEL.WARN);
  Purchases.configure({ apiKey });
  try {
    const { data } = await supabase.auth.getSession();
    const uid = data?.session?.user?.id;
    if (uid) await Purchases.logIn(uid);
  } catch {}
  configured = true;
}

export type PenaltyPackage = {
  identifier: string;
  price: number;
  raw: unknown;
};

export const PurchasesService = {
  async registerUser(params: {
    uid: string;
    email?: string;
    displayName?: string;
    platform?: string;
  }): Promise<void> {
    await ensureConfigured();
    if (Platform.OS === "web" || DEV_MODE || MOCK_MODE) return;
    try {
      const Purchases = (await import("react-native-purchases")).default;
      // Ensure RC account is linked to our app user id
      await Purchases.logIn(params.uid);
      // Best-effort: set subscriber attributes
      const attrs: Record<string, string> = {};
      if (params.email) attrs.email = params.email;
      if (params.displayName) attrs.displayName = params.displayName;
      if (params.platform) attrs.platform = params.platform;
      if (
        Object.keys(attrs).length > 0 &&
        typeof Purchases.setAttributes === "function"
      ) {
        await Purchases.setAttributes(attrs);
      }
      try {
        const { PaymentFirestoreService } = await import(
          "../firestore/paymentService"
        );
        await PaymentFirestoreService.addPaymentLog({
          event: "register",
          status: "ok",
          userId: params.uid,
          platform: params.platform,
        });
      } catch {}
    } catch {
      // ignore failures; purchase flow will still work
    }
  },

  async getPenaltyPackage(targetJPY: number): Promise<PenaltyPackage | null> {
    await ensureConfigured();
    if (Platform.OS === "web" || DEV_MODE || MOCK_MODE) {
      return { identifier: "web-mock", price: targetJPY, raw: {} };
    }
    const Purchases = (await import("react-native-purchases")).default;

    // Try: Offerings → fallback to direct product lookup → final mock
    let list: Array<{ identifier: string; product?: { price: number } }> = [];
    try {
      const offerings = await Purchases.getOfferings();
      const all = (offerings?.all ?? {}) as Record<
        string,
        { availablePackages?: unknown[] }
      >;
      const off =
        all?.[revenuecatConfig.penaltyOfferingKey] ??
        offerings?.current ??
        null;
      list = (off?.availablePackages ?? []) as Array<{
        identifier: string;
        product: { price: number };
      }>;
    } catch {
      // ignore and fallback to direct product fetch below
    }

    if (!list?.length) {
      try {
        const productIds = FALLBACK_PRODUCT_IDS.length
          ? FALLBACK_PRODUCT_IDS
          : ["penalty_10", "penalty_100", "penalty_1000", "penalty_10000"];
        const products: Array<{ identifier: string; price: number }> =
          await Purchases.getProducts(productIds);
        if (!products?.length) {
          return {
            identifier: `mock_${targetJPY}`,
            price: targetJPY,
            raw: null,
          } as PenaltyPackage;
        }
        const candidates = products
          .map((prod) => ({
            id: prod.identifier,
            price: Number(prod.price) || 0,
            raw: prod,
          }))
          .sort((a, b) => a.price - b.price);
        const pick =
          candidates.find((c) => c.price >= targetJPY) ??
          candidates[candidates.length - 1];
        return {
          identifier: pick.id,
          price: pick.price,
          raw: pick.raw,
        } as PenaltyPackage;
      } catch {
        return {
          identifier: `mock_${targetJPY}`,
          price: targetJPY,
          raw: null,
        } as PenaltyPackage;
      }
    }
    type Candidate = { id: string; price: number; raw: unknown };
    const candidates: Candidate[] = (
      list as Array<{ identifier: string; product?: { price: number } }>
    ).map((pkg) => ({
      id: pkg.identifier,
      price: Number(pkg.product?.price) || 0,
      raw: pkg,
    }));
    const sorted = candidates.sort(
      (a: Candidate, b: Candidate) => a.price - b.price,
    );
    const found =
      sorted.find((c: Candidate) => c.price >= targetJPY) ??
      sorted[sorted.length - 1];
    return { identifier: found.id, price: found.price, raw: found.raw };
  },

  async purchase(p: PenaltyPackage): Promise<{
    success: boolean;
    transactionId?: string;
    productIdentifier?: string;
    cancelled?: boolean;
    errorCode?: string | number;
  }> {
    await ensureConfigured();
    if (Platform.OS === "web" || DEV_MODE || MOCK_MODE) {
      await new Promise((r) => setTimeout(r, 400));
      return {
        success: true,
        transactionId: "mock-tx",
        productIdentifier: p.identifier,
      };
    }
    const Purchases = (await import("react-native-purchases")).default;
    let result: unknown;
    try {
      if (p?.identifier?.startsWith?.("mock_") || !p?.raw) {
        // Simulated flow (no charge)
        await new Promise((r) => setTimeout(r, 400));
        return {
          success: true,
          transactionId: "mock-tx",
          productIdentifier: p.identifier,
        };
      }
      if (
        p?.raw &&
        typeof p.raw === "object" &&
        "product" in (p.raw as Record<string, unknown>)
      ) {
        // RevenueCat Package
        const pkg = p.raw as import("react-native-purchases").PurchasesPackage;
        result = await Purchases.purchasePackage(pkg);
      } else {
        // Fallback: purchase by product identifier
        result = await Purchases.purchaseProduct(p.identifier);
      }
    } catch (e: unknown) {
      // Distinguish user-cancel vs other errors when possible
      const cancelled = !!(
        (e as { userCancelled?: boolean })?.userCancelled ||
        (e as { code?: string | number })?.code ===
          "PURCHASE_CANCELLED_ERROR" ||
        (e as { code?: string | number })?.code === 1
      );
      return {
        success: false,
        transactionId: undefined,
        productIdentifier: p?.identifier,
        cancelled,
        errorCode: (e as { code?: string | number })?.code,
      };
    }
    const productIdentifier: string | undefined =
      (result as { productIdentifier?: string })?.productIdentifier ??
      p.identifier;
    // RevenueCat SDK does not expose a platform transaction id in all cases; store product id as reference
    const success = !!(result as { customerInfo?: unknown })?.customerInfo;
    return { success, transactionId: productIdentifier, productIdentifier };
  },

  async restore(): Promise<void> {
    await ensureConfigured();
    if (Platform.OS === "web" || DEV_MODE || MOCK_MODE) return;
    const Purchases = (await import("react-native-purchases")).default;
    await Purchases.restorePurchases();
  },
};

export default PurchasesService;
