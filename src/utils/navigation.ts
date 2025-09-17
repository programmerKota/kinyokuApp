type UserDetailParams = {
  userId: string;
  userName?: string;
  userAvatar?: string;
};

type NavigationLike = {
  navigate: (screen: 'UserDetail', params: UserDetailParams) => void;
};

export const navigateToUserDetail = (
  navigation: NavigationLike,
  userId: string,
  userName?: string,
  userAvatar?: string,
) => {
  navigation.navigate('UserDetail', {
    userId,
    userName,
    userAvatar,
  });
};
