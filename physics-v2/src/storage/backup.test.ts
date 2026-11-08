import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  createLocalBackup,
  restoreLocalBackup,
} from './backup';
import { localDb, type LocalAttempt } from './db';

function attempt(id: string, scorePercent: number): LocalAttempt {
  return {
    id,
    mode: 'final',
    status: 'completed',
    scorePercent,
    grade: scorePercent >= 60 ? 3 : 2,
    startedAt: '2026-11-08T10:00:00.000Z',
    completedAt: '2026-11-08T10:05:00.000Z',
    answers: [],
  };
}

describe('local backup', () => {
  beforeEach(async () => {
    await localDb.delete();
    await localDb.open();
  });

  it('exports and restores local attempts without overwriting existing history', async () => {
    await localDb.attempts.add(attempt('attempt-original', 82));
    await localDb.progress.add({
      id: 'progress-1',
      entityType: 'lesson',
      entityId: 'lesson-1',
      status: 'mastered',
      completionPercent: 100,
      bestScore: 82,
      bestGrade: 4,
      latestGrade: 4,
      updatedAt: '2026-11-08T10:05:00.000Z',
    });

    const backup = await createLocalBackup();

    await localDb.attempts.put(attempt('attempt-original', 30));
    await localDb.attempts.add(attempt('attempt-local-only', 65));

    const result = await restoreLocalBackup(backup as File);

    expect(result.preservedAttempts).toBe(2);
    expect(await localDb.attempts.get('attempt-original')).toMatchObject({
      scorePercent: 30,
    });
    expect(await localDb.attempts.get('attempt-local-only')).toBeDefined();
    expect(await localDb.attempts.count()).toBe(2);
    expect(await localDb.progress.get('progress-1')).toBeDefined();
  });

  it('does not restore stale progress over mastered progress', async () => {
    await localDb.progress.add({
      id: 'progress-monotonic',
      entityType: 'lesson',
      entityId: 'lesson-2',
      status: 'in_progress',
      completionPercent: 40,
      bestScore: 40,
      bestGrade: 2,
      latestGrade: 2,
      updatedAt: '2026-11-08T10:00:00.000Z',
    });

    const backup = await createLocalBackup();

    await localDb.progress.put({
      id: 'progress-monotonic',
      entityType: 'lesson',
      entityId: 'lesson-2',
      status: 'mastered',
      completionPercent: 100,
      bestScore: 95,
      bestGrade: 5,
      latestGrade: 5,
      updatedAt: '2026-11-09T10:00:00.000Z',
    });

    await restoreLocalBackup(backup as File);

    expect(await localDb.progress.get('progress-monotonic')).toMatchObject({
      status: 'mastered',
      completionPercent: 100,
      bestScore: 95,
      bestGrade: 5,
    });
  });

  it('honors favorite deletion tombstones when restoring an older backup', async () => {
    await localDb.favorites.add({
      id: 'favorite-deleted',
      targetType: 'lesson',
      targetId: 'lesson-3',
      createdAt: '2026-11-08T10:00:00.000Z',
    });

    const backup = await createLocalBackup();

    await localDb.favorites.delete('favorite-deleted');
    await localDb.syncQueue.add({
      id: 'favorite-delete-op',
      entityType: 'favorite',
      entityId: 'favorite-deleted',
      operation: 'delete',
      payload: null,
      createdAt: '2026-11-09T10:00:00.000Z',
      status: 'pending',
      attempts: 0,
    });

    await restoreLocalBackup(backup as File);

    expect(await localDb.favorites.get('favorite-deleted')).toBeUndefined();
    expect(await localDb.syncQueue.get('favorite-delete-op')).toBeDefined();
  });

  it('rejects unsupported backup formats without changing local data', async () => {
    await localDb.attempts.add(attempt('keep-me', 70));
    const invalid = new Blob([
      JSON.stringify({
        format: 'unknown',
        version: 1,
        data: {},
      }),
    ]);

    await expect(restoreLocalBackup(invalid as File)).rejects.toThrow(
      'Unsupported or invalid PHYSICS backup file',
    );

    expect(await localDb.attempts.count()).toBe(1);
  });
});
