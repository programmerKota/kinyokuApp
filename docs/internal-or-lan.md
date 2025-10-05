Real Data On iPhone (No Tunnel)

Two reliable ways to test on device with real backend data.

- Internal Build (recommended)
  - No Metro, no LAN issues. The app contains your env and talks directly to Firebase/RevenueCat.
  - Steps:
    1. Add EAS Secrets (public runtime envs):
       - EXPO_PUBLIC_RC_IOS_PUBLIC_API_KEY
       - EXPO_PUBLIC_RC_ANDROID_PUBLIC_API_KEY
       - (optional fallback) EXPO_PUBLIC_RC_API_KEY
       - EXPO_PUBLIC_FIREBASE_API_KEY
       - EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
       - EXPO_PUBLIC_FIREBASE_PROJECT_ID
       - EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
       - EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
       - EXPO_PUBLIC_FIREBASE_APP_ID
       - Command example:
         - eas secret:create --scope project --name EXPO_PUBLIC_RC_IOS_PUBLIC_API_KEY --value <ios_public_key>
         - eas secret:create --scope project --name EXPO_PUBLIC_RC_ANDROID_PUBLIC_API_KEY --value <android_public_key>
    2. Build + install: npm run build:ios:preview
    3. Open the link on your iPhone and install.

- Dev Client over LAN (no tunnel)
  - Ensure PC and iPhone are on the same Wi‑Fi and firewall allows Node.js.
  - Start with real env values set in your shell, then run:
    - npm run ios:dev-client:lan
  - The URL should be exp://<your-pc-ip>:8081.

Notes

- Do not set emulator envs when testing on device.
- Purchases use RevenueCat when platform-specific RC keys (or the fallback `EXPO_PUBLIC_RC_API_KEY`) are present and `EXPO_PUBLIC_PAYMENTS_DEV_MODE` is not true.
