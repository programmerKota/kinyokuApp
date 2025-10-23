import { supabase } from "@app/config/supabase.config";

export interface FeedbackInput {
  userId?: string;
  subject: string;
  message: string;
  platform?: string;
  appVersion?: string;
}

export class FeedbackService {
  static async submit(feedback: FeedbackInput): Promise<string> {
    // Require Supabase Auth session in production.
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      throw Object.assign(new Error("AUTH_REQUIRED"), {
        code: "AUTH_REQUIRED" as const,
      });
    }

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("feedback")
      .insert({
        userId: session.user.id,
        subject: feedback.subject?.trim?.() ?? feedback.subject,
        message: feedback.message?.trim?.() ?? feedback.message,
        platform:
          feedback.platform != null && String(feedback.platform).length > 0
            ? feedback.platform
            : null,
        appVersion:
          feedback.appVersion != null && String(feedback.appVersion).length > 0
            ? feedback.appVersion
            : null,
        createdAt: now,
      })
      .select("id")
      .single<{ id: string }>();
    if (error) throw error;
    if (!data) throw new Error("feedback insert failed");
    return data.id;
  }
}
