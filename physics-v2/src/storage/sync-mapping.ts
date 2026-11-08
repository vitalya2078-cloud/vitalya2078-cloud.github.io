import type {
  LocalAttempt,
  LocalError,
  LocalProgress,
  SyncOperation,
} from './db';

export interface CloudSyncCommand {
  operationId: string;
  clientCreatedAt: string;
  entityType: 'test_attempt' | 'lesson_progress' | 'favorite' | 'mistake';
  entityId: string;
  operationType: SyncOperation['operation'];
  payload: Record<string, unknown>;
}

export type SyncMappingResult =
  | { status: 'mapped'; command: CloudSyncCommand }
  | { status: 'local_only'; reason: string }
  | { status: 'invalid'; reason: string };

const favoriteTargetTypes = new Set([
  'lesson',
  'topic',
  'formula',
  'definition',
  'question',
  'worked_example',
  'simulation',
  'experiment',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function hasValidOperationId(operation: SyncOperation): boolean {
  return isUuid(operation.id) && Number.isFinite(Date.parse(operation.createdAt));
}

function isLocalAttempt(value: unknown): value is LocalAttempt {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.mode === 'string'
    && typeof value.status === 'string'
    && typeof value.startedAt === 'string'
    && Array.isArray(value.answers);
}

function isLocalProgress(value: unknown): value is LocalProgress {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.entityType === 'string'
    && typeof value.entityId === 'string'
    && typeof value.status === 'string'
    && typeof value.completionPercent === 'number'
    && typeof value.updatedAt === 'string';
}

function isLocalError(value: unknown): value is LocalError {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.questionId === 'string'
    && typeof value.errorCount === 'number'
    && typeof value.firstSeenAt === 'string'
    && typeof value.lastSeenAt === 'string';
}

function mapAttempt(operation: SyncOperation): SyncMappingResult {
  if (!isLocalAttempt(operation.payload)) {
    return { status: 'invalid', reason: 'Attempt payload is invalid.' };
  }

  const attempt = operation.payload;
  if (
    !hasValidOperationId(operation)
    || operation.operation !== 'insert'
    || !isUuid(attempt.id)
    || operation.entityId !== attempt.id
    || !Number.isFinite(Date.parse(attempt.startedAt))
    || (attempt.completedAt !== undefined && !Number.isFinite(Date.parse(attempt.completedAt)))
    || (attempt.status === 'completed' && !attempt.completedAt)
    || (attempt.testId !== undefined && !isUuid(attempt.testId))
  ) {
    return {
      status: 'invalid',
      reason: 'Attempts must be inserted once with stable UUID identifiers.',
    };
  }

  if (
    (attempt.scorePercent !== undefined
      && (attempt.scorePercent < 0 || attempt.scorePercent > 100))
    || (attempt.grade !== undefined
      && (!Number.isInteger(attempt.grade) || attempt.grade < 2 || attempt.grade > 5))
  ) {
    return { status: 'invalid', reason: 'Attempt score or grade is outside the supported range.' };
  }

  const mode = attempt.mode === 'diagnostic' ? 'custom' : attempt.mode;
  if (!['training', 'final', 'exam', 'custom', 'review'].includes(mode)) {
    return { status: 'invalid', reason: 'Attempt mode is not supported by the cloud schema.' };
  }

  const status = attempt.status === 'completed' ? 'submitted' : attempt.status;
  if (!['in_progress', 'submitted', 'abandoned'].includes(status)) {
    return { status: 'invalid', reason: 'Attempt status is not supported by the cloud schema.' };
  }

  const payload: Record<string, unknown> = {
    client_attempt_id: attempt.id,
    mode,
    status,
    started_at: attempt.startedAt,
    metadata: {
      grade: attempt.grade ?? null,
      answers: attempt.answers,
    },
  };

  if (attempt.testId) payload.test_definition_id = attempt.testId;
  if (typeof attempt.scorePercent === 'number') payload.score = attempt.scorePercent;
  if (attempt.completedAt) payload.submitted_at = attempt.completedAt;

  return {
    status: 'mapped',
    command: {
      operationId: operation.id,
      clientCreatedAt: operation.createdAt,
      entityType: 'test_attempt',
      entityId: attempt.id,
      operationType: operation.operation,
      payload,
    },
  };
}

function mapProgress(operation: SyncOperation): SyncMappingResult {
  if (!isLocalProgress(operation.payload)) {
    return { status: 'invalid', reason: 'Progress payload is invalid.' };
  }

  const progress = operation.payload;
  if (
    !hasValidOperationId(operation)
    || operation.operation === 'delete'
    || !isUuid(progress.entityId)
    || operation.entityId !== progress.entityId
    || !Number.isFinite(Date.parse(progress.updatedAt))
  ) {
    return {
      status: 'invalid',
      reason: 'Lesson progress requires a stable UUID and insert/update operation.',
    };
  }

  if (progress.entityType !== 'lesson') {
    return {
      status: 'local_only',
      reason: 'Section/topic progress is derived locally; block progress stays local until its parent lesson mapping is explicit.',
    };
  }

  const status = progress.status === 'mastered' ? 'completed' : progress.status;
  if (!['not_started', 'in_progress', 'completed'].includes(status)) {
    return { status: 'invalid', reason: 'Progress status is not supported by the cloud schema.' };
  }

  if (
    progress.completionPercent < 0
    || progress.completionPercent > 100
    || (progress.bestScore !== undefined
      && (progress.bestScore < 0 || progress.bestScore > 100))
    || (progress.bestGrade !== undefined
      && (!Number.isInteger(progress.bestGrade) || progress.bestGrade < 2 || progress.bestGrade > 5))
    || (progress.status === 'mastered' && (progress.bestGrade ?? 0) < 3)
  ) {
    return { status: 'invalid', reason: 'Progress or mastery values are outside the supported range.' };
  }

  const lessonProgress: Record<string, unknown> = {
    lesson_id: progress.entityId,
    status,
    completion_percent: progress.status === 'mastered' ? 100 : progress.completionPercent,
    updated_at: progress.updatedAt,
  };

  const payload: Record<string, unknown> = {
    lesson_progress: lessonProgress,
  };

  if (progress.bestScore !== undefined || progress.bestGrade !== undefined || progress.status === 'mastered') {
    if (progress.bestScore === undefined || progress.bestGrade === undefined) {
      return {
        status: 'invalid',
        reason: 'Mastery sync requires both bestScore and bestGrade.',
      };
    }

    payload.lesson_mastery = {
      lesson_id: progress.entityId,
      best_score: progress.bestScore,
      best_grade: progress.bestGrade,
      is_mastered: progress.status === 'mastered',
      ...(progress.lastAttemptAt
        ? { last_attempt_at: progress.lastAttemptAt }
        : {}),
    };
  }

  return {
    status: 'mapped',
    command: {
      operationId: operation.id,
      clientCreatedAt: operation.createdAt,
      entityType: 'lesson_progress',
      entityId: progress.entityId,
      operationType: operation.operation,
      payload,
    },
  };
}

function mapFavorite(operation: SyncOperation): SyncMappingResult {
  if (!isRecord(operation.payload)) {
    return { status: 'invalid', reason: 'Favorite payload is invalid.' };
  }

  const targetType = operation.payload.targetType;
  const targetId = operation.payload.targetId;
  if (
    !hasValidOperationId(operation)
    || operation.operation === 'update'
    || typeof targetType !== 'string'
    || !favoriteTargetTypes.has(targetType)
    || !isUuid(targetId)
    || operation.entityId !== targetId
    || (typeof operation.payload.createdAt === 'string'
      && !Number.isFinite(Date.parse(operation.payload.createdAt)))
  ) {
    return { status: 'invalid', reason: 'Favorite target is not supported by the cloud schema.' };
  }

  return {
    status: 'mapped',
    command: {
      operationId: operation.id,
      clientCreatedAt: operation.createdAt,
      entityType: 'favorite',
      entityId: targetId,
      operationType: operation.operation,
      payload: {
        target_type: targetType,
        target_id: targetId,
        ...(typeof operation.payload.createdAt === 'string'
          ? { created_at: operation.payload.createdAt }
          : {}),
      },
    },
  };
}

function mapMistake(operation: SyncOperation): SyncMappingResult {
  if (!isLocalError(operation.payload)) {
    return { status: 'invalid', reason: 'Mistake payload is invalid.' };
  }

  const mistake = operation.payload;
  if (
    !hasValidOperationId(operation)
    || operation.operation === 'delete'
    || !isUuid(mistake.questionId)
    || operation.entityId !== mistake.questionId
    || mistake.id !== mistake.questionId
    || !Number.isFinite(Date.parse(mistake.firstSeenAt))
    || !Number.isFinite(Date.parse(mistake.lastSeenAt))
    || (mistake.correctedAt !== undefined
      && !Number.isFinite(Date.parse(mistake.correctedAt)))
    || !Number.isInteger(mistake.errorCount)
    || mistake.errorCount < 1
  ) {
    return {
      status: 'invalid',
      reason: 'Mistakes require a canonical question UUID and an insert/update operation.',
    };
  }

  return {
    status: 'mapped',
    command: {
      operationId: operation.id,
      clientCreatedAt: operation.createdAt,
      entityType: 'mistake',
      entityId: mistake.questionId,
      operationType: operation.operation,
      payload: {
        official_question_id: mistake.questionId,
        first_missed_at: mistake.firstSeenAt,
        last_missed_at: mistake.lastSeenAt,
        ...(mistake.correctedAt ? { corrected_at: mistake.correctedAt } : {}),
      },
    },
  };
}

/**
 * Converts local queue records into validated cloud-domain commands.
 * This is a pure mapping layer only; it does not send network requests.
 */
export function mapLocalSyncOperation(operation: SyncOperation): SyncMappingResult {
  switch (operation.entityType) {
    case 'attempt':
      return mapAttempt(operation);
    case 'progress':
      return mapProgress(operation);
    case 'favorite':
      return mapFavorite(operation);
    case 'error':
      return mapMistake(operation);
    case 'profile':
      return {
        status: 'local_only',
        reason: 'Account profile sync is deferred until the user-profile cloud contract is finalized.',
      };
    default:
      return {
        status: 'local_only',
        reason: `No cloud mapping exists for local entity type: ${operation.entityType}.`,
      };
  }
}
