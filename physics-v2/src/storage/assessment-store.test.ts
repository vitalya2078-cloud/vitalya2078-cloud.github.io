import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { localDb, type LocalAttempt } from './db';
import { saveFinalAssessment } from './assessment-store';

function makeAttempt(
  id: string,
  scorePercent: number,
  wrongQuestionIds: string[] = [],
): LocalAttempt {
  return {
    id,
    mode: 'final',
    status: 'completed',
    scorePercent,
    grade: scorePercent >= 90 ? 5 : scorePercent >= 75 ? 4 : scorePercent >= 60 ? 3 : 2,
    startedAt: '2026-11-08T10:00:00.000Z',
    completedAt: '2026-11-08T10:10:00.000Z',
    answers: [
      ...wrongQuestionIds.map((questionId) => ({
        questionId,
        selectedOptionIds: ['wrong-option'],
        isCorrect: false,
      })),
      {
        questionId: 'correct-question',
        selectedOptionIds: ['right-option'],
        isCorrect: true,
      },
    ],
  };
}

describe('saveFinalAssessment', () => {
  beforeEach(async () => {
    await localDb.delete();
    await localDb.open();
  });

  it('stores an attempt, mastery and errors in one local transaction', async () => {
    const attempt = makeAttempt('attempt-1', 82, ['q-1', 'q-2']);
    const saved = await saveFinalAssessment({
      attempt,
      lessonId: 'lesson-1',
    });

    expect(await localDb.attempts.get('attempt-1')).toEqual({ ...attempt, grade: 4 });
    expect(saved.progress.status).toBe('mastered');
    expect(saved.progress.bestGrade).toBe(4);
    expect(saved.progress.bestScore).toBe(82);
    expect(saved.updatedErrors).toBe(2);
    expect((await localDb.errors.get('q-1'))?.errorCount).toBe(1);
    expect(await localDb.syncQueue.count()).toBe(4);
    const progressOperation = await localDb.syncQueue
      .where('entityType')
      .equals('progress')
      .first();
    expect(progressOperation?.entityId).toBe('lesson-1');
  });

  it('does not revoke mastery after a lower later result', async () => {
    await saveFinalAssessment({
      attempt: makeAttempt('attempt-1', 80),
      lessonId: 'lesson-1',
    });

    const later = makeAttempt('attempt-2', 45);
    later.completedAt = '2026-11-09T10:10:00.000Z';

    const saved = await saveFinalAssessment({
      attempt: later,
      lessonId: 'lesson-1',
    });

    expect(saved.progress.status).toBe('mastered');
    expect(saved.progress.bestGrade).toBe(4);
    expect(saved.progress.bestScore).toBe(80);
    expect(saved.progress.latestGrade).toBe(2);
    expect(await localDb.attempts.count()).toBe(2);
  });

  it('rejects duplicate attempt IDs without overwriting history', async () => {
    const attempt = makeAttempt('attempt-1', 70);
    await saveFinalAssessment({ attempt, lessonId: 'lesson-1' });

    await expect(
      saveFinalAssessment({ attempt, lessonId: 'lesson-1' }),
    ).rejects.toThrow('already been saved');

    expect(await localDb.attempts.count()).toBe(1);
  });

  it('rolls back the whole transaction when progress persistence fails', async () => {
    const attempt = makeAttempt('attempt-1', 70);
    const originalPut = localDb.progress.put.bind(localDb.progress);

    localDb.progress.put = (() => {
      throw new Error('simulated storage failure');
    }) as typeof localDb.progress.put;

    await expect(
      saveFinalAssessment({ attempt, lessonId: 'lesson-1' }),
    ).rejects.toThrow('simulated storage failure');

    localDb.progress.put = originalPut;

    expect(await localDb.attempts.count()).toBe(0);
    expect(await localDb.syncQueue.count()).toBe(0);
  });
});
