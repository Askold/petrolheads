package app.petrolheads

import app.petrolheads.db.CarScores
import app.petrolheads.db.CarScores.Lap
import app.petrolheads.db.CarScores.Spec
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

class CarScoresTest {
    @Test
    fun `points go to the car of each driver's best lap, per track`() {
        val laps = listOf(
            // track 1: driver 1 best with car 10 (slower lap in car 11 ignored), driver 2 second
            Lap(trackId = 1, userId = 1, carId = 10, timeMs = 90_000),
            Lap(trackId = 1, userId = 1, carId = 11, timeMs = 95_000),
            Lap(trackId = 1, userId = 2, carId = 20, timeMs = 92_000),
            // track 2: driver 2 wins
            Lap(trackId = 2, userId = 2, carId = 20, timeMs = 60_000),
            Lap(trackId = 2, userId = 1, carId = 11, timeMs = 61_000),
        )
        assertEquals(mapOf(10L to 25, 20L to 18 + 25, 11L to 18), CarScores.lapPoints(laps))
    }

    @Test
    fun `only the top ten score`() {
        val laps = (1..12).map { Lap(trackId = 1, userId = it.toLong(), carId = it.toLong(), timeMs = 60_000 + it) }
        val points = CarScores.lapPoints(laps)
        assertEquals(1, points[10L])
        assertNull(points[11L])
    }

    @Test
    fun `rating blends laps and likes relative to the club's best`() {
        assertEquals(10.0, CarScores.rating(lapPoints = 50, likes = 8, maxLapPoints = 50, maxLikes = 8))
        assertEquals(6.0, CarScores.rating(lapPoints = 50, likes = 0, maxLapPoints = 50, maxLikes = 8))
        assertEquals(2.0, CarScores.rating(lapPoints = 0, likes = 4, maxLapPoints = 50, maxLikes = 8))
        assertEquals(0.0, CarScores.rating(lapPoints = 0, likes = 0, maxLapPoints = 0, maxLikes = 0))
    }

    @Test
    fun `stats are scaled across the club`() {
        val stats = CarScores.stats(
            listOf(
                Spec(1, hp = 600, weightKg = 1700, drivetrain = "AWD"), // most powerful, quickest
                Spec(2, hp = 130, weightKg = 950, drivetrain = "RWD"), // light: best handling
                Spec(3, hp = 72, weightKg = 1030, drivetrain = "RWD"), // weakest
                Spec(4, hp = null, weightKg = 1200, drivetrain = "FWD"), // unknown power: no stats
            ),
        )
        assertEquals(1.0, stats.getValue(1).topSpeed)
        assertEquals(1.0, stats.getValue(1).acceleration)
        assertEquals(0.1, stats.getValue(3).topSpeed)
        assertEquals(1.0, stats.getValue(2).handling)
        assertTrue(stats.getValue(1).handling < stats.getValue(2).handling)
        assertNull(stats[4])
    }

    @Test
    fun `a lone car sits mid-scale`() {
        assertEquals(0.55, CarScores.stats(listOf(Spec(1, 300, 1400, "RWD"))).getValue(1).topSpeed)
    }
}
