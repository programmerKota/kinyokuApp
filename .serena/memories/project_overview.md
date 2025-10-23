# Project Overview: abstinence-challenge

- App type: Expo / React Native (TypeScript)
- Backend: Supabase (auth, tables, RPC, RLS), plus some legacy Firestore compatibility wrappers
- Structure: features-based UI, shared design system, core services (supabase-first), and profile caching

Key entry points
- `App.tsx` wires ThemeProvider, ErrorBoundary, AuthPromptProvider, AuthProvider, RootNavigator
- Auth modal flow via `src/shared/auth/AuthPromptProvider.tsx` with `requireAuth()` returning Promise<boolean>

Architecture docs
- High-level: `ARCHITECTURE_REPORT.md`
- Appendix with checklists and mermaid: `ARCHITECTURE_REPORT_APPENDIX.md` and `ARCHITECTURE_REPORT.m`

Notable conventions
- Theme: use `useAppTheme()` + `colorSchemes[mode]`; typography via `textStyles.*`
- Network retry: `shared/utils/net.ts` provides `withRetry` and transient detection
- Profile data: `core/services/profileCache.ts` multiplexes `profiles` with realtime + signed URL cache

Ports/adapters (in progress)
- Define `core/ports/*` (e.g., `CommunityPort`) and back with `core/adapters/supabase/*`
- Goal: features depend on ports, swapping adapters without UI churn

Performance notes
- Lists: prefer minimal `extraData`, consider FlashList; tune `initialNumToRender/windowSize`
- Images: consider `expo-image` + thumbnails for LCP

