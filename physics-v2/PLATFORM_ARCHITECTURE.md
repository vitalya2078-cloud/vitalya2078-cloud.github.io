# PHYSICS platform architecture

Status: native Android architecture decision — supersedes the earlier Capacitor proposal.

## Product targets
| Target | Delivery | Implementation |
|---|---|---|
| Android | Native APK | Kotlin + Jetpack Compose + Room |
| iPhone/iPad | Installable PWA | React + TypeScript + IndexedDB |
| Desktop browser | Website/PWA | React + TypeScript + IndexedDB |
| Windows desktop | Later desktop package | Separate packaging decision after web stabilizes |

Android is a first-class native client. It is not a WebView, Capacitor shell, Trusted Web Activity, or website packaged as an APK.

## Native Android stack
- Kotlin for all Android application and domain code.
- Jetpack Compose + Material 3 for native UI.
- Room over SQLite for durable offline storage.
- Kotlin coroutines and Flow for asynchronous work and reactive local state.
- WorkManager for deferrable synchronization when the secure sync API is ready.
- Android Keystore-backed storage for future refresh/session secrets; never store credentials in ordinary Room tables.
- Gradle release pipeline in GitHub Actions. Signing keys stay in GitHub Actions secrets and are never committed.

The Android client owns its native presentation, lifecycle, navigation, persistence, and platform integrations. It does not load the React app.

## iOS and desktop web
The existing React + TypeScript + Vite client remains the iOS PWA and desktop-browser implementation. Its IndexedDB schema is web-specific. Android has its own Room schema and repository layer.

The clients share curriculum identifiers and content contracts, question/assessment rules and grading specification, public API contracts, account identity and server-side sync contract, and backup format semantics/conflict-resolution rules.

They do not share UI code or assume the same local database engine.

## Local-first contract
1. Every user action is persisted locally before any network operation.
2. The application remains usable offline for downloaded content, local practice, saved progress, favorites, mistakes, and settings.
3. Network sync is optional and never a prerequisite for a local save.
4. The local queue is durable and idempotent. Retries must not duplicate attempts.
5. Mastery is monotonic; attempts remain append-only; latest and best results are separate.
6. Backups can be exported/imported without clearing the current local database.
7. Storage availability, last sync, and pending changes must be visible to the user.

Android uses Room/SQLite. iOS PWA and browser use IndexedDB. Each platform has its own storage adapter and migration tests.

## Backend and security
Supabase is the shared backend. The currently deployed public Edge Function exposes only read-only published curriculum/lesson data.

Before account sync is enabled: implement and test authentication and session lifecycle; derive user identity from the validated JWT, never a client-supplied user ID; validate device ownership; enforce per-user access controls; add idempotent writes for attempts and progress; protect favorite deletion against stale offline resurrection; run Supabase Security Advisor and integration tests.

No service-role key, database password, or signing secret may be shipped in either client.

## Delivery pipeline
- Web: CI builds and tests the React PWA.
- Android: CI builds a native APK from physics-v2/android using Gradle; APK is uploaded as a workflow artifact.
- Android release signing is injected from GitHub Actions secrets. Debug-signed CI builds are for installation/testing only.
- iOS: install the hosted PWA from Safari. A native iOS app is not part of the initial scope.
- Windows: later decision, after Android and PWA are stable.

## Deliberately deferred
- Cross-platform shared UI.
- Native iOS application.
- Windows EXE packaging.
- Background sync until secure sync endpoints and user consent are ready.
- Native Android authentication until the account/session security design is complete.