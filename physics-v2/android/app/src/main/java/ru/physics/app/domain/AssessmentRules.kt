package ru.physics.app.domain

fun gradeFromScore(scorePercent: Int): Int {
    require(scorePercent in 0..100) { "Score must be between 0 and 100." }
    return when {
        scorePercent >= 90 -> 5
        scorePercent >= 75 -> 4
        scorePercent >= 60 -> 3
        else -> 2
    }
}

fun isMastered(scorePercent: Int): Boolean = gradeFromScore(scorePercent) >= 3
