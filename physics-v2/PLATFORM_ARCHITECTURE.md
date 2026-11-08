# PHYSICS platform architecture

Status: architecture decision for the first application release. No native wrapper has been added yet.

## Product targets

| Target | Delivery | Shared application code |
|---|---|---|
| Android | Installable APK | React + TypeScript web app inside Capacitor |
| iPhone/iPad | Installable PWA from Safari | Same web app |
| Desktop browser | Website/PWA | Same web app |
| Windows desktop | Later Tauri package | Same web app |

The first release does not require a separate native iOS application.

## Decision: one web application, one local data model

The application remains a Vite + React + TypeScript project. The web/PWA build is the canonical application. Android receives a thin Capacitor shell around that same build.

Dexie/IndexedDB remains the first-release local database on:
- Android Capacitor WebView
- iOS installed PWA
- desktop browsers
- future Tauri WebView on Windows

This avoids maintaining two independent persistence implementations while the product's data model is still evolving. Dexie schema versions remain responsible for local migrations. A native SQLite adapter is deferred until a measured requirement cannot be met reliably by IndexedDB; it must not be introduced merely for architectural symmetry.

## Why Capacitor for Android

- Reuses the web application and its tested offline data layer.
- Produces a signed Android package through GitHub Actions without requiring the user to install Android Studio or run build tools locally.
- Leaves a controlled path to native Android capabilities through plugins when a concrete feature needs them.
- Keeps the iOS product as a PWA, as requested.

The Capacitor project should contain only native-shell configuration and platform integrations. Business rules, curriculum, assessment logic, and local repositories stay in `src/`.

## Offline and storage guarantees

- Write user actions to IndexedDB before attempting network synchronization.
- Request persistent browser storage where supported; treat denial as a normal condition, not a fatal error.
- Show storage health and pending-sync state.
- Never make a successful cloud request the prerequisite for a local save.
- Keep export/import backup available on every platform.
- On iOS PWA, do not rely on background execution for sync. Synchronize on app open, foreground/resume, and explicit user action.
- Android native lifecycle events may trigger the same sync scheduler, but they do not change the data contract.

## Packaging pipeline

1. CI builds and tests the canonical web/PWA bundle.
2. Android packaging copies that exact bundle into the Capacitor shell and runs the Gradle release build in GitHub Actions.
3. CI uploads the APK as a versioned artifact; signing material stays in GitHub Actions secrets and is never committed.
4. iOS users install the PWA from the hosted HTTPS site. No Apple signing or App Store pipeline is needed for the first release.
5. Windows packaging is a later Tauri target using the same web bundle and data contract.

## Security boundaries

- No Supabase service-role key or database password may appear in the client bundle.
- Authentication tokens, if persisted, must use platform-appropriate secure storage when available; they are not ordinary profile fields.
- User sync derives the account from the authenticated session on the server.
- Device identifiers are identifiers, not authentication credentials.
- The local application remains usable without an account; account sync is an optional online capability.

## Deferred decisions

- Native SQLite migration: only after performance/storage testing demonstrates a real need.
- Windows Tauri packaging: after the Android APK and PWA flows are stable.
- Push notifications/background sync: only after user consent and platform capability checks.
- Native iOS application: not planned for the initial release.
