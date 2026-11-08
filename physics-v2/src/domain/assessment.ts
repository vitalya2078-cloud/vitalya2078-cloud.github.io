export type AssessmentGrade = 2 | 3 | 4 | 5;

export interface AssessmentResult {
  scorePercent: number;
  grade: AssessmentGrade;
  gradeLabel: string;
  mastered: boolean;
}

export interface LessonMasterySnapshot {
  bestScore: number;
  bestGrade: AssessmentGrade;
  isMastered: boolean;
  masteredAt: string | null;
  lastAttemptAt: string;
}

const GRADE_LABELS: Record<AssessmentGrade, string> = {
  2: 'Не освоен',
  3: 'Освоен',
  4: 'Хорошо освоен',
  5: 'Освоен на отлично',
};

function assertScore(scorePercent: number): void {
  if (!Number.isFinite(scorePercent) || scorePercent < 0 || scorePercent > 100) {
    throw new RangeError('Score must be a finite number between 0 and 100.');
  }
}

export function gradeFromScore(scorePercent: number): AssessmentGrade {
  assertScore(scorePercent);

  if (scorePercent >= 90) return 5;
  if (scorePercent >= 75) return 4;
  if (scorePercent >= 60) return 3;
  return 2;
}

export function createAssessmentResult(
  scorePercent: number,
): AssessmentResult {
  const grade = gradeFromScore(scorePercent);

  return {
    scorePercent,
    grade,
    gradeLabel: GRADE_LABELS[grade],
    mastered: grade >= 3,
  };
}

export function calculateScorePercent(
  correctAnswers: number,
  totalQuestions: number,
): number {
  if (
    !Number.isInteger(correctAnswers) ||
    !Number.isInteger(totalQuestions) ||
    totalQuestions <= 0 ||
    correctAnswers < 0 ||
    correctAnswers > totalQuestions
  ) {
    throw new RangeError('Answer counts must be valid non-negative integers.');
  }

  return (correctAnswers / totalQuestions) * 100;
}

/**
 * Keeps the best result and preserves mastery once achieved.
 * The caller still stores every submitted attempt separately.
 */
export function mergeLessonMastery(
  previous: LessonMasterySnapshot | null,
  scorePercent: number,
  submittedAt: string,
): LessonMasterySnapshot {
  const attempt = createAssessmentResult(scorePercent);

  if (!previous) {
    return {
      bestScore: scorePercent,
      bestGrade: attempt.grade,
      isMastered: attempt.mastered,
      masteredAt: attempt.mastered ? submittedAt : null,
      lastAttemptAt: submittedAt,
    };
  }

  const isNewBest = scorePercent > previous.bestScore;
  const isNewlyMastered = !previous.isMastered && attempt.mastered;

  return {
    bestScore: isNewBest ? scorePercent : previous.bestScore,
    bestGrade: isNewBest ? attempt.grade : previous.bestGrade,
    isMastered: previous.isMastered || attempt.mastered,
    masteredAt: previous.masteredAt ?? (isNewlyMastered ? submittedAt : null),
    lastAttemptAt: submittedAt,
  };
}
