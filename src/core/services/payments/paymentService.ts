import { resolveProductId } from "./products";

const RC_API_KEY = process.env.EXPO_PUBLIC_RC_API_KEY;
const DEV_MODE = process.env.EXPO_PUBLIC_PAYMENTS_DEV_MODE === "true";

// Lazily load native module so Expo Go can run without it
let PurchasesModule: unknown = null;
async function getPurchases() {
  if (PurchasesModule) return PurchasesModule;
  // Only attempt to load when we actually need native IAP
  try {
    const mod = await import("react-native-purchases");
    PurchasesModule = (mod as any)?.default ?? mod;
    return PurchasesModule;
  } catch (e) {
    // In dev fallback, allow running without the native module
    if (DEV_MODE) return null;
    throw e;
  }
}

let configured = false;

async function ensureConfigured(): Promise<void> {
  if (configured) return;
  if (!RC_API_KEY) {
    if (DEV_MODE) return; // allow dev fallback without configuration
    throw new Error("RC_API_KEY_NOT_SET");
  }
  const Purchases: any = await getPurchases();
  if (!Purchases) {
    // Should not happen when RC_API_KEY is set in non-dev mode
    throw new Error("PURCHASES_MODULE_NOT_AVAILABLE");
  }
  await Purchases.configure({ apiKey: RC_API_KEY });
  configured = true;
}

export interface PaymentResult {
  transactionId?: string;
  productId?: string;
}

export class PaymentService {
  static async payPenalty(amount: number): Promise<PaymentResult> {
    if (amount <= 0) return { transactionId: "noop", productId: undefined };

    const productId = resolveProductId(amount);
    if (!productId) {
      if (DEV_MODE)
        return { transactionId: `dev-${Date.now()}`, productId: "dev_product" };
      throw new Error(`NO_PRODUCT_FOR_AMOUNT_${amount}`);
    }

    // Dev fallback: skip real purchase
    if (DEV_MODE && !RC_API_KEY) {
      return { transactionId: `dev-${Date.now()}`, productId };
    }

    await ensureConfigured();

    // Fetch product and purchase it
    const Purchases = await getPurchases();
    if (!Purchases) {
      throw new Error("PURCHASES_MODULE_NOT_AVAILABLE");
    }
    const products = await Purchases.getProducts([productId] as any);
    if (!products || products.length === 0) {
      throw new Error("PRODUCT_NOT_AVAILABLE");
    }
    const product = products[0];

    const { customerInfo, productIdentifier, transaction } =
      await Purchases.purchaseStoreProduct(product);

    const transactionId =
      (transaction && (transaction.transactionIdentifier || transaction.id)) ||
      (customerInfo && customerInfo.originalAppUserId) ||
      undefined;

    return {
      transactionId,
      productId: productIdentifier || productId,
    };
  }
}
