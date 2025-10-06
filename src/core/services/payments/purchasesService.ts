import { Platform } from 'react-native';
import { supabase } from '@app/config/supabase.config';
import { revenuecatConfig } from '@app/config/revenuecat.config';

let configured = false;
const DEV_MODE = process.env.EXPO_PUBLIC_PAYMENTS_DEV_MODE === 'true';

async function ensureConfigured() {
  if (configured) return;
  if (Platform.OS === 'web' || DEV_MODE) { configured = true; return; }
  const Purchases = (await import('react-native-purchases')).default;
  const apiKey = Platform.select({ ios: revenuecatConfig.iosPublicApiKey, android: revenuecatConfig.androidPublicApiKey });
  if (!apiKey) throw new Error('REVENUECAT_PUBLIC_API_KEY is not set');
  Purchases.setLogLevel(Purchases.LOG_LEVEL.WARN);
  Purchases.configure({ apiKey });
  try {
    const { data } = await supabase.auth.getSession();
    const uid = data?.session?.user?.id as string | undefined;
    if (uid) await Purchases.logIn(uid);
  } catch { }
  configured = true;
}

export type PenaltyPackage = { identifier: string; price: number; raw: any };

export const PurchasesService = {
  async getPenaltyPackage(targetJPY: number): Promise<PenaltyPackage | null> {
    await ensureConfigured();
    if (Platform.OS === 'web' || DEV_MODE) {
      return { identifier: 'web-mock', price: targetJPY, raw: {} };
    }
    const Purchases = (await import('react-native-purchases')).default;
    const offerings = await Purchases.getOfferings();
    // use current offering, fallback to explicitly named 'penalty'
    const off = (offerings?.current as any) ?? (offerings?.all as any)?.penalty ?? null;
    const list = off?.availablePackages ?? [];
    if (!list.length) return null;
    type Candidate = { id: string; price: number; raw: any };
    const candidates: Candidate[] = list.map((pkg: any) => ({ id: pkg.identifier, price: pkg.product.price, raw: pkg }));
    const sorted = candidates.sort((a: Candidate, b: Candidate) => a.price - b.price);
    const found = sorted.find((c: Candidate) => c.price >= targetJPY) ?? sorted[sorted.length - 1];
    return { identifier: found.id, price: found.price, raw: found.raw };
  },

  async purchase(p: PenaltyPackage): Promise<boolean> {
    await ensureConfigured();
    if (Platform.OS === 'web' || DEV_MODE) { await new Promise((r) => setTimeout(r, 400)); return true; }
    const Purchases = (await import('react-native-purchases')).default;
    const { customerInfo } = await Purchases.purchasePackage(p.raw);
    return !!customerInfo;
  },

  async restore(): Promise<void> {
    await ensureConfigured();
    if (Platform.OS === 'web' || DEV_MODE) return;
    const Purchases = (await import('react-native-purchases')).default;
    await Purchases.restorePurchases();
  },
};

export default PurchasesService;
