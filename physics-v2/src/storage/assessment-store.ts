import {
  localDb,
  createLocalId,
  type LocalAttempt,
  type LocalError,
  type LocalProgress,
  type SyncOperation,
} from './db';
import {
  createAssessmentResult,
  mergeLessonMastery,
} from '../domain/assessment';

export interface FinalAssessmentInput {
  attempt: LocalAttempt;
  lessonId: string;
}

export interface FinalAssessmentSaveResult {
  attemptId: string;
  result: ReturnType<typeof createAssessmentResult>;
  progress: LocalProgress;
  updatedErrors: number;
}

/**
 * Atomically stores a completed final assessment, updates lesson mastery,
 * collects incorrect answers and appends sync operations.
 *
 * Attempt IDs are append-only. Reusing an existing ID is rejected rather
 * than silently replacing a previous result.
 */
export async function saveFinalAssessment(
  input: FinalAssessmentInput,
): Promise<FinalAssessmentSaveResult> {
  const { attempt, lessonId } = input;

  if (attempt.status !== 'completed' || attempt.mode !== 'final') {
    throw new Error('Only completed final assessments can update mastery.');
  }

  if (!attempt.completedAt || typeof attempt.scorePercent !== 'number') {
    throw new Error('A completed assessment requires a score and completion time.');
  }

  if (!lessonId.trim()) {
    throw new Error('A lesson ID is required.');
  }

  const result = createAssessmentResult(attempt.scorePercent);
  const now = attempt.completedAt;

  await localDb.open();

  return localDb.transaction(
    'rw',
    [localDb.attempts, localDb.progress, localDb.errors, localDb.syncQueue],
    async () => {
      const duplicate = await localDb.attempts.get(attempt.id);
      if (duplicate) {
        throw new Error('This assessment attempt has already been saved.');
      }

      const previousProgress = await localDb.progress
        .where('[entityType+entityId]')
        .equals(['lesson', lessonId])
        .first();

      const previousMastery = previousProgress
        ? {
            bestScore: previousProgress.bestGrade === undefined
              ? 0
              : previousProgress.bestGrade,
            bestGrade: (previousProgress.bestGrade ?? 2) as 2 | 3 | 4 | 5,
            isMastered: previousProgress.status === 'mastered',
            masteredAt: previousProgress.status === 'mastered'
              ? previousProgress.updatedAt
              : null,
            lastAttemptAt: previousProgress.updatedAt,
          }
        : null;

      const mastery = mergeLessonMastery(
        previousMastery,
        attempt.scorePercent,
        now,
      );

      const progress: LocalProgress = {
        id: previousProgress?.id ?? createLocalId(),
        entityType: 'lesson',
        entityId: lessonId,
        status: mastery.isMastered
          ? 'mastered'
          : 'in_progress',
        completionPercent: mastery.isMastered ? 100 : Math.max(
          previousProgress?.completionPercent ?? 0,
          attempt.scorePercent,
        ),
        bestGrade: mastery.bestGrade,
        latestGrade: result.grade,
        updatedAt: now,
      };

      await localDb.attempts.add(attempt);
      await localDb.progress.put(progress);

      const wrongAnswers = attempt.answers.filter(
        (answer) => answer.isCorrect === false,
      );
      let updatedErrors = 0;

      for (const answer of wrongAnswers) {
        const existing = await localDb.errors.get(answer.questionId);
        const error: LocalError = {
          id: answer.questionId,
          questionId: answer.questionId,
          errorCount: (existing?.errorCount ?? 0) + 1,
          firstSeenAt: existing?.firstSeenAt ?? now,
          lastSeenAt: now,
          correctedAt: undefined,
        };

        await localDb.errors.put(error);
        updatedErrors += 1;

        const errorOperation: SyncOperation = {
          id: createLocalId(),
          entityType: 'error',
          entityId: error.id,
          operation: existing ? 'update' : 'insert',
          payload: error,
          createdAt: now,
          status: 'pending',
          attempts: 0,
        };
        await localDb.syncQueue.add(errorOperation);
      }

      const operations: SyncOperation[] = [
        {
          id: createLocalId(),
          entityType: 'attempt',
          entityId: attempt.id,
          operation: 'insert',
          payload: attempt,
          createdAt: now,
          status: 'pending',
          attempts: 0,
        },
        {
          id: createLocalId(),
          entityType: 'progress',
          entityId: progress.id,
          operation: previousProgress ? 'update' : 'insert',
          payload: progress,
          createdAt: now,
          status: 'pending',
          attempts: 0,
        },
      ];

      await localDb.syncQueue.bulkAdd(operations);

      return {
        attemptId: attempt.id,
        result,
        progress,
        updatedErrors,
      };
    },
  );
}
