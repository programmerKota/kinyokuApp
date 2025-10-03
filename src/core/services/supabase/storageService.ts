import { supabase, supabaseConfig } from "@app/config/supabase.config";

const AVATARS_BUCKET = "avatars";

const isHttpUrl = (v?: string) => typeof v === "string" && /^https?:\/\//i.test(v);
const extFromType = (type?: string): string => {
  if (!type) return "jpg";
  if (type.includes("png")) return "png";
  if (type.includes("webp")) return "webp";
  if (type.includes("gif")) return "gif";
  return "jpg";
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

  // Fetch the local file into a Blob/ArrayBuffer
  const res = await fetch(localUri);
  const blob = await res.blob();
  if (!blob || blob.size === 0) {
    throw new Error(
      "EMPTY_FILE: fetch(localUri) returned 0 bytes. On web, ensure ImagePicker returns a blob/data URL and CORS allows reading.",
    );
  }
  const contentType = blob.type || "image/jpeg";
  const ext = extFromType(contentType);
  // Use a stable path to avoid orphan files and reduce storage cost.
  // Cache-busting is handled via ?v= query param on the returned URL.
  const key = `${uid}/avatar.${ext}`;

  // Prefer File when available (web) to preserve filename/ctype metadata
  const payload: any = typeof File !== "undefined"
    ? new File([blob], `avatar.${ext}` as string, { type: contentType })
    : blob;

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
