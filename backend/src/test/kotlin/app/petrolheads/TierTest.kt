package app.petrolheads

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class TierTest {
    @Test
    fun `tiers by best home-track lap, thresholds inclusive`() {
        assertEquals(Tier.MEMBER, Tier.forLap(null))
        assertEquals(Tier.MEMBER, Tier.forLap(47_001))
        assertEquals(Tier.PETROLHEAD, Tier.forLap(47_000))
        assertEquals(Tier.PETROLHEAD, Tier.forLap(45_001))
        assertEquals(Tier.RACER, Tier.forLap(45_000))
        assertEquals(Tier.RACER, Tier.forLap(42_001))
        assertEquals(Tier.ELITE, Tier.forLap(42_000))
        assertEquals(Tier.ELITE, Tier.forLap(39_500))
    }

    @Test
    fun `next tier and its threshold`() {
        val member = TierDto.of(null)
        assertEquals("petrolhead", member.nextTier)
        assertEquals(47_000, member.nextTierMaxMs)
        val racer = TierDto.of(44_321)
        assertEquals("racer", racer.tier)
        assertEquals("elite", racer.nextTier)
        assertNull(TierDto.of(41_000).nextTier)
    }
}
