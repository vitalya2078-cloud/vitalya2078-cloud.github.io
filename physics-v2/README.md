# PHYSICS — next-generation physics learning platform

This directory contains the new cross-platform PHYSICS application foundation.
The existing fizika/ and fizika-android/ projects are preserved.

## Product targets

- Android: installable APK.
- iPhone/iPad: installable Progressive Web App (PWA), added from Safari to the Home Screen.
- Windows: future standalone EXE.
- Desktop browsers: responsive web application.

## Architecture

- Local-first operation: core learning, tests, progress and preferences are designed to work offline.
- IndexedDB is the browser/PWA storage layer; native shells will use SQLite through a storage adapter.
- Supabase/PostgreSQL is the cloud database and synchronization target when connectivity is available.
- Offline changes will be queued locally and synchronized when connectivity returns.
- Assessment attempts are append-only; progress and favorites use explicit merge rules.
- The approved legacy bank of 900 questions is preserved as an immutable source dataset.
- The curriculum is separate from the legacy question bank and is versioned independently.
- Authentication is intentionally deferred. User-specific API routes and sync writes remain disabled until Auth and ownership-based RLS policies are implemented.

## Supabase project

Project: PHYSICS  
Project ref: vqiljksvsdjmwbbngimg  
Region: eu-west-2

Database schema: physics (private, not exposed to browser Data API).

Active database migrations:

- supabase/migrations/20261108104124_physics_foundation_v1.sql
- supabase/migrations/20261108104138_physics_security_indexes_v1.sql
- supabase/migrations/20261108104251_official_question_bank_provenance.sql

Official question bank seed:

- supabase/seed/official-900.sql
- Source file: fizika/src/data.json
- Expected and imported count: 900 questions in 9 original topics.

## Public read-only API

The deployed Supabase Edge Function is physics-api.

Base URL:
https://vqiljksvsdjmwbbngimg.supabase.co/functions/v1/physics-api

Routes:

- GET /health
- GET /v1/catalog
- GET /v1/lessons/{uuid}

The public API returns only active programs and published curriculum content. It does not expose user profiles, progress, attempts, favorites, mistakes, goals, or synchronization records. It implements GET and OPTIONS only.

API details: supabase/API.md  
Function source: supabase/functions/physics-api/

## Security rules

- Never commit database passwords, service-role keys, secret keys, or Supabase access tokens.
- Never place a service-role/secret key in browser code.
- Keep the physics schema private.
- Keep deny-all policies until a real authorization model is implemented.
- Add user-specific endpoints only after Auth and owner-scoped RLS policies are tested.


## Local-first storage slice

The browser/PWA storage layer is implemented with Dexie over IndexedDB.

- Existing profile, progress, attempt, favorite, error and sync-queue stores are preserved.
- Database schema v2 adds published catalog and lesson caches, local settings and sync metadata.
- Catalog and lesson requests use network-first behavior with an IndexedDB fallback.
- The service worker caches the application shell and same-origin build assets for offline reopening.
- Local attempts are append-only; a local write and its pending sync operation are committed in one IndexedDB transaction.
- Sync queue entries are not uploaded yet. Authentication and owner-scoped cloud writes remain disabled until the separate security stage.
