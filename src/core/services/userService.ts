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

  // 繝・ヰ繧､繧ｹ蝗ｺ譛峨・繝ｦ繝ｼ繧ｶ繝ｼID繧堤函謌・
  private generateDeviceId(): string {
    // 繝・ヰ繧､繧ｹID縺ｨ繧｢繝励Μ繧ｱ繝ｼ繧ｷ繝ｧ繝ｳID繧堤ｵ・∩蜷医ｏ縺帙※荳諢上↑ID繧堤函謌・
    const deviceId = Device.osInternalBuildId || Device.modelId || 'unknown-device';
    const appId = Application.applicationId || 'unknown-app';
    const timestamp = Date.now().toString(36);

    // 繝上ャ繧ｷ繝･蛹悶＠縺ｦ遏ｭ縺ИD繧堤函謌・
    const combined = `${deviceId}-${appId}-${timestamp}`;
    return this.simpleHash(combined);
  }

  // 繧ｷ繝ｳ繝励Ν縺ｪ繝上ャ繧ｷ繝･髢｢謨ｰ
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // 32bit謨ｴ謨ｰ縺ｫ螟画鋤
    }
    return Math.abs(hash).toString(36);
  }

  // 繝ｦ繝ｼ繧ｶ繝ｼID繧貞叙蠕暦ｼ亥・蝗槭・逕滓・縺励※菫晏ｭ假ｼ・
  async getUserId(): Promise<string> {
    try {
      let userId = await AsyncStorage.getItem(USER_ID_KEY);
      if (!userId) {
        userId = this.generateDeviceId();
        await AsyncStorage.setItem(USER_ID_KEY, userId);
      }
      return userId;
    } catch (error) {
      console.error('繝ｦ繝ｼ繧ｶ繝ｼID縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆:', error);
      // 繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ: 繝｡繝｢繝ｪ蜀・〒逕滓・
      return this.generateDeviceId();
    }
  }

  // 繝ｦ繝ｼ繧ｶ繝ｼ蜷阪ｒ蜿門ｾ・
  async getUserName(): Promise<string> {
    try {
      const userName = await AsyncStorage.getItem(USER_NAME_KEY);
      return userName || '繝ｦ繝ｼ繧ｶ繝ｼ';
    } catch (error) {
      console.error('繝ｦ繝ｼ繧ｶ繝ｼ蜷阪・蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆:', error);
      return '繝ｦ繝ｼ繧ｶ繝ｼ';
    }
  }

  // 繝ｦ繝ｼ繧ｶ繝ｼ蜷阪ｒ險ｭ螳・
  async setUserName(name: string): Promise<void> {
    try {
      await AsyncStorage.setItem(USER_NAME_KEY, name);
      if (this.currentUser) {
        this.currentUser.name = name;
      }
    } catch (error) {
      console.error('繝ｦ繝ｼ繧ｶ繝ｼ蜷阪・險ｭ螳壹↓螟ｱ謨励＠縺ｾ縺励◆:', error);
    }
  }

  // 繧｢繝舌ち繝ｼURL繧貞叙蠕・
  async getAvatarUrl(): Promise<string | undefined> {
    try {
      const avatarUrl = await AsyncStorage.getItem(USER_AVATAR_KEY);
      return avatarUrl || undefined;
    } catch (error) {
      console.error('繧｢繝舌ち繝ｼURL縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆:', error);
      return undefined;
    }
  }

  // 繧｢繝舌ち繝ｼURL繧定ｨｭ螳・
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
      console.error('繧｢繝舌ち繝ｼURL縺ｮ險ｭ螳壹↓螟ｱ謨励＠縺ｾ縺励◆:', error);
    }
  }

  // 迴ｾ蝨ｨ縺ｮ繝ｦ繝ｼ繧ｶ繝ｼ繝励Ο繝輔ぅ繝ｼ繝ｫ繧貞叙蠕・
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

  // 繝ｦ繝ｼ繧ｶ繝ｼ繝励Ο繝輔ぅ繝ｼ繝ｫ繧呈峩譁ｰ
  async updateProfile(name: string, avatar?: string): Promise<void> {
    await Promise.all([this.setUserName(name), this.setAvatarUrl(avatar)]);

    // 繝｡繝｢繝ｪ蜀・・繝ｦ繝ｼ繧ｶ繝ｼ諠・ｱ繧よ峩譁ｰ
    if (this.currentUser) {
      this.currentUser.name = name;
      this.currentUser.avatar = avatar;
    }
  }

  // 繝ｦ繝ｼ繧ｶ繝ｼ諠・ｱ繧偵Μ繧ｻ繝・ヨ・医ョ繝舌ャ繧ｰ逕ｨ・・
  async resetUser(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([USER_ID_KEY, USER_NAME_KEY, USER_AVATAR_KEY]);
      this.currentUser = null;
    } catch (error) {
      console.error('繝ｦ繝ｼ繧ｶ繝ｼ諠・ｱ縺ｮ繝ｪ繧ｻ繝・ヨ縺ｫ螟ｱ謨励＠縺ｾ縺励◆:', error);
    }
  }
}

export default UserService;
