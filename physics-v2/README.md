# PHYSICS — next-generation physics learning platform

This directory contains the new PHYSICS product foundation. The legacy `fizika/` and `fizika-android/` projects are preserved and are not used as the PHYSICS v2 Android client.

## Product targets

- Android: fully native installable APK.
- iPhone/iPad: installable PWA, added to the Home Screen from Safari.
- Desktop: responsive browser application.
- Windows: future standalone package.

## Platform architecture

### Android

The Android client is a native project in `android/`:

- Kotlin + Jetpack Compose + Material 3.
- Room/SQLite for local data.
- Kotlin coroutines and Flow for asynchronous work and reactive state.
- WorkManager is reserved for future authenticated background synchronization.
- No WebView, Capacitor, TWA, or embedded web app.
- Debug APKs are built and tested in GitHub Actions. Release signing will be configured separately; signing keys never belong in the repository.

### iOS and desktop web

The React + TypeScript + Vite client is used for iOS PWA and desktop browsers. It has its own IndexedDB/Dexie local storage.

The clients share curriculum identifiers, official question-bank source data, grading rules, API contracts, and cloud sync semantics. They do not share UI code or assume a common local database.

## Local-first contract

- Local writes happen before any network operation.
- Downloaded curriculum, question bank, progress, attempts, favorites, mistakes, and settings remain available offline.
- Android uses Room/SQLite; PWA uses IndexedDB.
- Attempts are append-only. Best and latest results are separate.
- Mastery is monotonic and cannot regress.
- Pending sync operations are durable and idempotent. They are stored locally but are not transmitted until authentication and owner-scoped server authorization are implemented.
- The app must expose pending-sync and storage state and support backup/restore before production release.

## Official immutable question bank

The institution-approved 900-question bank is preserved as an immutable snapshot.

- Source table: `physics.official_questions`.
- Source file: `fizika/src/data.json`.
- Nine original topics, exactly 100 questions each.
- Question text, correct answer, distractors, illustration references, and original explanation payload are copied without rewriting.
- The native Android APK bundles `android/app/src/main/assets/official-question-bank.json` for offline access.
- CI validates all 900 records, unique IDs, topic counts, question numbering, and consistency between the copied fields and the original payload.

Native test modes:
- Training: all 900 questions, no grade or penalties, explanation after each answer. Questions without distractors use self-assessment after revealing the answer.
- Final assessment: multiple-choice questions, score converted to the approved grade scale.
- Wrong answers are stored in the local mistake list.
- Completed attempts are append-only and stored in Room.
- Results and progress are written locally before any future cloud sync.

Questions with illustrations load them from the project's trusted mirrors on demand and cache them on the device. An illustration not yet cached requires internet on its first view; the text bank itself is bundled offline.

## Supabase backend

Project: PHYSICS  
Project ref: `vqiljksvsdjmwbbngimg`  
Region: `eu-west-2`  
Database schema: `physics` (private, not exposed to browser Data API).

Active migrations:

- `supabase/migrations/20261108104124_physics_foundation_v1.sql`
- `supabase/migrations/20261108104138_physics_security_indexes_v1.sql`
- `supabase/migrations/20261108104251_official_question_bank_provenance.sql`

The deployed `physics-api` Edge Function is read-only and exposes only published curriculum and lesson data:

- `GET /health`
- `GET /v1/catalog`
- `GET /v1/lessons/{uuid}`

Base URL: `https://vqiljksvsdjmwbbngimg.supabase.co/functions/v1/physics-api`

It does not expose user profiles, progress, attempts, favorites, mistakes, goals, or synchronization records. Auth and write routes remain disabled until the security model is implemented and tested.

## Current implementation

### Native Android

Working:
- Native six-section navigation and adaptive launcher icon.
- First-run profile setup with multiple education-track selection and class/course.
- Room database with versioned migrations.
- Local-first profile, progress, attempts, mistakes, and durable sync-operation queue.
- Offline bundled official question bank (900 questions).
- Training and final assessment flows, grading, explanation display, and mistake capture.
- Learning catalog fetch from the read-only Supabase API with Room offline cache.
- Interactive free-fall laboratory model.
- Local progress dashboard.
- Light/dark colors follow the Android system setting.

Not yet enabled:
- Full lesson reader and lesson authoring/review UI.
- Authentication and secure cloud sync delivery.
- Native backup import/export UI.
- Teacher dashboard.
- Production release signing.
- Windows package.

### iOS PWA and desktop web

The responsive React app, IndexedDB storage, offline shell, catalog cache, profile, progress, and free-fall laboratory are implemented. The web Testing screen is still being brought into parity with the native question engine.

## Build and validation

GitHub Actions workflow: `.github/workflows/physics-v2-build.yml`

Jobs:
- Web: production dependency audit, TypeScript build, domain tests, PWA smoke test, and public API smoke test.
- Android: native APK compilation, Kotlin unit tests, and debug APK artifact upload.

The Android debug APK is for testing and is not production-signed. Install/update compatibility for production requires a separately protected release signing key.
