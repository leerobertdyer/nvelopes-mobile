# Android Implementation

The app is already mostly Android-ready in code and `app.config.js` (package name, adaptive icon, App Links intent filter, splash). Remaining work is Firebase/Google configuration, hosting verification, a device QA pass, and Play Console setup.

## 1. Firebase — Android apps

In the [Firebase console](https://console.firebase.google.com), add Android apps for both package names:

| Variant | Package |
|---------|---------|
| Production | `com.ldyer.nvelopes` |
| Development | `com.ldyer.nvelopes.dev` |

Download `google-services.json` for each. The production file already exists at the repo root but is incomplete (see step 2).

For dev builds, mirror the iOS pattern: keep a separate dev file (e.g. `DevGoogle-services.json`) and point `app.config.js` at it via a `GOOGLE_SERVICES_JSON` env var, same as `GOOGLE_SERVICE_INFO_PLIST` on iOS.

Set `GOOGLE_SERVICES_JSON` in `.env` locally and in EAS secrets for cloud builds.

## 2. Firebase — SHA-1 fingerprints (Google Sign-In)

`google-services.json` currently has no Android OAuth client (`certificate_hash` is null). Google Sign-In will fail on device until SHA-1 fingerprints are registered.

Add SHA-1s in Firebase for each Android app:

1. **EAS debug keystore** — `eas credentials -p android`
2. **EAS release keystore** — same command, release profile
3. **Play App Signing key** — from Play Console after upload (add later)

Re-download `google-services.json` after each addition. Confirm the file contains `oauth_client` entries with `client_type: 1`.

## 3. Google Sign-In

`signInWithGoogle.ts` already calls `GoogleSignin.configure({ webClientId: process.env.EXPO_PUBLIC_FIREBASE_WEB_ID })`. No code changes expected once step 2 is done.

`EXPO_PUBLIC_FIREBASE_WEB_ID` must be the **Web client** ID from Firebase (type 3), not the Android client ID.

## 4. App Links (invite deep links)

`app.config.js` already declares an intent filter for `https://invite.nvelopes.app/invite` with `autoVerify: true`.

Host `/.well-known/assetlinks.json` on `invite.nvelopes.app` with the Android package name and the **SHA-256** of the Play signing certificate. Without this, invite links open in the browser instead of the app.

## 5. Build and install

```bash
# Local dev build (phone connected or emulator)
npx expo run:android --device

# Or cloud build
eas build --profile development --platform android
```

Splash, icon, and other native asset changes require a full rebuild and reinstall — Metro/QR only updates JS.

## 6. QA pass

- **Edge-to-edge** (`edgeToEdgeEnabled: true`) — check safe-area insets on all screens
- **Hardware back button** — modals and navigation stack
- **Google Sign-In** — sign in, sign out, re-auth on delete account
- **Email/password auth** — login, signup, password reset
- **Invite deep links** — tap `https://invite.nvelopes.app/invite/...` from Chrome/Gmail
- **Drag-and-drop** (`react-native-drax`) and **calendars** — touch behavior on real hardware

## 7. Play Console

- One-time $25 developer account fee
- Upload an AAB via `eas build --profile production --platform android`
- **Internal testing** — no tester minimum; fine for personal use
- **Production (public listing)** — personal accounts created after Nov 2023 need a closed test with **12 opted-in testers for 14 consecutive days** before applying for production access. Testers can be friends/family; they must opt in via Play, not just receive an email.

## Known product gaps (no blockers for a dev build)

- **Sign in with Apple** is hidden on Android (`AppleSigninButton` returns `null`). Google + email/password only.
- **Delete account** refuses Apple re-auth off iOS. Users who signed up with Apple on iPhone cannot delete their account from Android.

## Already done

- `android.package` and dev/prod variants in `app.config.js`
- Adaptive icon and splash config
- App Links intent filter
- `expo run:android` script in `package.json`
- Platform checks for Apple-only flows
- `plugins/RNFBfix.js` is iOS-only; no Android equivalent needed
