package ru.physics.app.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test

class FreeFallTest {
    @Test
    fun calculatesFallFromTwentyMeters() {
        val result = calculateFreeFall(20.0)
        assertEquals(2.019, result.timeSeconds, 0.01)
        assertEquals(19.82, result.finalVelocityMetersPerSecond, 0.02)
    }

    @Test
    fun zeroHeightProducesZeroValues() {
        assertEquals(FreeFallResult(0.0, 0.0), calculateFreeFall(0.0))
    }

    @Test
    fun rejectsInvalidHeight() {
        assertThrows(IllegalArgumentException::class.java) {
            calculateFreeFall(-1.0)
        }
    }

    @Test
    fun rejectsInvalidGravity() {
        assertThrows(IllegalArgumentException::class.java) {
            calculateFreeFall(20.0, 0.0)
        }
    }
}
