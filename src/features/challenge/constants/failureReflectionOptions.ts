export const FAILURE_TIME_SLOTS = [
  { key: "morning", label: "朝（5–9時）" },
  { key: "daytime", label: "昼（9–17時）" },
  { key: "evening", label: "夜（17–23時）" },
  { key: "late_night", label: "深夜（23–5時）" },
] as const;

export const FAILURE_DEVICES = [
  { key: "smartphone", label: "スマホ" },
  { key: "pc", label: "PC" },
  { key: "tablet", label: "タブレット" },
  { key: "tv", label: "TV" },
] as const;

export const FAILURE_FEELINGS = [
  { key: "stress", label: "ストレス" },
  { key: "boredom", label: "退屈" },
  { key: "lonely", label: "孤独" },
  { key: "anxiety", label: "不安" },
  { key: "fatigue", label: "疲労" },
  { key: "relief", label: "幸福感（油断）" },
  { key: "habit", label: "習慣的に（無意識）" },
] as const;

export const FAILURE_PLACES = [
  { key: "bedroom", label: "寝室" },
  { key: "living", label: "リビング" },
  { key: "toilet", label: "トイレ" },
  { key: "bathroom", label: "浴室" },
] as const;

export const FAILURE_OTHER_OPTION_KEY = "other" as const;

export type FailureTimeSlotKey = (typeof FAILURE_TIME_SLOTS)[number]["key"];
export type FailureDeviceKey = (typeof FAILURE_DEVICES)[number]["key"];
export type FailureFeelingKey = (typeof FAILURE_FEELINGS)[number]["key"];
export type FailurePlaceKey = (typeof FAILURE_PLACES)[number]["key"];
export type FailureOtherKey = typeof FAILURE_OTHER_OPTION_KEY;

export const FAILURE_OTHER_LABEL = "その他";
