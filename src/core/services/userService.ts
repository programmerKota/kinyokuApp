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

  // 郢昴・繝ｰ郢ｧ・､郢ｧ・ｹ陜暦ｽｺ隴帛ｳｨ繝ｻ郢晢ｽｦ郢晢ｽｼ郢ｧ・ｶ郢晢ｽｼID郢ｧ蝣､蜃ｽ隰後・
  private generateDeviceId(): string {
    // 郢昴・繝ｰ郢ｧ・､郢ｧ・ｹID邵ｺ・ｨ郢ｧ・｢郢晏干ﾎ懃ｹｧ・ｱ郢晢ｽｼ郢ｧ・ｷ郢晢ｽｧ郢晢ｽｳID郢ｧ蝣､・ｵ繝ｻ竏ｩ陷ｷ蛹ｻ・冗ｸｺ蟶吮ｻ闕ｳﾂ隲｢荳岩・ID郢ｧ蝣､蜃ｽ隰後・
    const deviceId = Device.osInternalBuildId || Device.modelId || 'unknown-device';
    const appId = Application.applicationId || 'unknown-app';
    const timestamp = Date.now().toString(36);

    // 郢昜ｸ翫Ε郢ｧ・ｷ郢晢ｽ･陋ｹ謔ｶ・邵ｺ・ｦ驕擾ｽｭ邵ｺﾐ魯郢ｧ蝣､蜃ｽ隰後・
    const combined = `${deviceId}-${appId}-${timestamp}`;
    return this.simpleHash(combined);
  }

  // 郢ｧ・ｷ郢晢ｽｳ郢晏干ﾎ晉ｸｺ・ｪ郢昜ｸ翫Ε郢ｧ・ｷ郢晢ｽ･鬮｢・｢隰ｨ・ｰ
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // 32bit隰ｨ・ｴ隰ｨ・ｰ邵ｺ・ｫ陞溽判驪､
    }
    return Math.abs(hash).toString(36);
  }

  // 郢晢ｽｦ郢晢ｽｼ郢ｧ・ｶ郢晢ｽｼID郢ｧ雋槫徐陟墓圜・ｼ莠･繝ｻ陜玲ｧｭ繝ｻ騾墓ｻ薙・邵ｺ蜉ｱ窶ｻ闖ｫ譎擾ｽｭ蛛・ｽｼ繝ｻ
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
      // 郢晁ｼ斐°郢晢ｽｼ郢晢ｽｫ郢晁・繝｣郢ｧ・ｯ: 郢晢ｽ｡郢晢ｽ｢郢晢ｽｪ陷繝ｻ縲帝墓ｻ薙・
      return this.generateDeviceId();
    }
  }

  // 郢晢ｽｦ郢晢ｽｼ郢ｧ・ｶ郢晢ｽｼ陷ｷ髦ｪ・定愾髢・ｾ繝ｻ
  async getUserName(): Promise<string> {
    try {
      const userName = await AsyncStorage.getItem(USER_NAME_KEY);
      return userName || '';
    } catch (error) {
      console.error('getUserName failed', error);
      return '郢晢ｽｦ郢晢ｽｼ郢ｧ・ｶ郢晢ｽｼ';
    }
  }

  // 郢晢ｽｦ郢晢ｽｼ郢ｧ・ｶ郢晢ｽｼ陷ｷ髦ｪ・帝坎・ｭ陞ｳ繝ｻ
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

  // 郢ｧ・｢郢晁・縺｡郢晢ｽｼURL郢ｧ雋槫徐陟輔・
  async getAvatarUrl(): Promise<string | undefined> {
    try {
      const avatarUrl = await AsyncStorage.getItem(USER_AVATAR_KEY);
      return avatarUrl || undefined;
    } catch (error) {
      console.error('getUserName failed', error);
      return undefined;
    }
  }

  // 郢ｧ・｢郢晁・縺｡郢晢ｽｼURL郢ｧ螳夲ｽｨ・ｭ陞ｳ繝ｻ
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

  // 霑ｴ・ｾ陜ｨ・ｨ邵ｺ・ｮ郢晢ｽｦ郢晢ｽｼ郢ｧ・ｶ郢晢ｽｼ郢晏干ﾎ溽ｹ晁ｼ斐≦郢晢ｽｼ郢晢ｽｫ郢ｧ雋槫徐陟輔・
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

  // 郢晢ｽｦ郢晢ｽｼ郢ｧ・ｶ郢晢ｽｼ郢晏干ﾎ溽ｹ晁ｼ斐≦郢晢ｽｼ郢晢ｽｫ郢ｧ蜻亥ｳｩ隴・ｽｰ
  async updateProfile(name: string, avatar?: string): Promise<void> {
    await Promise.all([this.setUserName(name), this.setAvatarUrl(avatar)]);

    // 郢晢ｽ｡郢晢ｽ｢郢晢ｽｪ陷繝ｻ繝ｻ郢晢ｽｦ郢晢ｽｼ郢ｧ・ｶ郢晢ｽｼ隲繝ｻ・ｰ・ｱ郢ｧ繧亥ｳｩ隴・ｽｰ
    if (this.currentUser) {
      this.currentUser.name = name;
      this.currentUser.avatar = avatar;
    }
  }

  // 郢晢ｽｦ郢晢ｽｼ郢ｧ・ｶ郢晢ｽｼ隲繝ｻ・ｰ・ｱ郢ｧ蛛ｵﾎ懃ｹｧ・ｻ郢昴・繝ｨ繝ｻ蛹ｻ繝ｧ郢晁・繝｣郢ｧ・ｰ騾包ｽｨ繝ｻ繝ｻ
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

