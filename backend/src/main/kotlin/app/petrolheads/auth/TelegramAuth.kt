package app.petrolheads.auth

import app.petrolheads.AppConfig
import app.petrolheads.db.AdminRepository
import app.petrolheads.db.UserRepository
import app.petrolheads.telegram.TelegramApi
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.ApplicationCall
import io.ktor.server.auth.AuthenticationConfig
import io.ktor.server.auth.AuthenticationFailedCause
import io.ktor.server.auth.principal
import io.ktor.server.response.respond
import kotlinx.serialization.Serializable

/**
 * [isMember]: in the club's Telegram group (or no group is configured). Non-members can browse
 * but not change anything; admins can do everything.
 */
data class UserPrincipal(val userId: Long, val telegramId: Long, val isAdmin: Boolean, val isMember: Boolean)

@Serializable
data class ErrorResponse(val error: String)

const val TMA_AUTH = "tma"

private val devUser = TelegramUser(id = 1, firstName = "Dev", username = "dev_racer")
/** DEV_AUTH only: a plain non-admin user, for checking what people outside the group see. */
private val devGuest = TelegramUser(id = 2, firstName = "Guest", username = "dev_guest")

/**
 * Authenticates requests carrying `Authorization: tma <initData>`, checks group membership
 * and upserts the user into the database.
 */
fun AuthenticationConfig.telegramMiniApp(config: AppConfig, telegram: TelegramApi) {
    provider(TMA_AUTH) {
        authenticate { context ->
            val header = context.call.request.headers["Authorization"]
            val raw = header?.takeIf { it.startsWith("tma ") }?.removePrefix("tma ")

            val tgUser = when {
                raw == null -> null
                config.devAuth && raw == "dev" -> devUser
                config.devAuth && raw == "dev-guest" -> devGuest
                else -> InitDataValidator.validate(raw, config.botToken)
            }

            if (tgUser == null) {
                context.challenge(TMA_AUTH, AuthenticationFailedCause.InvalidCredentials) { challenge, call ->
                    call.respond(HttpStatusCode.Unauthorized, ErrorResponse("Invalid or missing Telegram init data"))
                    challenge.complete()
                }
                return@authenticate
            }

            val isDev = config.devAuth && tgUser === devUser
            val userId = UserRepository.upsertFromTelegram(tgUser)
            val isAdmin = isDev || tgUser.id in config.adminTelegramIds || AdminRepository.isAdmin(tgUser)
            // Everyone in Telegram can look around; only group members (and admins) can change things.
            val isMember = isAdmin || telegram.isMemberOfAny(config.groupChatIds, tgUser.id)
            context.principal(UserPrincipal(userId, tgUser.id, isAdmin, isMember))
        }
    }
}

val ApplicationCall.user: UserPrincipal
    get() = principal<UserPrincipal>() ?: error("Route is not protected by $TMA_AUTH auth")
