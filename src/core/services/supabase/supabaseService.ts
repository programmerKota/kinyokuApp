import { supabase, supabaseConfig } from "@app/config/supabase.config";

export class SupabaseService {
  protected static client = supabase;

  // Lightweight connectivity check: rely on session/local state only
  static async testConnection(): Promise<boolean> {
    try {
      if (!supabaseConfig?.isConfigured) return false;
      const { data } = await supabase.auth.getSession();
      return !!(data?.session?.user?.id || supabaseConfig?.url);
    } catch {
      return false;
    }
  }

  static async getDatabaseInfo() {
    try {
      const { data } = await this.client.rpc("version");
      return data ?? null;
    } catch {
      return null;
    }
  }
}

export default SupabaseService;
