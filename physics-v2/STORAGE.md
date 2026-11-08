# PHYSICS local storage and backup

## Local-first contract

The browser database is the primary write target for offline-capable user activity. The cloud API is not required for local writes. A future authenticated sync worker will read the durable queue and submit idempotent operations after the user signs in.

The local database currently stores profiles, progress, immutable attempts, favorites, mistakes, queued operations, published catalog/lesson caches, settings, and sync metadata.

## Backup format

- Format identifier: `physics-local-backup`
- Format version: `2` (matches the current Dexie database schema)
- JSON file, maximum accepted import size: 25 MiB
- Export includes all local tables, including unsent queue entries and downloaded lesson cache.
- Import is transactional and merge-only; it never clears the current database.
- Attempts are append-only by ID. Existing attempt IDs are retained and never replaced by imported values.
- Timestamped records keep the newest version where the record type supports timestamps.
- Import rejects unknown formats, unsupported versions, missing collections, and records without primary keys.

## Sync safety

Do not send queued personal data until Auth and ownership policies are implemented and verified. Every queued operation has a stable operation ID; the future server endpoint must use that ID as an idempotency key. A retry must not create a duplicate attempt or overwrite an earlier attempt.

## Browser storage limitations

IndexedDB is device-local and may be cleared by browser settings or storage pressure. The app must surface backup/export and storage-health affordances before production release. Offline capability must be tested on Android Chrome and iOS Safari/PWA; service-worker support and persistence behavior differ by browser.


## Sync queue lifecycle

The queue API in `src/storage/sync-queue.ts` provides deterministic pending-operation reads, success marking, retryable/permanent failure recording, explicit retry of failed operations, queue statistics, and cleanup of old successful operations.

No queue function sends data over the network. Network delivery is intentionally absent until authentication, device ownership, authorization policies, and idempotent server writes are implemented and tested. A transient failure remains pending; a permanent rejection is marked failed and requires explicit retry.


## Native Android storage

The native Android client uses Room/SQLite in `physics-v2/android`; it does not use the browser's IndexedDB database or WebView storage.

Current Room tables:
- `local_profile`: nickname, selected education tracks, class/course.
- `lesson_progress`: local learning state and result fields.
- `test_attempts`: append-only attempt records.
- `favorites`: saved content references.
- `mistakes`: incorrect-answer review state.
- `app_settings`: local preferences.
- `catalog_cache`: last successfully downloaded published catalog.
- `sync_operations`: durable pending/synced/failed operation queue.

Room migrations are explicit and versioned. The queue currently records operations but does not transmit personal data; delivery remains disabled until the authentication and server-side authorization contract is ready. The public curriculum catalog is read-only and can be cached locally.
