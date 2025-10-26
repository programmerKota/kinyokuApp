declare module "expo-image-manipulator" {
  export type SaveFormatType = "jpeg" | "png" | "webp" | "heic";
  export const SaveFormat: {
    JPEG: SaveFormatType;
    PNG: SaveFormatType;
    WEBP: SaveFormatType;
    HEIC?: SaveFormatType;
  };
  export function manipulateAsync(
    uri: string,
    actions: Array<any>,
    options?: { compress?: number; format?: SaveFormatType; base64?: boolean },
  ): Promise<{ uri: string; base64?: string }>;
  const _default: {
    manipulateAsync: typeof manipulateAsync;
    SaveFormat: typeof SaveFormat;
  };
  export default _default;
}
