import { supabase } from "@app/config/supabase.config";

export interface FirestoreUser {
  id: string;
  displayName: string;
  photoURL?: string | null;
}

export class FirestoreUserService {
  static async getCurrentUserId(): Promise<string> {
    try {
      const { data } = await supabase.auth.getSession();
      const suid = data?.session?.user?.id as string | undefined;
      if (suid) return suid;
    } catch {}
    const UserService = (await import("../userService")).default;
    const userService = UserService.getInstance();
    return await userService.getUserId();
  }

  static async getCurrentUserName(): Promise<string> {
    const UserService = (await import("../userService")).default;
    const userService = UserService.getInstance();
    return await userService.getUserName();
  }

  static async getCurrentUserAvatar(): Promise<string | undefined> {
    const UserService = (await import("../userService")).default;
    const userService = UserService.getInstance();
    return await userService.getAvatarUrl();
  }

  static async getUserById(
    userId: string,
  ): Promise<Pick<FirestoreUser, "displayName" | "photoURL"> | null> {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("displayName, photoURL")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      // 統一: ProfileCache と同じ署名URL解決を適用し、画面間のアバターURL差異をなくす
      const resolveSigned = async (
        url?: string,
      ): Promise<string | undefined> => {
        try {
          if (!url) return undefined;
          const marker = "/storage/v1/object/public/";
          const i = url.indexOf(marker);
          if (i === -1) return url;
          const rest = url.substring(i + marker.length);
          const j = rest.indexOf("/");
          if (j === -1) return url;
          const bucket = rest.substring(0, j);
          const pathWithQ = rest.substring(j + 1);
          const path = pathWithQ.split("?")[0];
          const { data: signed } = await supabase.storage
            .from(bucket)
            .createSignedUrl(path, 60 * 60 * 24 * 7);
          return signed?.signedUrl || url;
        } catch {
          return url;
        }
      };
      return {
        displayName: data.displayName ?? "ユーザー",
        photoURL: await resolveSigned((data as any).photoURL ?? undefined),
      } as any;
    } catch (e) {
      console.warn("getUserById failed", e);
      return null;
    }
  }

  static async setUserProfile(
    userId: string,
    profile: { displayName: string; photoURL?: string },
  ): Promise<void> {
    // Upsert to handle first-time users whose row hasn't been created yet
    const now = new Date().toISOString();
    const payload = {
      id: userId,
      displayName: profile.displayName,
      photoURL: profile.photoURL ?? null,
      updatedAt: now,
    } as const;
    const { error } = await supabase
      .from("profiles")
      .upsert(payload, { onConflict: "id" });
    if (error) throw error;
  }
}

export default FirestoreUserService;










