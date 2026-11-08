package ru.physics.app.domain

import kotlin.math.sqrt

data class FreeFallResult(
    val timeSeconds: Double,
    val finalVelocityMetersPerSecond: Double,
)

fun calculateFreeFall(
    heightMeters: Double,
    gravityMetersPerSecondSquared: Double = 9.81,
): FreeFallResult {
    require(heightMeters.isFinite() && heightMeters >= 0.0) {
        "Height must be finite and non-negative."
    }
    require(gravityMetersPerSecondSquared.isFinite() && gravityMetersPerSecondSquared > 0.0) {
        "Gravity must be finite and positive."
    }

    val time = sqrt(2.0 * heightMeters / gravityMetersPerSecondSquared)
    return FreeFallResult(
        timeSeconds = time,
        finalVelocityMetersPerSecond = gravityMetersPerSecondSquared * time,
    )
}
