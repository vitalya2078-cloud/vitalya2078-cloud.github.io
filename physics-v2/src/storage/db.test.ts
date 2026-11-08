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

  it('stores the local profile without enqueueing an unsupported cloud write', async () => {
    const profile = {
      id: 'profile-1',
      nickname: 'Learner',
      createdAt: '2026-11-08T10:00:00.000Z',
      updatedAt: '2026-11-08T10:00:00.000Z',
    };

    await saveLocalProfile(profile);

    expect(await localDb.profiles.get('profile-1')).toEqual(profile);
    expect(await localDb.syncQueue.count()).toBe(0);
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
      id: 'progress-2-from-another-device',
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
    const progressOperations = await localDb.syncQueue
      .where('entityType')
      .equals('progress')
      .toArray();
    expect(progressOperations.every((operation) => operation.entityId === 'lesson-2')).toBe(true);
    expect(await localDb.progress.count()).toBe(1);
  });

  it('keeps derived section and topic progress local-only', async () => {
    await saveLocalProgress({
      id: 'topic-progress',
      entityType: 'topic',
      entityId: 'topic-1',
      status: 'in_progress',
      completionPercent: 25,
      updatedAt: '2026-11-08T10:00:00.000Z',
    });

    expect(await localDb.progress.get('topic-progress')).toBeDefined();
    expect(await localDb.syncQueue.count()).toBe(0);
  });

  it('queues one favorite insert and a canonical delete', async () => {
    const favorite = {
      id: 'favorite-1',
      targetType: 'lesson',
      targetId: 'lesson-1',
      createdAt: '2026-11-08T10:00:00.000Z',
    };

    await saveLocalFavorite(favorite);
    await saveLocalFavorite({
      ...favorite,
      id: 'favorite-from-another-device',
    });
    await removeLocalFavorite(favorite.id);

    const operations = await localDb.syncQueue
      .where('entityType')
      .equals('favorite')
      .sortBy('createdAt');

    expect(operations.map((operation) => operation.operation).sort()).toEqual([
      'delete',
      'insert',
    ]);
    const deletion = operations.find((operation) => operation.operation === 'delete');
    expect(deletion?.entityId).toBe('lesson-1');
    expect(deletion?.payload).toMatchObject({
      targetType: 'lesson',
      targetId: 'lesson-1',
    });
    expect(await localDb.favorites.count()).toBe(0);
  });

  it('does not queue deletion for a favorite that does not exist', async () => {
    await removeLocalFavorite('missing');
    expect(await localDb.syncQueue.count()).toBe(0);
  });
});
