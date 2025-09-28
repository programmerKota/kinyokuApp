import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import * as Device from 'expo-device';

const USER_ID_KEY = 'user_id';
const USER_NAME_KEY = 'user_name';
const USER_AVATAR_KEY = 'user_avatar';

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

  // 繝�Eヰ繧�E�繧�E�蝗ｺ譛峨・繝ｦ繝ｼ繧�E�繝ｼID繧堤函謌�E
  private generateDeviceId(): string {
    // 繝�Eヰ繧�E�繧�E�ID縺�E�繧�E�繝励Μ繧�E�繝ｼ繧�E�繝ｧ繝ｳID繧堤�E�・∩蜷医�E�縺帙※荳諢上�EID繧堤函謌�E
    const deviceId = Device.osInternalBuildId || Device.modelId || 'unknown-device';
    const appId = Application.applicationId || 'unknown-app';
    const timestamp = Date.now().toString(36);

    // 繝上ャ繧�E�繝･蛹悶�E�縺�E�遏ｭ縺ИD繧堤函謌�E
    const combined = `${deviceId}-${appId}-${timestamp}`;
    return this.simpleHash(combined);
  }

  // 繧�E�繝ｳ繝励Ν縺�E�繝上ャ繧�E�繝･髢�E�謨�E�
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // 32bit謨�E�謨�E�縺�E�螟画鋤
    }
    return Math.abs(hash).toString(36);
  }

  // 繝ｦ繝ｼ繧�E�繝ｼID繧貞叙蠕暦�E�亥・蝗槭・逕滓�E縺励※菫晏ｭ偁E��・
  async getUserId(): Promise<string> {
    try {
      let userId = await AsyncStorage.getItem(USER_ID_KEY);
      if (!userId) {
        userId = this.generateDeviceId();
        await AsyncStorage.setItem(USER_ID_KEY, userId);
      }
      return userId;
    } catch (error) {
      console.error('getUserName failed', error);
      // 繝輔か繝ｼ繝ｫ繝�Eャ繧�E�: 繝｡繝｢繝ｪ蜀・〒逕滓�E
      return this.generateDeviceId();
    }
  }

  // 繝ｦ繝ｼ繧�E�繝ｼ蜷阪�E�蜿門�E�・
  async getUserName(): Promise<string> {
    try {
      const userName = await AsyncStorage.getItem(USER_NAME_KEY);
      return userName || '';
    } catch (error) {
      console.error('getUserName failed', error);
      return '繝ｦ繝ｼ繧�E�繝ｼ';
    }
  }

  // 繝ｦ繝ｼ繧�E�繝ｼ蜷阪�E�險�E�螳・
  async setUserName(name: string): Promise<void> {
    try {
      await AsyncStorage.setItem(USER_NAME_KEY, name);
      if (this.currentUser) {
        this.currentUser.name = name;
      }
    } catch (error) {
      console.error('getUserName failed', error);
    }
  }

  // 繧�E�繝�Eち繝ｼURL繧貞叙蠕�E
  async getAvatarUrl(): Promise<string | undefined> {
    try {
      const avatarUrl = await AsyncStorage.getItem(USER_AVATAR_KEY);
      return avatarUrl || undefined;
    } catch (error) {
      console.error('getUserName failed', error);
      return undefined;
    }
  }

  // 繧�E�繝�Eち繝ｼURL繧定ｨ�E�螳・
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
      console.error('getUserName failed', error);
    }
  }

  // 迴�E�蝨�E�縺�E�繝ｦ繝ｼ繧�E�繝ｼ繝励Ο繝輔ぅ繝ｼ繝ｫ繧貞叙蠕�E
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

  // 繝ｦ繝ｼ繧�E�繝ｼ繝励Ο繝輔ぅ繝ｼ繝ｫ繧呈峩譁E��
  async updateProfile(name: string, avatar?: string): Promise<void> {
    await Promise.all([this.setUserName(name), this.setAvatarUrl(avatar)]);

    // 繝｡繝｢繝ｪ蜀・・繝ｦ繝ｼ繧�E�繝ｼ諠・�E��E�繧よ峩譁E��
    if (this.currentUser) {
      this.currentUser.name = name;
      this.currentUser.avatar = avatar;
    }
  }

  // 繝ｦ繝ｼ繧�E�繝ｼ諠・�E��E�繧偵Μ繧�E�繝�Eヨ・医ョ繝�Eャ繧�E�逕ｨ・・
  async resetUser(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([USER_ID_KEY, USER_NAME_KEY, USER_AVATAR_KEY]);
      this.currentUser = null;
    } catch (error) {
      console.error('getUserName failed', error);
    }
  }
}

export default UserService;

