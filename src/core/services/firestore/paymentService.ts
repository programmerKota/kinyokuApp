import { supabase } from "@app/config/supabase.config";

import { COLLECTIONS } from "./constants";
import type { FirestorePayment } from "./types";

export class PaymentFirestoreService {
  static async addPayment(
    data: Omit<FirestorePayment, "id" | "createdAt" | "updatedAt">,
  ) {
    const now = new Date().toISOString();
    const { data: inserted, error } = await supabase
      .from(COLLECTIONS.PAYMENTS)
      .insert({
        ...data,
        createdAt: now,
        updatedAt: now,
      })
      .select("id")
      .single<{ id: string }>();
    if (error) throw error;
    if (!inserted) throw new Error("payment insert failed");
    return inserted.id;
  }

  static async getUserPayments(userId: string): Promise<FirestorePayment[]> {
    const uid =
      ((
        await (
          await import("@app/config/supabase.config")
        ).supabase.auth.getSession()
      ).data?.session?.user?.id as string | undefined) || userId;
    const { data, error } = await (
      await import("@app/config/supabase.config")
    ).supabase
      .from(COLLECTIONS.PAYMENTS)
      .select("*")
      .eq("userId", uid)
      .order("createdAt", { ascending: false });
    if (error) throw error;
    const list = (data || []).map((d) => ({
      ...(d as Record<string, unknown>),
      createdAt: (d as { createdAt?: string | Date }).createdAt
        ? new Date((d as { createdAt?: string | Date }).createdAt as string | Date)
        : undefined,
      updatedAt: (d as { updatedAt?: string | Date }).updatedAt
        ? new Date((d as { updatedAt?: string | Date }).updatedAt as string | Date)
        : undefined,
    })) as FirestorePayment[];
    return list;
  }

  static async addPaymentLog(data: {
    userId?: string;
    event: string; // 'purchase' | 'restore' | 'show' | 'error'
    status: string; // 'success' | 'error' | 'cancel'
    amount?: number;
    productId?: string;
    platform?: string;
    transactionId?: string;
    errorCode?: string;
    errorMessage?: string;
    raw?: unknown;
  }): Promise<void> {
    try {
      const uid =
        data.userId ||
        (
          await (
            await import("@app/config/supabase.config")
          ).supabase.auth.getSession()
        ).data?.session?.user?.id;
      if (!uid) return;
      await (await import("@app/config/supabase.config")).supabase
        .from("payment_logs")
        .insert({
          userId: uid,
          event: data.event,
          status: data.status,
          amount: data.amount ?? null,
          productId: data.productId ?? null,
          platform: data.platform ?? null,
          transactionId: data.transactionId ?? null,
          errorCode: data.errorCode ?? null,
          errorMessage: data.errorMessage ?? null,
          raw: data.raw ?? null,
        });
    } catch {
      // avoid surfacing log failures to UI
    }
  }
}
