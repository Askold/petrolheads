package app.petrolheads.telegram

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.engine.cio.CIO
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.get
import io.ktor.client.request.post
import io.ktor.client.statement.bodyAsBytes
import io.ktor.http.isSuccess
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.contentType
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.boolean
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.slf4j.LoggerFactory
import java.time.Duration
import java.time.Instant
import java.util.concurrent.ConcurrentHashMap

class TelegramApi(private val botToken: String) {
    private val log = LoggerFactory.getLogger(TelegramApi::class.java)
    private val client = HttpClient(CIO) {
        install(ContentNegotiation) { json(Json { ignoreUnknownKeys = true }) }
    }

    private data class CachedMembership(val isMember: Boolean, val expiresAt: Instant)
    private val membershipCache = ConcurrentHashMap<Pair<Long, Long>, CachedMembership>()

    suspend fun call(method: String, body: JsonObject): JsonElement? {
        val response: JsonObject = client.post("https://api.telegram.org/bot$botToken/$method") {
            contentType(ContentType.Application.Json)
            setBody(body)
        }.body()
        if (response["ok"]?.jsonPrimitive?.boolean != true) {
            log.warn("Telegram {} failed: {}", method, response["description"])
            return null
        }
        return response["result"]
    }

    @Volatile private var cachedUsername: String? = null

    /** The bot's @username, fetched once via getMe. */
    suspend fun botUsername(): String? {
        cachedUsername?.let { return it }
        val me = runCatching { call("getMe", JsonObject(emptyMap())) }.getOrNull()
        return me?.jsonObject?.get("username")?.jsonPrimitive?.content?.also { cachedUsername = it }
    }

    /** Downloads a file sent to the bot. Bot API allows up to 20 MB. */
    suspend fun downloadFile(fileId: String): ByteArray? {
        val file = call("getFile", JsonObject(mapOf("file_id" to kotlinx.serialization.json.JsonPrimitive(fileId))))
        val path = file?.jsonObject?.get("file_path")?.jsonPrimitive?.content ?: return null
        val response = client.get("https://api.telegram.org/file/bot$botToken/$path")
        return if (response.status.isSuccess()) response.bodyAsBytes() else null
    }

    /** Membership checks are cached for 10 minutes to stay well within Bot API rate limits. */
    suspend fun isMember(chatId: Long, userId: Long): Boolean {
        val key = chatId to userId
        membershipCache[key]?.takeIf { it.expiresAt.isAfter(Instant.now()) }?.let { return it.isMember }

        val result = runCatching {
            call("getChatMember", JsonObject(mapOf("chat_id" to json(chatId), "user_id" to json(userId))))
        }.onFailure { log.warn("getChatMember failed", it) }.getOrNull()

        val member = result?.jsonObject?.let {
            when (it["status"]?.jsonPrimitive?.content) {
                "creator", "administrator", "member" -> true
                "restricted" -> it["is_member"]?.jsonPrimitive?.boolean == true
                else -> false
            }
        } ?: false

        // Short negative cache, so someone who just joined the group isn't locked out for long.
        val ttl = if (member) Duration.ofMinutes(10) else Duration.ofMinutes(1)
        membershipCache[key] = CachedMembership(member, Instant.now().plus(ttl))
        return member
    }

    /** Member of at least one of [chatIds]; true when no groups are configured. */
    suspend fun isMemberOfAny(chatIds: List<Long>, userId: Long): Boolean =
        chatIds.isEmpty() || chatIds.any { isMember(it, userId) }

    /** Drops the cached answer, e.g. when the bot sees the user join the group. */
    fun forgetMembership(chatId: Long, userId: Long) {
        membershipCache.remove(chatId to userId)
    }

    private fun json(value: Long) = kotlinx.serialization.json.JsonPrimitive(value)
}
