import { supabase, supabaseConfig } from "@app/config/supabase.config";
import { Logger } from "@shared/utils/logger";

const TABLE_NAME = "failure_strategies";
const GENERAL_CATEGORY = "general";

export class FailureStrategyService {
  static async getStrategy(userId: string): Promise<string> {
    if (!supabaseConfig?.isConfigured) return "";

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("strategy")
      .eq("user_id", userId)
      .eq("category", GENERAL_CATEGORY)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (error) {
      Logger.warn("FailureStrategyService.getStrategy", error, { userId });
      return "";
    }

    if (!data || data.length === 0) return "";
    return data[0]?.strategy ?? "";
  }

  static async upsertStrategy(userId: string, strategy: string): Promise<void> {
    if (!supabaseConfig?.isConfigured) return;

    const trimmed = strategy.trim();

    if (trimmed.length === 0) {
      const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .eq("user_id", userId)
        .eq("category", GENERAL_CATEGORY);

      if (error) {
        Logger.warn("FailureStrategyService.upsertStrategy", error, {
          userId,
          action: "delete",
        });
        throw error;
      }
      return;
    }

    const { error } = await supabase.from(TABLE_NAME).upsert(
      [
        {
          user_id: userId,
          category: GENERAL_CATEGORY,
          strategy: trimmed,
        },
      ],
      { onConflict: "user_id,category" },
    );

    if (error) {
      Logger.warn("FailureStrategyService.upsertStrategy", error, {
        userId,
        action: "upsert",
      });
      throw error;
    }
  }
}

export default FailureStrategyService;
