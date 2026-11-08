import type {
  LocalAttempt,
  LocalError,
  LocalFavorite,
  LocalProgress,
  SyncOperation,
} from './db';

export interface CloudSyncCommand {
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

function isLocalFavorite(value: unknown): value is LocalFavorite {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.targetType === 'string'
    && typeof value.targetId === 'string'
    && typeof value.createdAt === 'string';
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
  if (progress.entityType !== 'lesson') {
    return {
      status: 'local_only',
      reason: 'Section/topic progress is derived locally; block progress requires its parent lesson ID.',
    };
  }

  const status = progress.status === 'mastered' ? 'completed' : progress.status;
  if (!['not_started', 'in_progress', 'completed'].includes(status)) {
    return { status: 'invalid', reason: 'Progress status is not supported by the cloud schema.' };
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
      mastered_at: progress.status === 'mastered' ? progress.updatedAt : null,
      ...(progress.latestGrade !== undefined
        ? { last_attempt_at: progress.updatedAt }
        : {}),
    };
  }

  return {
    status: 'mapped',
    command: {
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
    typeof targetType !== 'string'
    || !favoriteTargetTypes.has(targetType)
    || typeof targetId !== 'string'
  ) {
    return { status: 'invalid', reason: 'Favorite target is not supported by the cloud schema.' };
  }

  return {
    status: 'mapped',
    command: {
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
  return {
    status: 'mapped',
    command: {
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
