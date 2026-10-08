package app.petrolheads

import app.petrolheads.auth.InitDataValidator
import app.petrolheads.auth.InitDataValidator.hmacSha256
import app.petrolheads.auth.InitDataValidator.toHex
import java.net.URLEncoder
import java.time.Duration
import java.time.Instant
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class InitDataValidatorTest {
    private val botToken = "123456:TEST-TOKEN"
    private val now = Instant.parse("2026-10-04T12:00:00Z")
    private val userJson = """{"id":42,"first_name":"Kenji","username":"rx7_kenji","language_code":"en"}"""

    /** Signs fields the same way Telegram does. */
    private fun sign(fields: Map<String, String>, token: String = botToken): String {
        val dataCheckString = fields.toSortedMap().entries.joinToString("\n") { (k, v) -> "$k=$v" }
        val secret = hmacSha256("WebAppData".toByteArray(), token.toByteArray())
        val hash = hmacSha256(secret, dataCheckString.toByteArray()).toHex()
        return (fields + ("hash" to hash)).entries.joinToString("&") { (k, v) ->
            "$k=${URLEncoder.encode(v, Charsets.UTF_8)}"
        }
    }

    private fun fields(authDate: Instant = now) = mapOf(
        "query_id" to "AAH",
        "user" to userJson,
        "auth_date" to authDate.epochSecond.toString(),
        "signature" to "abc",
    )

    @Test
    fun `accepts correctly signed data`() {
        val user = InitDataValidator.validate(sign(fields()), botToken, now = now)
        assertEquals(42, user?.id)
        assertEquals("rx7_kenji", user?.username)
    }

    @Test
    fun `rejects data signed with another bot token`() {
        assertNull(InitDataValidator.validate(sign(fields(), token = "999:OTHER"), botToken, now = now))
    }

    @Test
    fun `rejects tampered user`() {
        val tampered = sign(fields()).replace("42", "43")
        assertNull(InitDataValidator.validate(tampered, botToken, now = now))
    }

    @Test
    fun `rejects expired data`() {
        val old = sign(fields(authDate = now.minus(Duration.ofHours(25))))
        assertNull(InitDataValidator.validate(old, botToken, now = now))
    }

    @Test
    fun `rejects missing hash`() {
        assertNull(InitDataValidator.validate("user=%7B%7D&auth_date=1", botToken, now = now))
    }
}
