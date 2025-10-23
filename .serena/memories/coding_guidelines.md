# Coding Guidelines (Concise)

- TypeScript strict; avoid `any` unless isolating third-party shapes.
- Theme usage
  - Import `colorSchemes` and `useAppTheme()`; avoid dynamic `require` where不要
  - Use `textStyles` for typography (e.g., `textStyles.body`, `textStyles.h3`)
- UI state
  - Keep feature-specific UI state under `src/features/...`; `shared/state` is for cross-cutting only
- Network
  - Wrap remote calls that can transiently fail with `withRetry(task, { retries: 2, delayMs: 400 })`
- Error handling
  - Don’t swallow: DEV→`console.warn`, PROD→lightweight logger (Sentry, etc.)
- Ports/Adapters
  - Depend on `core/ports/*` from features
  - Implement Supabase adapters in `core/adapters/supabase/*`
- Lists and rendering
  - Keep `extraData` small; memoize rows; provide `getItemLayout` where possible
