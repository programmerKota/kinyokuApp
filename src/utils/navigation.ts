export const navigateToUserDetail = (
  navigation: any,
  userId: string,
  userName?: string,
  userAvatar?: string
) => {
  navigation.navigate(
    "UserDetail" as any,
    {
      userId,
      userName,
      userAvatar,
    } as any
  );
};

