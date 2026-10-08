package app.petrolheads.auth

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import java.net.URLDecoder
import java.security.MessageDigest
import java.time.Duration
import java.time.Instant
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

@Serializable
data class TelegramUser(
    val id: Long,
    @SerialName("first_name") val firstName: String,
    @SerialName("last_name") val lastName: String? = null,
    val username: String? = null,
    @SerialName("photo_url") val photoUrl: String? = null,
    @SerialName("language_code") val languageCode: String? = null,
)

/**
 * Validates Mini App `initData` as described in
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
object InitDataValidator {
    private val json = Json { ignoreUnknownKeys = true }

    fun validate(
        rawInitData: String,
        botToken: String,
        maxAge: Duration = Duration.ofHours(24),
        now: Instant = Instant.now(),
    ): TelegramUser? {
        val params = parse(rawInitData)
        val hash = params["hash"] ?: return null

        val dataCheckString = params
            .filterKeys { it != "hash" }
            .toSortedMap()
            .entries
            .joinToString("\n") { (k, v) -> "$k=$v" }

        val secretKey = hmacSha256("WebAppData".toByteArray(), botToken.toByteArray())
        val expected = hmacSha256(secretKey, dataCheckString.toByteArray()).toHex()
        if (!MessageDigest.isEqual(expected.toByteArray(), hash.lowercase().toByteArray())) return null

        val authDate = params["auth_date"]?.toLongOrNull() ?: return null
        if (Instant.ofEpochSecond(authDate).plus(maxAge).isBefore(now)) return null

        val userJson = params["user"] ?: return null
        return runCatching { json.decodeFromString<TelegramUser>(userJson) }.getOrNull()
    }

    fun parse(raw: String): Map<String, String> =
        raw.split("&")
            .filter { it.isNotEmpty() }
            .associate { pair ->
                val idx = pair.indexOf('=')
                if (idx < 0) decode(pair) to ""
                else decode(pair.substring(0, idx)) to decode(pair.substring(idx + 1))
            }

    private fun decode(s: String) = URLDecoder.decode(s, Charsets.UTF_8)

    internal fun hmacSha256(key: ByteArray, data: ByteArray): ByteArray =
        Mac.getInstance("HmacSHA256").run {
            init(SecretKeySpec(key, "HmacSHA256"))
            doFinal(data)
        }

    internal fun ByteArray.toHex() = joinToString("") { "%02x".format(it) }
}
