import { localDb, type SyncOperation } from './db';

export interface SyncQueueStats {
  pending: number;
  failed: number;
  synced: number;
  total: number;
}

/**
 * Returns queued operations in deterministic creation order.
 * This module deliberately does not perform network requests; cloud sync
 * remains disabled until Auth and server-side ownership checks are ready.
 */
export async function listPendingSyncOperations(
  limit = 100,
): Promise<SyncOperation[]> {
  const safeLimit = Math.max(1, Math.min(500, Math.floor(limit)));
  await localDb.open();

  const pending = await localDb.syncQueue
    .where('status')
    .equals('pending')
    .sortBy('createdAt');

  return pending.slice(0, safeLimit);
}

export async function markSyncOperationSynced(
  operationId: string,
): Promise<boolean> {
  await localDb.open();

  return localDb.transaction('rw', localDb.syncQueue, async () => {
    const operation = await localDb.syncQueue.get(operationId);
    if (!operation) return false;

    await localDb.syncQueue.update(operationId, {
      status: 'synced',
      lastError: undefined,
    });

    return true;
  });
}

export async function recordSyncOperationFailure(
  operationId: string,
  error: unknown,
  permanent = false,
): Promise<boolean> {
  await localDb.open();

  const message =
    error instanceof Error ? error.message : String(error ?? 'Unknown error');

  return localDb.transaction('rw', localDb.syncQueue, async () => {
    const operation = await localDb.syncQueue.get(operationId);
    if (!operation) return false;

    await localDb.syncQueue.update(operationId, {
      status: permanent ? 'failed' : 'pending',
      attempts: (operation.attempts ?? 0) + 1,
      lastError: message.slice(0, 500),
    });

    return true;
  });
}

export async function retryFailedSyncOperations(): Promise<number> {
  await localDb.open();

  return localDb.transaction('rw', localDb.syncQueue, async () => {
    const failed = await localDb.syncQueue
      .where('status')
      .equals('failed')
      .toArray();

    await Promise.all(
      failed.map((operation) =>
        localDb.syncQueue.update(operation.id, {
          status: 'pending',
          lastError: undefined,
        }),
      ),
    );

    return failed.length;
  });
}

export async function getSyncQueueStats(): Promise<SyncQueueStats> {
  await localDb.open();

  const [pending, failed, synced, total] = await Promise.all([
    localDb.syncQueue.where('status').equals('pending').count(),
    localDb.syncQueue.where('status').equals('failed').count(),
    localDb.syncQueue.where('status').equals('synced').count(),
    localDb.syncQueue.count(),
  ]);

  return { pending, failed, synced, total };
}

export async function purgeSyncedOperations(
  olderThan: Date,
): Promise<number> {
  if (!Number.isFinite(olderThan.getTime())) {
    throw new Error('A valid cutoff date is required.');
  }

  await localDb.open();

  return localDb.transaction('rw', localDb.syncQueue, async () => {
    const oldSynced = await localDb.syncQueue
      .where('status')
      .equals('synced')
      .and((operation) => Date.parse(operation.createdAt) < olderThan.getTime())
      .primaryKeys();

    await localDb.syncQueue.bulkDelete(oldSynced);
    return oldSynced.length;
  });
}
