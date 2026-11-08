package ru.physics.app.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Assert.assertThrows
import org.junit.Test

class AssessmentRulesTest {
    @Test
    fun appliesApprovedGradeThresholds() {
        assertEquals(2, gradeFromScore(59))
        assertEquals(3, gradeFromScore(60))
        assertEquals(3, gradeFromScore(74))
        assertEquals(4, gradeFromScore(75))
        assertEquals(4, gradeFromScore(89))
        assertEquals(5, gradeFromScore(90))
        assertEquals(5, gradeFromScore(100))
    }

    @Test
    fun masteryBeginsAtGradeThree() {
        assertFalse(isMastered(59))
        assertTrue(isMastered(60))
    }

    @Test
    fun rejectsScoresOutsideRange() {
        assertThrows(IllegalArgumentException::class.java) { gradeFromScore(-1) }
        assertThrows(IllegalArgumentException::class.java) { gradeFromScore(101) }
    }
}
