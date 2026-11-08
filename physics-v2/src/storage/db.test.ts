import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  localDb,
  saveLocalFavorite,
  saveLocalProfile,
  saveLocalProgress,
  removeLocalFavorite,
} from './db';

describe('local record persistence', () => {
  beforeEach(async () => {
    await localDb.delete();
    await localDb.open();
  });

  it('queues insert for new records and update for existing records', async () => {
    const profile = {
      id: 'profile-1',
      nickname: 'Learner',
      createdAt: '2026-11-08T10:00:00.000Z',
      updatedAt: '2026-11-08T10:00:00.000Z',
    };

    await saveLocalProfile(profile);
    await saveLocalProfile({
      ...profile,
      nickname: 'Learner 2',
      updatedAt: '2026-11-08T11:00:00.000Z',
    });

    const operations = await localDb.syncQueue
      .where('entityType')
      .equals('profile')
      .sortBy('createdAt');

    expect(operations.map((operation) => operation.operation).sort()).toEqual([
      'insert',
      'update',
    ]);
  });

  it('does not let mastered progress regress', async () => {
    const base = {
      id: 'progress-1',
      entityType: 'lesson' as const,
      entityId: 'lesson-1',
      completionPercent: 100,
      bestScore: 91,
      bestGrade: 5,
      latestGrade: 5,
      updatedAt: '2026-11-08T10:00:00.000Z',
    };

    await saveLocalProgress({
      ...base,
      status: 'mastered',
    });

    await saveLocalProgress({
      ...base,
      status: 'in_progress',
      completionPercent: 25,
      bestScore: 25,
      bestGrade: 2,
      latestGrade: 2,
      updatedAt: '2026-11-09T10:00:00.000Z',
    });

    const progress = await localDb.progress.get('progress-1');
    expect(progress?.status).toBe('mastered');
    expect(progress?.completionPercent).toBe(100);
    expect(progress?.bestScore).toBe(91);
    expect(progress?.bestGrade).toBe(5);
    expect(progress?.latestGrade).toBe(2);
  });

  it('does not lower best score or completion on a later weaker progress update', async () => {
    await saveLocalProgress({
      id: 'progress-2',
      entityType: 'lesson',
      entityId: 'lesson-2',
      status: 'in_progress',
      completionPercent: 78,
      bestScore: 88,
      bestGrade: 4,
      latestGrade: 4,
      updatedAt: '2026-11-08T10:00:00.000Z',
    });

    await saveLocalProgress({
      id: 'progress-2',
      entityType: 'lesson',
      entityId: 'lesson-2',
      status: 'not_started',
      completionPercent: 20,
      bestScore: 20,
      bestGrade: 2,
      latestGrade: 2,
      updatedAt: '2026-11-09T10:00:00.000Z',
    });

    expect(await localDb.progress.get('progress-2')).toMatchObject({
      status: 'in_progress',
      completionPercent: 78,
      bestScore: 88,
      bestGrade: 4,
      latestGrade: 2,
    });
  });

  it('queues favorite insert, update and delete in order', async () => {
    const favorite = {
      id: 'favorite-1',
      targetType: 'lesson',
      targetId: 'lesson-1',
      createdAt: '2026-11-08T10:00:00.000Z',
    };

    await saveLocalFavorite(favorite);
    await saveLocalFavorite(favorite);
    await removeLocalFavorite(favorite.id);

    const operations = await localDb.syncQueue
      .where('entityType')
      .equals('favorite')
      .sortBy('createdAt');

    expect(operations.map((operation) => operation.operation).sort()).toEqual([
      'delete',
      'insert',
      'update',
    ]);
    expect(await localDb.favorites.count()).toBe(0);
  });

  it('does not queue deletion for a favorite that does not exist', async () => {
    await removeLocalFavorite('missing');
    expect(await localDb.syncQueue.count()).toBe(0);
  });
});
