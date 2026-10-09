package app.petrolheads

import app.petrolheads.db.CarScores.Lap
import app.petrolheads.db.Reputation
import kotlin.test.Test
import kotlin.test.assertEquals

class ReputationTest {
    @Test
    fun `leaderboard points use each driver's best lap per track`() {
        val laps = listOf(
            Lap(trackId = 1, userId = 1, carId = 10, timeMs = 45_000),
            Lap(trackId = 1, userId = 1, carId = 10, timeMs = 50_000), // slower repeat: no extra points
            Lap(trackId = 1, userId = 2, carId = 20, timeMs = 46_000),
            Lap(trackId = 2, userId = 2, carId = 20, timeMs = 90_000),
        )
        assertEquals(mapOf(1L to 25, 2L to 18 + 25), Reputation.leaderboardPoints(laps))
    }

    @Test
    fun `total is places plus likes plus tier bonus`() {
        val rep = Reputation.breakdown(lapPoints = 43, likes = 4, tier = Tier.RACER)
        assertEquals(12, rep.likePoints)
        assertEquals(50, rep.tierBonus)
        assertEquals(43 + 12 + 50, rep.total)
        assertEquals(0, Reputation.breakdown(0, 0, Tier.MEMBER).total)
    }
}
