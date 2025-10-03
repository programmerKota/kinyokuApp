import { supabase } from "@app/config/supabase.config";

export interface FirestoreUser {
  id: string;
  displayName: string;
  photoURL?: string | null;
}

export class FirestoreUserService {
  static async getCurrentUserId(): Promise<string> {
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
      return {
        displayName: data.displayName ?? "ユーザー",
        photoURL: data.photoURL ?? undefined,
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
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: userId,
        displayName: profile.displayName,
        photoURL: profile.photoURL ?? null,
        updatedAt: now,
        createdAt: now,
      })
      .single();
    if (error) throw error;
  }
}

export default FirestoreUserService;


