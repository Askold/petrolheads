package app.petrolheads

import kotlinx.serialization.Serializable

/**
 * Club membership tiers, earned by the best *verified* lap on the home track.
 * Thresholds are inclusive: 47.000 s is already Petrolhead.
 */
enum class Tier(val key: String, val maxLapMs: Int?) {
    MEMBER("member", null), // white or black matte sticker, no lap needed
    PETROLHEAD("petrolhead", 47_000), // holographic sticker
    RACER("racer", 45_000), // gold sticker
    ELITE("elite", 42_000); // red chrome sticker (in development)

    companion object {
        /** The track the thresholds are measured on. */
        const val HOME_TRACK = "Evolution Race Park"

        fun forLap(bestMs: Int?): Tier =
            if (bestMs == null) MEMBER else entries.lastOrNull { it.maxLapMs != null && bestMs <= it.maxLapMs } ?: MEMBER

        fun next(tier: Tier): Tier? = entries.getOrNull(tier.ordinal + 1)
    }
}

@Serializable
data class TierDto(
    val tier: String,
    /** Best verified lap on [trackName], if any. */
    val bestMs: Int?,
    val trackName: String,
    val nextTier: String?,
    val nextTierMaxMs: Int?,
) {
    companion object {
        fun of(bestMs: Int?): TierDto {
            val tier = Tier.forLap(bestMs)
            val next = Tier.next(tier)
            return TierDto(tier.key, bestMs, Tier.HOME_TRACK, next?.key, next?.maxLapMs)
        }
    }
}
