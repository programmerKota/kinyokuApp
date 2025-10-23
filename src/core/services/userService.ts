import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from "expo-application";
import * as Device from "expo-device";

const USER_ID_KEY = "user_id";
const USER_NAME_KEY = "user_name";
const USER_AVATAR_KEY = "user_avatar";

export interface UserProfile {
  id: string;
  name: string;
  avatar?: string;
}

class UserService {
  private static instance: UserService;
  private currentUser: UserProfile | null = null;

  private constructor() {}

  static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  // デバイス固有のIDを生成
  private generateDeviceId(): string {
    // デバイスID + アプリID + タイムスタンプでユニークなIDを生成
    const deviceId =
      Device.osInternalBuildId || Device.modelId || "unknown-device";
    const appId = Application.applicationId || "unknown-app";
    const timestamp = Date.now().toString(36);

    // ハッシュ化して短いIDを生成
    const combined = `${deviceId}-${appId}-${timestamp}`;
    return this.simpleHash(combined);
  }

  // 文字列のハッシュ化
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // 32bit整数に変換
    }
    return Math.abs(hash).toString(36);
  }

  // ユーザーIDを取得（なければ生成）
  async getUserId(): Promise<string> {
    try {
      let userId = await AsyncStorage.getItem(USER_ID_KEY);
      if (!userId) {
        userId = this.generateDeviceId();
        await AsyncStorage.setItem(USER_ID_KEY, userId);
      }
      return userId;
    } catch (error) {
      console.error("getUserId failed", error);
      // フォールバック: デバイス固有のIDを生成
      return this.generateDeviceId();
    }
  }

  // ユーザー名を取得
  async getUserName(): Promise<string> {
    try {
      const userName = await AsyncStorage.getItem(USER_NAME_KEY);
      return userName || "";
    } catch (error) {
      console.error("getUserName failed", error);
      return "ユーザー";
    }
  }

  // ユーザー名を設定
  async setUserName(name: string): Promise<void> {
    try {
      await AsyncStorage.setItem(USER_NAME_KEY, name);
      if (this.currentUser) {
        this.currentUser.name = name;
      }
    } catch (error) {
      console.error("setUserName failed", error);
    }
  }

  // アバターURLを取得
  async getAvatarUrl(): Promise<string | undefined> {
    try {
      const avatarUrl = await AsyncStorage.getItem(USER_AVATAR_KEY);
      return avatarUrl || undefined;
    } catch (error) {
      console.error("getAvatarUrl failed", error);
      return undefined;
    }
  }

  // アバターURLを設定
  async setAvatarUrl(avatarUrl: string | undefined): Promise<void> {
    try {
      if (avatarUrl) {
        await AsyncStorage.setItem(USER_AVATAR_KEY, avatarUrl);
      } else {
        await AsyncStorage.removeItem(USER_AVATAR_KEY);
      }
      if (this.currentUser) {
        this.currentUser.avatar = avatarUrl;
      }
    } catch (error) {
      console.error("setAvatarUrl failed", error);
    }
  }

  // 現在のユーザープロフィールを取得
  async getCurrentUser(): Promise<UserProfile> {
    if (this.currentUser) {
      return this.currentUser;
    }

    const [id, name, avatar] = await Promise.all([
      this.getUserId(),
      this.getUserName(),
      this.getAvatarUrl(),
    ]);

    this.currentUser = {
      id,
      name,
      avatar,
    };

    return this.currentUser;
  }

  // ユーザープロフィールを更新
  async updateProfile(name: string, avatar?: string): Promise<void> {
    await Promise.all([this.setUserName(name), this.setAvatarUrl(avatar)]);

    // メモリ上のユーザー情報も更新
    if (this.currentUser) {
      this.currentUser.name = name;
      this.currentUser.avatar = avatar;
    }
  }

  // ユーザー情報をリセット
  async resetUser(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        USER_ID_KEY,
        USER_NAME_KEY,
        USER_AVATAR_KEY,
      ]);
      this.currentUser = null;
    } catch (error) {
      console.error("resetUser failed", error);
    }
  }
}

export default UserService;
