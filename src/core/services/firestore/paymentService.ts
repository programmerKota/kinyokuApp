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
}
