import { describe, expect, it } from 'vitest';
import { calculateFreeFall } from './free-fall';

describe('calculateFreeFall', () => {
  it('calculates fall time and final velocity for a known height', () => {
    const result = calculateFreeFall(20);

    expect(result.timeSeconds).toBeCloseTo(2.019, 2);
    expect(result.finalVelocityMetersPerSecond).toBeCloseTo(19.82, 1);
  });

  it('returns zero values for zero height', () => {
    expect(calculateFreeFall(0)).toEqual({
      timeSeconds: 0,
      finalVelocityMetersPerSecond: 0,
    });
  });

  it('supports a custom gravitational acceleration', () => {
    const result = calculateFreeFall(20, 1.62);

    expect(result.timeSeconds).toBeCloseTo(4.969, 2);
    expect(result.finalVelocityMetersPerSecond).toBeCloseTo(8.05, 1);
  });

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid height %s',
    (height) => {
      expect(() => calculateFreeFall(height)).toThrow(RangeError);
    },
  );

  it.each([0, -9.81, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid gravity %s',
    (gravity) => {
      expect(() => calculateFreeFall(20, gravity)).toThrow(RangeError);
    },
  );
});
