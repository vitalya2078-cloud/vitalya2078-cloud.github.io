package ru.physics.app.domain

import org.junit.Assert.assertEquals
import org.junit.Test

class ProgressRulesTest {
    @Test
    fun masteryNeverRegresses() {
        val existing = ProgressSnapshot("lesson", "lesson-1", "mastered", 100, 92, 5, 4)
        val incoming = ProgressSnapshot("lesson", "lesson-1", "in_progress", 40, 40, 3, 2)

        val merged = mergeProgress(existing, incoming)

        assertEquals("mastered", merged.status)
        assertEquals(100, merged.completionPercent)
        assertEquals(92, merged.bestScore)
        assertEquals(5, merged.bestGrade)
        assertEquals(2, merged.latestGrade)
    }

    @Test
    fun keepsBestResultAndLatestGradeSeparately() {
        val existing = ProgressSnapshot("topic", "topic-1", "in_progress", 30, 88, 4, 4)
        val incoming = ProgressSnapshot("topic", "topic-1", "in_progress", 60, 72, 3, 3)

        val merged = mergeProgress(existing, incoming)

        assertEquals(60, merged.completionPercent)
        assertEquals(88, merged.bestScore)
        assertEquals(4, merged.bestGrade)
        assertEquals(3, merged.latestGrade)
    }

    @Test
    fun masteredProgressAlwaysHasFullCompletion() {
        val incoming = ProgressSnapshot("lesson", "lesson-2", "mastered", 55, 60, 3, 3)
        assertEquals(100, mergeProgress(null, incoming).completionPercent)
    }
}
