# PHYSICS — Local First synchronization and conflict rules

Status: implementation contract; authenticated sync endpoints remain disabled.

## Identity and trust boundary

- The authenticated user ID must come only from a verified Supabase Auth JWT. Never trust a client-supplied `user_id`.
- Every registered sync device is owned by one authenticated user. A device ID supplied by the client must be checked against that ownership.
- The browser never receives the service-role or database secret.
- The `physics` schema remains private. Client access is through authenticated Edge Functions and owner-scoped database operations only.
- Do not activate user sync until Auth, device enrollment, RLS ownership predicates, and server-side validation have passed security tests.

## Operation idempotency

The existing `physics.sync_operations` table has a unique constraint on `(user_id, device_id, operation_id)`. Every local queue entry therefore needs a stable UUID operation ID, retained unchanged across retries.

Server transaction for each operation:

1. Verify JWT and device ownership.
2. Insert the operation envelope into `sync_operations`.
3. If the unique key already exists, return the previously stored result. Do not apply the payload again.
4. Validate entity type, operation type, entity ownership, and payload schema.
5. Apply the domain mutation in the same database transaction.
6. Mark the envelope as applied, conflict, or rejected and store a result.
7. Return the server result and a monotonic sync cursor.

A transient network retry must never create a second attempt or increment a mistake counter twice.

## Domain merge rules

### Assessment attempts

- Attempts are append-only.
- Use the client attempt UUID as the stable attempt identity; the existing `test_attempts` table has a unique key on `(user_id, client_attempt_id)`.
- A repeated attempt ID returns the existing attempt and never overwrites its score, answers, or timestamps.
- Store every attempt, including training, final, exam, and review modes. Only final assessment attempts update lesson mastery.

### Lesson mastery and progress

- `best_score` is the maximum accepted final-assessment percentage.
- `best_grade` is derived from the best score using the PHYSICS grade thresholds.
- `is_mastered` is monotonic: once true, it never returns to false.
- `mastered_at` is set once, on the first transition to mastered.

- Local progress writes are monotonic too: status cannot move backward, completion percentage cannot decrease, and best score/grade remain the maximum observed values. The latest grade remains separately tracked.
- `last_attempt_at` follows the newest accepted final attempt.
- Per-block progress must merge by stable block ID and per-record version; never replace the entire JSON object with a stale device snapshot.

### Mistakes

- The cloud `mistake_items` table is an aggregate per user and official question. It has a unique key on `(user_id, official_question_id)`.
- Apply a miss as an atomic server-side increment, protected by the idempotent operation envelope. Never overwrite `miss_count` with a client-provided total.
- Preserve the earliest `first_missed_at`, update `last_missed_at`, and do not clear `corrected_at` merely because an old device retries an earlier miss.
- The local queue must retain the stable operation UUID until the server confirms the operation.

### Favorites and deletions

- Additions and removals are operations, not whole-list replacement.
- A removal must leave a deletion tombstone or equivalent versioned entity state until all older device operations are outside the accepted sync window. Otherwise a delayed offline insert can resurrect a removed favorite.
- The current cloud favorites table is a live-row table. Before implementing sync, add and test a versioned tombstone mechanism or a server-side per-entity mutation cursor.

### Settings and profile

- Settings are merged per key, not as one profile blob.
- For simple preferences, use last-writer-wins with server receipt time and a deterministic device/version tie-breaker.
- Do not use user-editable JWT metadata for roles, organization membership, or permissions.

## Sync ordering and recovery

- Each device keeps its own monotonically increasing client version.
- The server cursor is independent of device clocks and is used for pull pagination.
- A client acknowledges and removes local operations only after receiving a durable server result.
- Conflict and rejected operations remain inspectable and recoverable; they are not silently discarded.
- A full resync must be possible without deleting local-only records.
- A backup restore merges records and keeps local attempts append-only.

## Current implementation boundary

The browser currently persists local attempts, progress, mistakes, favorites, and queued operations in IndexedDB. Queue management is implemented, but it intentionally performs no network delivery. Authenticated delivery is a later security milestone.

## Backup merge invariants now covered by local tests

Backup restoration applies the following merge rules before writing records:

- Assessment attempts are append-only; an existing local attempt with the same ID is never overwritten by an imported copy.
- Lesson progress cannot regress from mastered, and completion/best score/best grade do not decrease when merging a stale backup.
- Mistake aggregates preserve the larger recorded count and earliest first-seen timestamp; the newest record controls last-seen/correction state.
- Favorite deletions are honored from the newest retained favorite operation, so an older backup cannot resurrect an item after a queued delete.
- The merged sync queue is retained so pending operations remain available for a future authenticated sync phase.

These rules are local backup-restore behavior only. They do not replace server-side idempotency, ownership checks, or versioned tombstones required before network sync is enabled.

## Canonical entity identifiers in the local queue

The local IndexedDB primary key is not always the cloud entity key. Sync adapters must route by the stable domain target:

- Progress operations use `LocalProgress.entityId` (for example, the lesson UUID), not the locally generated `LocalProgress.id`.
- Favorite operations use the target UUID and include `targetType` in the payload. Deletions retain the target type and target ID in their tombstone payload.
- Attempt operations use the immutable client attempt UUID.
- Mistake operations use the official question UUID.
- Profile IDs are local profile-record identifiers only; the server derives the owning account from the verified JWT and must not treat a client profile ID as an authorization claim.

Cloud mapping confirmed against the current private schema:

- `lesson_progress` is unique by `(user_id, lesson_id)` and stores per-block progress in `block_progress` JSONB.
- `lesson_mastery` is separately unique by `(user_id, lesson_id)`.
- Section/topic progress is derived from descendant lesson progress; it does not need an independently synchronized cloud row.
- Per-block state must merge by stable lesson-block UUID inside `block_progress`; a stale device must never replace the entire JSON object.
- The current favorites table is unique by `(user_id, target_type, target_id)` but has no deletion tombstone, so network delivery remains disabled until that server-side mechanism is added.

Local queue operations now carry canonical target IDs for progress and favorites. Tests assert those identifiers. This does not enable network sync; the authenticated adapter and server-side ownership/validation remain unimplemented.

## Local-to-cloud field mapping

The current schema's allowed values were inspected directly before designing the sync adapter:

- Local attempt status `completed` maps to cloud `test_attempts.status = submitted`; `in_progress` and `abandoned` keep their names.
- Local attempt mode `diagnostic` maps to cloud `custom`. The other currently shared modes (`training`, `final`, `exam`) retain their names. Attempt answers and the derived grade belong in the cloud `metadata` JSONB because the table has no standalone answers column.
- Local progress status `mastered` maps to cloud `lesson_progress.status = completed` plus the corresponding `lesson_mastery.is_mastered = true`. The local label must not be sent verbatim because the cloud check constraint accepts only `not_started`, `in_progress`, and `completed`.
- A lesson's best score/grade belongs in `lesson_mastery`; lesson reading/completion and the stable per-block state belong in `lesson_progress`.
- Local sync status `synced` maps to the server's durable `applied` result. `failed` is a client retry state, not a server status; server outcomes are `pending`, `applied`, `conflict`, or `rejected`.
- Local mistake `errorCount` is not a cloud replacement value. Each accepted idempotent miss operation increments cloud `miss_count` atomically.

These translations must be implemented and tested in the sync adapter before any delivery is enabled. Current DB check constraints and unique keys are the source of truth; do not send local enum values directly without translation.
