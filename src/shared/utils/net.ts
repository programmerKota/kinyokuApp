export function isTransientFetchError(err: any): boolean {
  const msg = String((err?.message as string) || err || "").toLowerCase();
  const code = String((err?.code as string) || "").toLowerCase();
  return (
    msg.includes("failed to fetch") ||
    msg.includes("networkerror") ||
    msg.includes("network changed") ||
    code === "etimedout" ||
    code === "econnreset" ||
    code === "aborterror"
  );
}

export async function withRetry<T>(
  task: () => Promise<T>,
  opts: { retries?: number; delayMs?: number } = {},
): Promise<T> {
  const retries = Math.max(0, opts.retries ?? 2);
  const delayMs = Math.max(0, opts.delayMs ?? 500);
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await task();
    } catch (e) {
      if (attempt >= retries || !isTransientFetchError(e)) throw e;
      await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
    }
  }
  // 理論上ここには到達しない
  throw new Error("unreachable");
}
