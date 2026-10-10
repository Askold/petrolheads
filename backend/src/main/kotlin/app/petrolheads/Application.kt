package app.petrolheads

import app.petrolheads.auth.ErrorResponse
import app.petrolheads.auth.TMA_AUTH
import app.petrolheads.auth.telegramMiniApp
import app.petrolheads.db.DatabaseFactory
import app.petrolheads.routes.ForbiddenException
import app.petrolheads.routes.apiRoutes
import app.petrolheads.photos.PhotoService
import app.petrolheads.telegram.Bot
import app.petrolheads.telegram.TelegramApi
import app.petrolheads.telegram.botWebhook
import app.petrolheads.telegram.registerWebhook
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpMethod
import io.ktor.http.HttpStatusCode
import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.application.Application
import io.ktor.server.application.install
import io.ktor.server.auth.Authentication
import io.ktor.server.auth.authenticate
import io.ktor.server.engine.embeddedServer
import io.ktor.server.http.content.staticFiles
import io.ktor.server.netty.Netty
import io.ktor.server.plugins.BadRequestException
import io.ktor.server.plugins.NotFoundException
import io.ktor.server.plugins.calllogging.CallLogging
import io.ktor.server.plugins.partialcontent.PartialContent
import io.ktor.server.plugins.contentnegotiation.ContentNegotiation
import io.ktor.server.plugins.cors.routing.CORS
import io.ktor.server.plugins.statuspages.StatusPages
import io.ktor.server.response.respond
import io.ktor.server.response.respondText
import io.ktor.server.routing.get
import io.ktor.server.routing.routing
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json

fun main() {
    val config = AppConfig.fromEnv()
    embeddedServer(Netty, port = config.port, host = "0.0.0.0") { module(config) }.start(wait = true)
}

fun Application.module(config: AppConfig, telegram: TelegramApi = TelegramApi(config.botToken)) {
    DatabaseFactory.init(config.db)
    val photos = PhotoService(config.uploadDir, config)
    photos.cutouts.start(this)
    // Reputation is derived data: refresh the cache on startup (also migrates the old +100-per-lap values).
    launch { app.petrolheads.db.Reputation.recomputeAll() }
    val bot = Bot(config, telegram, photos)

    install(CallLogging)
    // Range requests: iOS won't play <audio> without them.
    install(PartialContent)
    install(ContentNegotiation) {
        json(Json { ignoreUnknownKeys = true; explicitNulls = true; encodeDefaults = true })
    }
    if (config.corsOrigins.isNotEmpty()) {
        install(CORS) {
            config.corsOrigins.forEach { allowHost(it.substringAfter("://"), schemes = listOf(it.substringBefore("://"))) }
            allowHeader(HttpHeaders.Authorization)
            allowHeader(HttpHeaders.ContentType)
            allowMethod(HttpMethod.Put)
            allowMethod(HttpMethod.Patch)
            allowMethod(HttpMethod.Delete)
        }
    }
    install(StatusPages) {
        exception<BadRequestException> { call, e ->
            call.respond(HttpStatusCode.BadRequest, ErrorResponse(e.rootMessage()))
        }
        exception<NotFoundException> { call, e ->
            call.respond(HttpStatusCode.NotFound, ErrorResponse(e.message ?: "Not found"))
        }
        exception<ForbiddenException> { call, e ->
            call.respond(HttpStatusCode.Forbidden, ErrorResponse(e.message ?: "Forbidden"))
        }
        exception<Throwable> { call, e ->
            call.application.environment.log.error("Unhandled error", e)
            call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Internal error"))
        }
    }
    install(Authentication) { telegramMiniApp(config, telegram) }

    routing {
        get("/health") { call.respondText("ok") }
        // File names are random UUIDs, so photos are public-by-link like Telegram's own media.
        staticFiles("/media", photos.dir.toFile()) {
            cacheControl { listOf(io.ktor.http.CacheControl.MaxAge(maxAgeSeconds = 31_536_000)) }
        }
        botWebhook(config, bot)
        authenticate(TMA_AUTH) { apiRoutes(photos, telegram, config.adminTelegramIds, config.groupInviteUrl) }
    }

    if (!config.devAuth) launch { registerWebhook(config, telegram) }
}

/** Deserialization errors are wrapped; surface the useful part to the client. */
private fun Throwable.rootMessage(): String {
    var e: Throwable = this
    while (e.cause != null && e.cause !== e) e = e.cause!!
    return e.message?.lineSequence()?.firstOrNull() ?: "Bad request"
}
