import { describe, expect, it } from 'vitest';
import { mapLocalSyncOperation } from './sync-mapping';
import type { SyncOperation } from './db';

function operation(
  entityType: string,
  payload: unknown,
  operationType: SyncOperation['operation'] = 'insert',
): SyncOperation {
  return {
    id: 'operation-1',
    entityType,
    entityId: 'entity-1',
    operation: operationType,
    payload,
    createdAt: '2026-11-08T10:00:00.000Z',
    status: 'pending',
    attempts: 0,
  };
}

describe('local-to-cloud sync mapping', () => {
  it('maps completed diagnostic attempts to the cloud enum values', () => {
    const result = mapLocalSyncOperation(operation('attempt', {
      id: 'attempt-1',
      mode: 'diagnostic',
      status: 'completed',
      scorePercent: 84,
      grade: 4,
      startedAt: '2026-11-08T10:00:00.000Z',
      completedAt: '2026-11-08T10:10:00.000Z',
      answers: [{ questionId: 'q-1', selectedOptionIds: ['a'], isCorrect: true }],
    }));

    expect(result).toMatchObject({
      status: 'mapped',
      command: {
        entityType: 'test_attempt',
        entityId: 'attempt-1',
        payload: {
          mode: 'custom',
          status: 'submitted',
          score: 84,
          metadata: { grade: 4 },
        },
      },
    });
  });

  it('maps mastered lesson progress to completed plus mastery', () => {
    const result = mapLocalSyncOperation(operation('progress', {
      id: 'local-progress-id',
      entityType: 'lesson',
      entityId: 'lesson-uuid',
      status: 'mastered',
      completionPercent: 100,
      bestScore: 92,
      bestGrade: 5,
      latestGrade: 5,
      updatedAt: '2026-11-08T10:10:00.000Z',
    }));

    expect(result).toMatchObject({
      status: 'mapped',
      command: {
        entityType: 'lesson_progress',
        entityId: 'lesson-uuid',
        payload: {
          lesson_progress: { lesson_id: 'lesson-uuid', status: 'completed', completion_percent: 100 },
          lesson_mastery: { lesson_id: 'lesson-uuid', is_mastered: true, best_score: 92, best_grade: 5 },
        },
      },
    });
    if (result.status === 'mapped') {
      expect(result.command.payload.lesson_mastery).not.toHaveProperty('mastered_at');
    }
  });

  it('does not map derived section/topic or orphan block progress to cloud rows', () => {
    const result = mapLocalSyncOperation(operation('progress', {
      id: 'local-progress-id',
      entityType: 'topic',
      entityId: 'topic-uuid',
      status: 'in_progress',
      completionPercent: 30,
      updatedAt: '2026-11-08T10:10:00.000Z',
    }));

    expect(result.status).toBe('local_only');
  });

  it('maps favorite deletions by canonical target and preserves target type', () => {
    const result = mapLocalSyncOperation(operation('favorite', {
      targetType: 'lesson',
      targetId: 'lesson-uuid',
      favoriteId: 'local-favorite-id',
    }, 'delete'));

    expect(result).toMatchObject({
      status: 'mapped',
      command: {
        entityType: 'favorite',
        entityId: 'lesson-uuid',
        operationType: 'delete',
        payload: { target_type: 'lesson', target_id: 'lesson-uuid' },
      },
    });
  });

  it('maps a mistake as one idempotent miss operation without sending aggregate count', () => {
    const result = mapLocalSyncOperation(operation('error', {
      id: 'question-uuid',
      questionId: 'question-uuid',
      errorCount: 7,
      firstSeenAt: '2026-11-07T10:00:00.000Z',
      lastSeenAt: '2026-11-08T10:00:00.000Z',
    }, 'update'));

    expect(result).toMatchObject({
      status: 'mapped',
      command: {
        entityType: 'mistake',
        entityId: 'question-uuid',
        operationType: 'update',
        payload: {
          official_question_id: 'question-uuid',
          first_missed_at: '2026-11-07T10:00:00.000Z',
          last_missed_at: '2026-11-08T10:00:00.000Z',
        },
      },
    });
    if (result.status === 'mapped') {
      expect(result.command.payload).not.toHaveProperty('miss_count');
    }
  });
});
