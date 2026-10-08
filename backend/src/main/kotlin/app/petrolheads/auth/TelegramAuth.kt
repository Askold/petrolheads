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

data class UserPrincipal(val userId: Long, val telegramId: Long, val isAdmin: Boolean)

@Serializable
data class ErrorResponse(val error: String)

const val TMA_AUTH = "tma"

private val devUser = TelegramUser(id = 1, firstName = "Dev", username = "dev_racer")

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
            if (!isDev && config.groupChatId != null && !telegram.isMember(config.groupChatId, tgUser.id)) {
                context.challenge(TMA_AUTH, AuthenticationFailedCause.Error("not a member")) { challenge, call ->
                    call.respond(HttpStatusCode.Forbidden, ErrorResponse("Only members of the group can use this app"))
                    challenge.complete()
                }
                return@authenticate
            }

            val userId = UserRepository.upsertFromTelegram(tgUser)
            context.principal(
                UserPrincipal(
                    userId = userId,
                    telegramId = tgUser.id,
                    isAdmin = isDev || tgUser.id in config.adminTelegramIds || AdminRepository.isAdmin(tgUser),
                )
            )
        }
    }
}

val ApplicationCall.user: UserPrincipal
    get() = principal<UserPrincipal>() ?: error("Route is not protected by $TMA_AUTH auth")
