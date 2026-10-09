package app.petrolheads.db

import app.petrolheads.RepBreakdownDto
import app.petrolheads.Tier
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.jetbrains.exposed.v1.jdbc.update

/**
 * Driver reputation, recomputed from scratch (never accumulated), so rejected laps,
 * deleted cars and removed likes drop out automatically:
 *   leaderboard points (F1-style, per track, best verified lap per driver)
 *   + LIKE_POINTS per like on any of the driver's cars (incl. sold ones)
 *   + a bonus for the membership tier.
 * Stored in users.rep as a cache; call [recomputeAll] after anything that changes the inputs.
 */
object Reputation {
    const val LIKE_POINTS = 3
    val TIER_BONUS = mapOf(Tier.MEMBER to 0, Tier.PETROLHEAD to 25, Tier.RACER to 50, Tier.ELITE to 100)

    /** F1-style points per driver: each track ranks drivers by their best verified lap. */
    fun leaderboardPoints(laps: List<CarScores.Lap>): Map<Long, Int> {
        val points = mutableMapOf<Long, Int>()
        laps.groupBy { it.trackId }.values.forEach { track ->
            track.groupBy { it.userId }.values
                .map { perUser -> perUser.minBy { it.timeMs } }
                .sortedBy { it.timeMs }
                .forEachIndexed { i, best ->
                    val p = CarScores.POSITION_POINTS.getOrNull(i) ?: 0
                    if (p > 0) points.merge(best.userId, p, Int::plus)
                }
        }
        return points
    }

    fun breakdown(lapPoints: Int, likes: Int, tier: Tier): RepBreakdownDto {
        val likePoints = likes * LIKE_POINTS
        val bonus = TIER_BONUS.getValue(tier)
        return RepBreakdownDto(lapPoints, likes, likePoints, bonus, lapPoints + likePoints + bonus)
    }

    /** Breakdown for every driver. Call inside a transaction. */
    fun computeAll(): Map<Long, RepBreakdownDto> {
        val laps = LapTimes.selectAll().where { LapTimes.status eq LapStatus.VERIFIED }.map {
            CarScores.Lap(it[LapTimes.trackId].value, it[LapTimes.userId].value, it[LapTimes.carId].value, it[LapTimes.timeMs])
        }
        val points = leaderboardPoints(laps)
        val owner = Cars.selectAll().associate { it[Cars.id].value to it[Cars.userId].value }
        val likesByUser = CarLikes.selectAll().mapNotNull { owner[it[CarLikes.carId].value] }.groupingBy { it }.eachCount()
        val bests = TierRepository.homeBests()
        return Users.selectAll().associate { row ->
            val id = row[Users.id].value
            id to breakdown(points[id] ?: 0, likesByUser[id] ?: 0, Tier.forLap(bests[id]))
        }
    }

    /** Refreshes the users.rep cache. */
    suspend fun recomputeAll() = dbQuery {
        computeAll().forEach { (userId, rep) ->
            Users.update({ Users.id eq userId }) { it[Users.rep] = rep.total }
        }
    }
}
