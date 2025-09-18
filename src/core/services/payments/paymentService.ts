import { Platform } from 'react-native';
import Purchases from 'react-native-purchases';

import { resolveProductId } from './products';

const RC_API_KEY = process.env.EXPO_PUBLIC_RC_API_KEY;
const DEV_MODE = process.env.EXPO_PUBLIC_PAYMENTS_DEV_MODE === 'true';

let configured = false;

async function ensureConfigured(): Promise<void> {
  if (configured) return;
  if (!RC_API_KEY) {
    if (DEV_MODE) return; // allow dev fallback without configuration
    throw new Error('RC_API_KEY_NOT_SET');
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
    if (amount <= 0) return { transactionId: 'noop', productId: undefined };

    const productId = resolveProductId(amount);
    if (!productId) {
      if (DEV_MODE) return { transactionId: `dev-${Date.now()}`, productId: 'dev_product' };
      throw new Error(`NO_PRODUCT_FOR_AMOUNT_${amount}`);
    }

    // Dev fallback: skip real purchase
    if (DEV_MODE && !RC_API_KEY) {
      return { transactionId: `dev-${Date.now()}`, productId };
    }

    await ensureConfigured();

    // Fetch product and purchase it
    const products = await Purchases.getProducts([productId] as any);
    if (!products || products.length === 0) {
      throw new Error('PRODUCT_NOT_AVAILABLE');
    }
    const product = products[0];

    const { customerInfo, productIdentifier, storefront, transaction } =
      (await Purchases.purchaseStoreProduct(product)) as any;

    const transactionId = (transaction && (transaction.transactionIdentifier || transaction.id)) ||
      (customerInfo && customerInfo.originalAppUserId) ||
      undefined;

    return {
      transactionId,
      productId: productIdentifier || productId,
    };
  }
}
