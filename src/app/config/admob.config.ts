export const admobConfig = {
  ios: {
    appId: "ca-app-pub-2822970818216602~87880412897",
    bannerUnitId: "ca-app-pub-2822970818216602/2098063229",
  },
  android: {
    appId: "ca-app-pub-2822970818216602~5709171023",
    bannerUnitId: "ca-app-pub-2822970818216602/1716572233",
  },
} as const;

export const getBannerAdUnitId = (platform: "ios" | "android"): string => {
  if (platform === "ios") return admobConfig.ios.bannerUnitId;
  if (platform === "android") return admobConfig.android.bannerUnitId;
  return "";
};

export default admobConfig;
