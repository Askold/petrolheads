package app.petrolheads.db

import app.petrolheads.CarDto
import app.petrolheads.CarStatsDto
import org.jetbrains.exposed.v1.core.and
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.core.inList
import org.jetbrains.exposed.v1.jdbc.selectAll

/**
 * Club-relative numbers shown with each car:
 * - overall rating 0..10 from leaderboard positions and likes
 * - acceleration / top speed / handling 0..1, scaled against every car in the club
 */
object CarScores {
    /** Points per leaderboard position, F1-style; beyond 10th place scores nothing. */
    val POSITION_POINTS = intArrayOf(25, 18, 15, 12, 10, 8, 6, 4, 2, 1)
    const val LAP_WEIGHT = 0.6
    const val LIKE_WEIGHT = 0.4

    data class Lap(val trackId: Long, val userId: Long, val carId: Long, val timeMs: Int)

    /**
     * Each track's leaderboard is the best verified lap per driver; the position's points go to the car
     * that set that lap.
     */
    fun lapPoints(verifiedLaps: List<Lap>): Map<Long, Int> {
        val points = mutableMapOf<Long, Int>()
        verifiedLaps.groupBy { it.trackId }.values.forEach { laps ->
            laps.groupBy { it.userId }.values
                .map { perUser -> perUser.minBy { it.timeMs } }
                .sortedBy { it.timeMs }
                .forEachIndexed { i, best ->
                    val p = POSITION_POINTS.getOrNull(i) ?: 0
                    if (p > 0) points.merge(best.carId, p, Int::plus)
                }
        }
        return points
    }

    /** 0..10, each part relative to the club's best car for it. */
    fun rating(lapPoints: Int, likes: Int, maxLapPoints: Int, maxLikes: Int): Double {
        val laps = if (maxLapPoints > 0) lapPoints.toDouble() / maxLapPoints else 0.0
        val liked = if (maxLikes > 0) likes.toDouble() / maxLikes else 0.0
        return Math.round((LAP_WEIGHT * laps + LIKE_WEIGHT * liked) * 1000) / 100.0
    }

    data class Spec(val carId: Long, val hp: Int?, val weightKg: Int?, val drivetrain: String?)

    private const val DEFAULT_WEIGHT = 1400.0

    /** Raw metrics; only their order and spread within the club matter. */
    private fun metrics(s: Spec): DoubleArray? {
        val hp = s.hp?.toDouble() ?: return null
        val weight = s.weightKg?.toDouble() ?: DEFAULT_WEIGHT
        val launch = when (s.drivetrain) { "AWD" -> 1.10; "RWD" -> 1.0; "FWD" -> 0.95; else -> 1.0 }
        val grip = when (s.drivetrain) { "AWD" -> 1.06; "RWD" -> 1.04; "FWD" -> 0.96; else -> 1.0 }
        return doubleArrayOf(
            hp / weight * 1000 * launch, // acceleration: hp per tonne, traction-adjusted
            hp, // top speed: power
            1000 / weight * grip, // handling: lightness, drivetrain-adjusted
        )
    }

    /**
     * Min-max scales each metric across the club's cars into 0.1..1 (the slowest car still shows a sliver).
     * Cars without horsepower get no stats.
     */
    fun stats(specs: List<Spec>): Map<Long, CarStatsDto> {
        val known = specs.mapNotNull { s -> metrics(s)?.let { s.carId to it } }
        if (known.isEmpty()) return emptyMap()
        val mins = DoubleArray(3) { k -> known.minOf { it.second[k] } }
        val maxs = DoubleArray(3) { k -> known.maxOf { it.second[k] } }
        fun scale(v: Double, k: Int): Double {
            val span = maxs[k] - mins[k]
            val x = if (span <= 0) 0.5 else (v - mins[k]) / span
            return Math.round((0.1 + 0.9 * x) * 1000) / 1000.0
        }
        return known.associate { (id, m) -> id to CarStatsDto(scale(m[0], 0), scale(m[1], 1), scale(m[2], 2)) }
    }

    /** Adds likes, the viewer's like, rating and stats to [cars]. Call inside a transaction. */
    fun decorate(cars: List<CarDto>, viewerId: Long): List<CarDto> {
        if (cars.isEmpty()) return cars
        val likeCounts = CarLikes.selectAll().groupingBy { it[CarLikes.carId].value }.eachCount()
        val mine = CarLikes.selectAll()
            .where { (CarLikes.carId inList cars.map { it.id }) and (CarLikes.userId eq viewerId) }
            .map { it[CarLikes.carId].value }.toSet()
        val points = lapPoints(
            LapTimes.selectAll().where { LapTimes.status eq LapStatus.VERIFIED }.map {
                Lap(it[LapTimes.trackId].value, it[LapTimes.userId].value, it[LapTimes.carId].value, it[LapTimes.timeMs])
            },
        )
        val stats = stats(
            Cars.selectAll().map { Spec(it[Cars.id].value, it[Cars.hp], it[Cars.weightKg], it[Cars.drivetrain]) },
        )
        val maxPoints = points.values.maxOrNull() ?: 0
        val maxLikes = likeCounts.values.maxOrNull() ?: 0
        return cars.map { c ->
            val likes = likeCounts[c.id] ?: 0
            val pts = points[c.id] ?: 0
            c.copy(
                likes = likes,
                likedByMe = c.id in mine,
                lapPoints = pts,
                rating = rating(pts, likes, maxPoints, maxLikes),
                stats = stats[c.id],
            )
        }
    }
}
