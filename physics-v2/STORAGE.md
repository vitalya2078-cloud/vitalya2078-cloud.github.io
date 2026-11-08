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
