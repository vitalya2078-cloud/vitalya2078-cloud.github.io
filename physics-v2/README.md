# PHYSICS — next-generation platform

This directory contains the new cross-platform PHYSICS application foundation.
The existing `fizika/` and `fizika-android/` projects are preserved.

## Product targets

- Android: installable APK.
- iPhone/iPad: installable Progressive Web App (PWA), added from Safari to the Home Screen.
- Windows: future standalone EXE.
- Desktop browsers: responsive web application.

## Architecture decisions

- Local-first operation: core learning, tests, progress and preferences work offline.
- Supabase/PostgreSQL is the cloud database and synchronization target when connectivity is available.
- Browser storage uses IndexedDB; native shells use SQLite through a storage adapter.
- Offline changes are queued locally and synchronized when connectivity returns.
- Assessment attempts are append-only; progress and favorites use explicit merge rules.
- The approved legacy bank of 900 questions is kept as an immutable source dataset.
- The curriculum is separate from the legacy question bank and is versioned independently.
- Authentication is intentionally deferred; profile records already have an optional Supabase Auth link for later account activation.

## Database

Initial schema migration:

`supabase/migrations/202611080001_initial_schema.sql`

Apply migrations to a Supabase project only after its project is selected and credentials/permissions are configured. Never commit Supabase service-role keys or other secrets.
