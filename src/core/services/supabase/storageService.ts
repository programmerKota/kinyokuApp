import { supabase, supabaseConfig } from "@app/config/supabase.config";

const AVATARS_BUCKET = "avatars";

const isHttpUrl = (v?: string) => typeof v === "string" && /^https?:\/\//i.test(v);
const isDataUrl = (v?: string) => typeof v === "string" && /^data:image\//i.test(v);
const extFromType = (type?: string): string => {
  if (!type) return "jpg";
  if (type.includes("png")) return "png";
  if (type.includes("webp")) return "webp";
  if (type.includes("gif")) return "gif";
  if (type.includes("jpeg")) return "jpg";
  return "jpg";
};

const decodeBase64ToUint8 = (b64: string): Uint8Array => {
  // Lightweight base64 decoder that works in RN without extra deps
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  let str = b64.replace(/[^A-Za-z0-9+/=]/g, "");
  let output: number[] = [];
  let i = 0;
  while (i < str.length) {
    const enc1 = chars.indexOf(str.charAt(i++));
    const enc2 = chars.indexOf(str.charAt(i++));
    const enc3 = chars.indexOf(str.charAt(i++));
    const enc4 = chars.indexOf(str.charAt(i++));
    const chr1 = (enc1 << 2) | (enc2 >> 4);
    const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
    const chr3 = ((enc3 & 3) << 6) | enc4;
    output.push(chr1);
    if (enc3 !== 64) output.push(chr2);
    if (enc4 !== 64) output.push(chr3);
  }
  return new Uint8Array(output);
};

const parseDataUrl = (
  dataUrl: string,
): { contentType: string; bytes: Uint8Array } | null => {
  try {
    const match = dataUrl.match(/^data:([^;]+);base64,(.*)$/i);
    if (!match) return null;
    const contentType = match[1];
    const b64 = match[2];
    const bytes = decodeBase64ToUint8(b64);
    return { contentType, bytes };
  } catch {
    return null;
  }
};

export async function uploadUserAvatar(
  localUri: string,
  userId?: string,
): Promise<string> {
  if (!supabaseConfig?.isConfigured) throw new Error("SUPABASE_NOT_CONFIGURED");
  if (!localUri) throw new Error("INVALID_URI");
  if (isHttpUrl(localUri)) return localUri; // already remote

  const getUid = async () => {
    if (userId) return userId;
    const { data } = await supabase.auth.getSession();
    const uid = data?.session?.user?.id as string | undefined;
    if (!uid) throw new Error("AUTH_REQUIRED");
    return uid;
  };

  const uid = await getUid();

  // If a data URL is provided (iOS対応: ph://を回避)、直接バイト列へ
  let payload: any;
  let contentType: string | undefined;
  if (isDataUrl(localUri)) {
    const parsed = parseDataUrl(localUri);
    if (!parsed) throw new Error("INVALID_DATA_URL");
    contentType = parsed.contentType || "image/jpeg";
    payload = parsed.bytes.buffer as ArrayBuffer;
  } else {
    // Try fetch -> blob. RN(iOS) では file:// の fetch が失敗する場合があるため FileSystem でフォールバック
    let blob: Blob | null = null;
    try {
      const res = await fetch(localUri);
      blob = await res.blob();
    } catch {
      // ignore
    }
    if (!blob || (blob as any).size === 0) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const FileSystem = require("expo-file-system");
        const b64 = await FileSystem.readAsStringAsync(localUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        payload = decodeBase64ToUint8(b64).buffer as ArrayBuffer;
        contentType = "image/jpeg"; // best-effort
      } catch (e) {
        throw new Error(
          `EMPTY_FILE: unable to read local file. detail=${(e as any)?.message || e}`,
        );
      }
    } else {
      contentType = (blob as any).type || "image/jpeg";
      // Prefer File when available to preserve metadata; otherwise use Blob directly
      payload = typeof File !== "undefined"
        ? new File([blob as any], `avatar.${extFromType(contentType)}`, {
            type: contentType,
          })
        : (blob as any);
    }
  }
  const ext = extFromType(contentType);
  // Use a stable path to avoid orphan files and reduce storage cost.
  // Cache-busting is handled via ?v= query param on the returned URL.
  const key = `${uid}/avatar.${ext}`;

  // Try upload with upsert; fall back to update if storage returns a 4xx (e.g., exists)
  let upErr: any | null = null;
  try {
    const { error } = await supabase.storage
      .from(AVATARS_BUCKET)
      .upload(key, payload, {
        contentType,
        upsert: true,
        cacheControl: "31536000",
      });
    upErr = error ?? null;
  } catch (e: any) {
    upErr = e;
  }

  if (upErr) {
    // Attempt explicit update (PUT) as a fallback
    const { error: updErr } = await supabase.storage
      .from(AVATARS_BUCKET)
      .update(key, payload, {
        contentType,
        cacheControl: "31536000",
        upsert: true,
      });
    if (updErr) {
      // surface better diagnostics
      const msg = `UPLOAD_FAILED: ${upErr?.message || upErr} / UPDATE_FAILED: ${updErr?.message || updErr}`;
      throw new Error(msg);
    }
  }

  // Use public URL (require bucket public read) or switch to signed if desired
  const { data: pub } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(key);
  const publicUrl = (pub?.publicUrl || "") + `?v=${Date.now()}`; // cache-bust
  if (!publicUrl) throw new Error("PUBLIC_URL_UNAVAILABLE");
  return publicUrl;
}

export default { uploadUserAvatar };
