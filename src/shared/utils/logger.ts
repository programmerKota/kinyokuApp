export type LogMeta = Record<string, unknown> | undefined;

const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : true;

function toErrorObject(err: unknown): { message: string; stack?: string } {
  if (err instanceof Error) return { message: err.message, stack: err.stack };
  try {
    return { message: JSON.stringify(err) };
  } catch {
    return { message: String(err) };
  }
}

function withMeta(meta?: LogMeta) {
  if (!meta) return undefined;
  try {
    return JSON.parse(JSON.stringify(meta));
  } catch {
    return { meta: String(meta) } as Record<string, unknown>;
  }
}

export const Logger = {
  error(tag: string, err?: unknown, meta?: LogMeta) {
    const e = toErrorObject(err);
    try { console.error(`[${tag}]`, e.message, e.stack ? `\n${e.stack}` : '', withMeta(meta)); } catch {}
  },
  warn(tag: string, err?: unknown, meta?: LogMeta) {
    const e = toErrorObject(err);
    try { console.warn(`[${tag}]`, e.message, withMeta(meta)); } catch {}
  },
  info(tag: string, msg?: unknown, meta?: LogMeta) {
    if (!isDev) return; // keep prod quiet for info
    try { console.log(`[${tag}]`, msg, withMeta(meta)); } catch {}
  },
  debug(tag: string, msg?: unknown, meta?: LogMeta) {
    if (!isDev) return;
    try { console.debug(`[${tag}]`, msg, withMeta(meta)); } catch {}
  },
  create(baseTag: string, baseMeta?: LogMeta) {
    const mergeMeta = (meta?: LogMeta) => ({ ...(withMeta(baseMeta) || {}), ...(withMeta(meta) || {}) });
    return {
      error: (msg: unknown, meta?: LogMeta) => Logger.error(baseTag, msg, mergeMeta(meta)),
      warn: (msg: unknown, meta?: LogMeta) => Logger.warn(baseTag, msg, mergeMeta(meta)),
      info: (msg: unknown, meta?: LogMeta) => Logger.info(baseTag, msg, mergeMeta(meta)),
      debug: (msg: unknown, meta?: LogMeta) => Logger.debug(baseTag, msg, mergeMeta(meta)),
    };
  },
};
