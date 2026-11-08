import { describe, expect, it } from 'vitest';
import { mapLocalSyncOperation } from './sync-mapping';
import type { SyncOperation } from './db';

function operation(
  entityType: string,
  payload: unknown,
  operationType: SyncOperation['operation'] = 'insert',
  entityId = 'entity-1',
): SyncOperation {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    entityType,
    entityId,
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
      id: '00000000-0000-4000-8000-000000000002',
      mode: 'diagnostic',
      status: 'completed',
      scorePercent: 84,
      grade: 4,
      startedAt: '2026-11-08T10:00:00.000Z',
      completedAt: '2026-11-08T10:10:00.000Z',
      answers: [{ questionId: 'q-1', selectedOptionIds: ['a'], isCorrect: true }],
    }, 'insert', '00000000-0000-4000-8000-000000000002'));

    expect(result).toMatchObject({
      status: 'mapped',
      command: {
        entityType: 'test_attempt',
        entityId: '00000000-0000-4000-8000-000000000002',
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
      entityId: '00000000-0000-4000-8000-000000000004',
      status: 'mastered',
      completionPercent: 100,
      bestScore: 92,
      bestGrade: 5,
      latestGrade: 5,
      lastAttemptAt: '2026-11-08T10:05:00.000Z',
      updatedAt: '2026-11-08T10:10:00.000Z',
    }, 'insert', '00000000-0000-4000-8000-000000000004'));

    expect(result).toMatchObject({
      status: 'mapped',
      command: {
        entityType: 'lesson_progress',
        entityId: '00000000-0000-4000-8000-000000000004',
        payload: {
          lesson_progress: { lesson_id: '00000000-0000-4000-8000-000000000004', status: 'completed', completion_percent: 100 },
          lesson_mastery: {
            lesson_id: '00000000-0000-4000-8000-000000000004',
            is_mastered: true,
            best_score: 92,
            best_grade: 5,
            last_attempt_at: '2026-11-08T10:05:00.000Z',
          },
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
      entityId: '00000000-0000-4000-8000-000000000007',
      status: 'in_progress',
      completionPercent: 30,
      updatedAt: '2026-11-08T10:10:00.000Z',
    }, 'insert', '00000000-0000-4000-8000-000000000007'));

    expect(result.status).toBe('local_only');
  });

  it('maps favorite deletions by canonical target and preserves target type', () => {
    const result = mapLocalSyncOperation(operation('favorite', {
      targetType: 'lesson',
      targetId: '00000000-0000-4000-8000-000000000004',
      favoriteId: 'local-favorite-id',
    }, 'delete', '00000000-0000-4000-8000-000000000004'));

    expect(result).toMatchObject({
      status: 'mapped',
      command: {
        entityType: 'favorite',
        entityId: '00000000-0000-4000-8000-000000000004',
        operationType: 'delete',
        payload: { target_type: 'lesson', target_id: '00000000-0000-4000-8000-000000000004' },
      },
    });
  });

  it('maps a mistake as one idempotent miss operation without sending aggregate count', () => {
    const result = mapLocalSyncOperation(operation('error', {
      id: '00000000-0000-4000-8000-000000000006',
      questionId: '00000000-0000-4000-8000-000000000006',
      errorCount: 7,
      firstSeenAt: '2026-11-07T10:00:00.000Z',
      lastSeenAt: '2026-11-08T10:00:00.000Z',
    }, 'update', '00000000-0000-4000-8000-000000000006'));

    expect(result).toMatchObject({
      status: 'mapped',
      command: {
        entityType: 'mistake',
        entityId: '00000000-0000-4000-8000-000000000006',
        operationType: 'update',
        payload: {
          official_question_id: '00000000-0000-4000-8000-000000000006',
          first_missed_at: '2026-11-07T10:00:00.000Z',
          last_missed_at: '2026-11-08T10:00:00.000Z',
        },
      },
    });
    if (result.status === 'mapped') {
      expect(result.command.payload).not.toHaveProperty('miss_count');
    }
  });
  it('rejects update operations for append-only assessment attempts', () => {
    const result = mapLocalSyncOperation(operation('attempt', {
      id: '00000000-0000-4000-8000-000000000002',
      mode: 'final',
      status: 'completed',
      scorePercent: 80,
      grade: 4,
      startedAt: '2026-11-08T10:00:00.000Z',
      completedAt: '2026-11-08T10:10:00.000Z',
      answers: [],
    }, 'update', '00000000-0000-4000-8000-000000000002'));

    expect(result.status).toBe('invalid');
  });

  it('rejects non-UUID official question identifiers before cloud sync', () => {
    const result = mapLocalSyncOperation(operation('error', {
      id: 'legacy-question-17',
      questionId: 'legacy-question-17',
      errorCount: 1,
      firstSeenAt: '2026-11-07T10:00:00.000Z',
      lastSeenAt: '2026-11-08T10:00:00.000Z',
    }, 'insert', 'legacy-question-17'));

    expect(result.status).toBe('invalid');
  });

});
