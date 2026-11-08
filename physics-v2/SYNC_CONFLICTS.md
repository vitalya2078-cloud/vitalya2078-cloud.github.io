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
