# PHYSICS API

Supabase Edge Function: physics-api

## Base URL

https://vqiljksvsdjmwbbngimg.supabase.co/functions/v1/physics-api

## Routes

- GET /health — service and database connectivity.
- GET /v1/catalog — active programs and published curriculum hierarchy.
- GET /v1/lessons/{uuid} — a published lesson and its ordered content blocks.

## Security boundary

This first API slice is intentionally read-only and returns only published educational
content. It does not expose user profiles, progress, test attempts, sync operations,
or unpublished content.

The function uses the server-provided SUPABASE_DB_URL only inside the Edge Function.
No database credentials are included in browser code or committed to Git.

CORS does not grant database access. All SQL statements are fixed or parameterized.
No write method is implemented.

User-specific endpoints (profile, attempts, progress, favorites, mistakes, goals,
and synchronization) must be added only after Supabase Auth is enabled and
ownership-based RLS policies are designed. Do not put a service-role key in the
client or relax the current deny-all policies to make those endpoints work.

## Response conventions

- Successful responses use { data, meta? }.
- Errors use { error: { code, message } }.
- Unknown routes return 404; unsupported methods return 405.
- Published content responses may be cached briefly. Health responses are not cached.

## Deployment

The function source lives in supabase/functions/physics-api/.
Keep verify_jwt = false only while the function remains strictly read-only and
serves public curriculum content. Any route that accesses user-specific data must
use verified user authentication and user-scoped authorization.
