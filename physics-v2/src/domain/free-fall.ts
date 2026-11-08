export interface FreeFallResult {
  timeSeconds: number;
  finalVelocityMetersPerSecond: number;
}

export function calculateFreeFall(
  heightMeters: number,
  gravityMetersPerSecondSquared = 9.81,
): FreeFallResult {
  if (!Number.isFinite(heightMeters) || heightMeters < 0) {
    throw new RangeError('Height must be a finite non-negative number.');
  }

  if (!Number.isFinite(gravityMetersPerSecondSquared) || gravityMetersPerSecondSquared <= 0) {
    throw new RangeError('Gravitational acceleration must be a finite positive number.');
  }

  const timeSeconds = Math.sqrt((2 * heightMeters) / gravityMetersPerSecondSquared);

  return {
    timeSeconds,
    finalVelocityMetersPerSecond: gravityMetersPerSecondSquared * timeSeconds,
  };
}
