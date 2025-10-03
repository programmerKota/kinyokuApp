# iOS Native Build (EAS)

This project is Expo (managed). Use EAS to run native builds with real in‑app purchases via RevenueCat.

## Prereqs

- Apple Developer Program account (team ID available)
- RevenueCat project (iOS Public SDK Key, products mapped)
- Firebase Web config (apiKey/authDomain/projectId/storageBucket/messagingSenderId/appId)

## 1) Update identifiers

- Set `ios.bundleIdentifier` in `app.json` (reverse‑DNS).
- Product IDs must match `src/core/services/payments/products.ts` and App Store / RevenueCat.

## 2) Provide runtime env

Options:

- Local dev client: set envs in your shell before `expo start --dev-client`.
- EAS cloud builds: add EAS Secrets (recommended) or edit `eas.json` env.

Required envs (public):

- `EXPO_PUBLIC_RC_API_KEY`
- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `EXPO_PUBLIC_FIREBASE_APP_ID`

See `.env.public.example` for a template.

## 3) Register device and build Dev Client

```sh
npx eas login
npx eas device:create          # register your iPhone
npm run build:ios:dev          # EAS dev client build (internal distribution)
```

Install the build on your iPhone from the EAS link.

## 4) Run with Metro (Dev Client)

```powershell
$env:EXPO_PUBLIC_RC_API_KEY='...'
$env:EXPO_PUBLIC_FIREBASE_API_KEY='...'
$env:EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN='...'
$env:EXPO_PUBLIC_FIREBASE_PROJECT_ID='...'
$env:EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET='...'
$env:EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID='...'
$env:EXPO_PUBLIC_FIREBASE_APP_ID='...'
npm run ios:dev-client
```

Open the Dev Client app on iPhone and connect to the server (use `--tunnel` if LAN fails).

## 5) Internal (preview) build without Metro

Set the envs as EAS Secrets, then:

```sh
npm run build:ios:preview
```

Install on device from the EAS link and test without Metro.

## Notes

- Real purchases only work in Dev Client/Internal/Production builds.
- Use App Store Connect Sandbox testers for purchase flows.
- The app config includes `react-native-purchases` plugin and iOS usage descriptions.
