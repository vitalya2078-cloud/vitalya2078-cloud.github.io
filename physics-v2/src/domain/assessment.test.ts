import { describe, expect, it } from 'vitest';
import {
  calculateScorePercent,
  createAssessmentResult,
  gradeFromScore,
  mergeLessonMastery,
} from './assessment';

describe('PHYSICS assessment grading', () => {
  it.each([
    [0, 2],
    [59.99, 2],
    [60, 3],
    [74.99, 3],
    [75, 4],
    [89.99, 4],
    [90, 5],
    [100, 5],
  ])('maps score %s to grade %s', (score, grade) => {
    expect(gradeFromScore(score)).toBe(grade);
  });

  it('marks grade 3 and above as mastered', () => {
    expect(createAssessmentResult(60).mastered).toBe(true);
    expect(createAssessmentResult(59.99).mastered).toBe(false);
  });

  it('calculates score without rounding away threshold information', () => {
    expect(calculateScorePercent(3, 4)).toBe(75);
    expect(calculateScorePercent(2, 3)).toBeCloseTo(66.6667, 3);
  });

  it('rejects invalid scores and answer counts', () => {
    expect(() => gradeFromScore(101)).toThrow(RangeError);
    expect(() => gradeFromScore(Number.NaN)).toThrow(RangeError);
    expect(() => calculateScorePercent(5, 4)).toThrow(RangeError);
    expect(() => calculateScorePercent(0, 0)).toThrow(RangeError);
  });
});

describe('lesson mastery', () => {
  it('does not revoke mastery after a later unsuccessful attempt', () => {
    const first = mergeLessonMastery(null, 82, '2026-11-08T10:00:00.000Z');
    const second = mergeLessonMastery(first, 45, '2026-11-09T10:00:00.000Z');

    expect(second.isMastered).toBe(true);
    expect(second.bestScore).toBe(82);
    expect(second.bestGrade).toBe(4);
    expect(second.masteredAt).toBe('2026-11-08T10:00:00.000Z');
    expect(second.lastAttemptAt).toBe('2026-11-09T10:00:00.000Z');
  });

  it('records first mastery when the learner later reaches grade 3', () => {
    const first = mergeLessonMastery(null, 42, '2026-11-08T10:00:00.000Z');
    const second = mergeLessonMastery(first, 60, '2026-11-08T11:00:00.000Z');

    expect(second.isMastered).toBe(true);
    expect(second.masteredAt).toBe('2026-11-08T11:00:00.000Z');
    expect(second.bestGrade).toBe(3);
  });
});
