package app.petrolheads

import app.petrolheads.telegram.isCommand
import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class BotCommandTest {
    @Test
    fun `recognises commands addressed to this bot`() {
        assertTrue(isCommand("/garage", "garage", "petrolheads_bot"))
        assertTrue(isCommand("/garage@Petrolheads_Bot", "garage", "petrolheads_bot"))
        assertTrue(isCommand("  /garage now", "garage", "petrolheads_bot"))
        assertTrue(isCommand("/start", "start", null))
    }

    @Test
    fun `ignores other bots and plain text`() {
        assertFalse(isCommand("/garage@other_bot", "garage", "petrolheads_bot"))
        assertFalse(isCommand("garage", "garage", "petrolheads_bot"))
        assertFalse(isCommand("/garages", "garage", "petrolheads_bot"))
        assertFalse(isCommand(null, "garage", "petrolheads_bot"))
    }
}
