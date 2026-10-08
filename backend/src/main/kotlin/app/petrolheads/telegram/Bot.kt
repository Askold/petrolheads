package app.petrolheads.telegram

import app.petrolheads.AppConfig
import app.petrolheads.CarDto
import app.petrolheads.db.CarRepository
import app.petrolheads.photos.PhotoService
import app.petrolheads.photos.PhotoSource
import io.ktor.http.HttpStatusCode
import io.ktor.server.plugins.BadRequestException
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.post
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.addJsonArray
import kotlinx.serialization.json.addJsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import kotlinx.serialization.json.putJsonArray
import kotlinx.serialization.json.putJsonObject
import org.slf4j.LoggerFactory
import java.time.Instant
import java.util.concurrent.ConcurrentHashMap

private val log = LoggerFactory.getLogger("Bot")

/** Registers the webhook so Telegram pushes bot updates to POST /bot/webhook. */
suspend fun registerWebhook(config: AppConfig, telegram: TelegramApi) {
    val publicUrl = config.publicUrl ?: return
    val secret = config.webhookSecret ?: return log.warn("BOT_WEBHOOK_SECRET not set, webhook not registered")
    telegram.call("setWebhook", buildJsonObject {
        put("url", "$publicUrl/bot/webhook")
        put("secret_token", secret)
        putJsonArray("allowed_updates") {
            add(JsonPrimitive("message"))
            add(JsonPrimitive("callback_query"))
        }
    })
    log.info("Webhook registered at {}/bot/webhook", publicUrl)
    // Command menu: private chats and groups
    for (scope in listOf("all_private_chats", "all_group_chats")) {
        telegram.call("setMyCommands", buildJsonObject {
            putJsonArray("commands") {
                addJsonObject {
                    put("command", "garage")
                    put("description", "Открыть гараж Petrolheads")
                }
            }
            putJsonObject("scope") { put("type", scope) }
        })
    }
}

/**
 * Bot DM features:
 * - /start replies with a button that opens the Mini App
 * - sending a photo (or an image file) attaches it to one of your cars;
 *   with several cars the bot asks which one via inline buttons
 */
/** Bot replies in English and Russian, picked from the sender's Telegram language. */
private class BotText(ru: Boolean) {
    val notImage = if (ru) "Это не изображение. Пришлите фото машины в JPEG, PNG или WebP." else "That file isn't an image. Send a JPEG, PNG or WebP photo of your car."
    val hint = if (ru) "Пришлите фото своей машины, и я добавлю его в гараж. Кнопка ниже открывает приложение." else "Send me a photo of your car and I'll put it in your garage. Use the button below to open the app."
    val membersOnly = if (ru) "Гараж только для участников группы." else "This garage is only for members of the group."
    val openAppFirst = if (ru) "Сначала откройте приложение и добавьте машину." else "Open the app once and add your car first."
    val emptyGarage = if (ru) "Гараж пуст. Добавьте машину в приложении и пришлите фото ещё раз." else "Your garage is empty. Add a car in the app, then send the photo again."
    val expired = if (ru) "Загрузка устарела. Пришлите фото ещё раз." else "That upload expired. Send the photo again."
    val carNotFound = if (ru) "Машина не найдена." else "Car not found."
    val tooBig = if (ru) "Не удалось скачать одно из фото (Telegram ограничивает ботов файлами до 20 МБ)." else "Couldn't download one of the photos (Telegram limits bots to 20 MB files)."
    val badPhoto = if (ru) "Не получилось использовать это фото." else "Couldn't use that photo."
    val whichCar = if (ru) "Какая это машина?" else "Which car is this?"
    val openButton = if (ru) "🏁 Открыть гараж" else "🏁 Open garage"
    val welcome = if (ru) {
        "Добро пожаловать в гараж! Откройте приложение, чтобы заполнить профиль, или пришлите фото машины — я добавлю его в гараж."
    } else {
        "Welcome to the garage, racer. Open the app to set up your profile, or send me photos of your car and I'll add them to your garage."
    }
    val cutoutNote = if (ru) " Через несколько секунд она появится на поворотном круге." else " It'll be on the turntable in a few seconds."
    val added: (Int, String) -> String = { n, car ->
        if (ru) (if (n == 1) "✅ Фото добавлено к $car." else "✅ Добавлено фото: $n — $car.")
        else (if (n == 1) "✅ Photo added to $car." else "✅ $n photos added to $car.")
    }
}

/** Posted in the club group when someone joins (text from the club). */
internal const val GROUP_WELCOME = """Добро пожаловать в Petrolheads. 🏁

Что у нас есть:
— общение без токсичности
— трек-дни и тайм-атак
— совместные выезды
— помощь советом и делом

Правила простые: не быть мудаком😁
Остальное — как на треке: уважаем друг-друга и кайфуем.

Расскажи и покажи на чём ездишь 📸

Заполни профиль 👇"""

internal const val GROUP_INTRO = "Я бот Petrolheads 🏁 Команда /garage открывает гараж клуба: профили, машины и рейтинг трасс."

/** True for "/cmd", "/cmd args" and "/cmd@thisbot", but not "/cmd@otherbot". */
internal fun isCommand(text: String?, command: String, botUsername: String?): Boolean {
    val head = text?.trim()?.substringBefore(' ') ?: return false
    if (!head.startsWith("/")) return false
    val name = head.removePrefix("/").substringBefore('@')
    val target = head.substringAfter('@', "")
    return name.equals(command, ignoreCase = true) &&
        (target.isEmpty() || botUsername == null || target.equals(botUsername, ignoreCase = true))
}

private fun JsonObject.isRussian() =
    this["from"]?.jsonObject?.get("language_code")?.jsonPrimitive?.content?.startsWith("ru") == true

class Bot(private val config: AppConfig, private val telegram: TelegramApi, private val photos: PhotoService) {
    private data class PendingPhoto(val fileIds: List<String>, val expiresAt: Instant)

    /** Photos waiting for the user to pick a car, keyed by Telegram user id. */
    private val pending = ConcurrentHashMap<Long, PendingPhoto>()

    suspend fun handle(update: JsonObject) {
        update["message"]?.jsonObject?.let { return onMessage(it) }
        update["callback_query"]?.jsonObject?.let { return onCallback(it) }
    }

    private suspend fun onMessage(message: JsonObject) {
        val chat = message["chat"]?.jsonObject ?: return
        if (chat["type"]?.jsonPrimitive?.content in setOf("group", "supergroup")) return onGroupMessage(chat, message)
        if (chat["type"]?.jsonPrimitive?.content != "private") return
        val chatId = chat["id"]!!.jsonPrimitive.content.toLong()
        val fromId = message["from"]?.jsonObject?.get("id")?.jsonPrimitive?.content?.toLongOrNull() ?: return
        val text = message["text"]?.jsonPrimitive?.content
        val t = BotText(message.isRussian())

        if (text?.startsWith("/start") == true) return send(chatId, t.welcome, t)

        val fileId = photoFileId(message)
        if (fileId == null) {
            if (message["document"] != null) send(chatId, t.notImage)
            else send(chatId, t.hint, t)
            return
        }

        if (!isAllowed(fromId)) return send(chatId, t.membersOnly)
        val (userId, cars) = CarRepository.forTelegramUser(fromId)
            ?: return send(chatId, t.openAppFirst, t)

        when (cars.size) {
            0 -> send(chatId, t.emptyGarage, t)
            1 -> attach(chatId, userId, cars.single(), listOf(fileId), t)
            else -> {
                // Albums arrive as separate messages; collect them until the user picks a car.
                val prev = pending[fromId]?.takeIf { it.expiresAt.isAfter(Instant.now()) }?.fileIds.orEmpty()
                pending[fromId] = PendingPhoto(prev + fileId, Instant.now().plusSeconds(600))
                if (prev.isEmpty()) askWhichCar(chatId, cars, t)
            }
        }
    }

    /**
     * In groups: greet people who join and answer /garage with a link that opens the Mini App.
     * (web_app buttons are private-chat only; t.me/<bot>?startapp opens the bot's Main Mini App anywhere.)
     */
    private suspend fun onGroupMessage(chat: JsonObject, message: JsonObject) {
        val chatId = chat["id"]!!.jsonPrimitive.content.toLong()
        // Logged so the group's id can be put into GROUP_CHAT_ID.
        log.info("Group message in chat {} ({})", chatId, chat["title"]?.jsonPrimitive?.content)
        val botName = telegram.botUsername()

        message["new_chat_members"]?.jsonArray?.let { joined ->
            val members = joined.map { it.jsonObject }
            val botAdded = members.any { it["username"]?.jsonPrimitive?.content.equals(botName, ignoreCase = true) }
            val people = members.filter { it["is_bot"]?.jsonPrimitive?.content != "true" }
            if (botAdded) sendWithAppLink(chatId, GROUP_INTRO, "🏁 Открыть гараж", botName)
            if (people.isNotEmpty()) sendWithAppLink(chatId, GROUP_WELCOME, "🏁 Заполнить профиль", botName)
            return
        }

        val text = message["text"]?.jsonPrimitive?.content
        if (isCommand(text, "garage", botName) || isCommand(text, "start", botName) || isCommand(text, "app", botName)) {
            sendWithAppLink(chatId, "Гараж Petrolheads 🏁", "🏁 Открыть гараж", botName)
        }
    }

    private suspend fun sendWithAppLink(chatId: Long, text: String, buttonText: String, botName: String?) {
        val link = botName?.let { "https://t.me/$it?startapp" } ?: config.publicUrl
        telegram.call("sendMessage", buildJsonObject {
            put("chat_id", chatId)
            put("text", text)
            if (link != null) {
                putJsonObject("reply_markup") {
                    putJsonArray("inline_keyboard") {
                        addJsonArray {
                            addJsonObject {
                                put("text", buttonText)
                                put("url", link)
                            }
                        }
                    }
                }
            }
        })
    }

    private suspend fun onCallback(query: JsonObject) {
        val queryId = query["id"]!!.jsonPrimitive.content
        val fromId = query["from"]!!.jsonObject["id"]!!.jsonPrimitive.content.toLong()
        val chatId = query["message"]?.jsonObject?.get("chat")?.jsonObject?.get("id")?.jsonPrimitive?.content?.toLongOrNull()
        val data = query["data"]?.jsonPrimitive?.content.orEmpty()
        val t = BotText(query.isRussian())
        telegram.call("answerCallbackQuery", buildJsonObject { put("callback_query_id", queryId) })

        val carId = data.removePrefix("photo:").toLongOrNull() ?: return
        if (chatId == null) return
        val photosToAttach = pending.remove(fromId)?.takeIf { it.expiresAt.isAfter(Instant.now()) }
            ?: return send(chatId, t.expired)
        val (userId, cars) = CarRepository.forTelegramUser(fromId) ?: return
        val car = cars.find { it.id == carId } ?: return send(chatId, t.carNotFound)
        attach(chatId, userId, car, photosToAttach.fileIds, t)
    }

    private suspend fun attach(chatId: Long, userId: Long, car: CarDto, fileIds: List<String>, t: BotText) {
        var saved = 0
        for (fileId in fileIds) {
            val bytes = telegram.downloadFile(fileId)
            if (bytes == null) {
                send(chatId, t.tooBig)
                continue
            }
            try {
                photos.add(userId, car.id, bytes, PhotoSource.BOT)
                saved++
            } catch (e: BadRequestException) {
                send(chatId, e.message ?: t.badPhoto)
            }
        }
        if (saved > 0) {
            val note = if (photos.cutouts.enabled) t.cutoutNote else ""
            send(chatId, t.added(saved, "${car.make} ${car.model}") + note, t)
        }
    }

    private suspend fun askWhichCar(chatId: Long, cars: List<CarDto>, t: BotText) {
        telegram.call("sendMessage", buildJsonObject {
            put("chat_id", chatId)
            put("text", t.whichCar)
            putJsonObject("reply_markup") {
                putJsonArray("inline_keyboard") {
                    cars.forEach { car ->
                        addJsonArray {
                            addJsonObject {
                                put("text", "${car.make} ${car.model}${car.year?.let { " ($it)" } ?: ""}")
                                put("callback_data", "photo:${car.id}")
                            }
                        }
                    }
                }
            }
        })
    }

    /** Sends [text]; when [withButton] is given, adds the localised "Open garage" Mini App button. */
    private suspend fun send(chatId: Long, text: String, withButton: BotText? = null) {
        telegram.call("sendMessage", buildJsonObject {
            put("chat_id", chatId)
            put("text", text)
            if (withButton != null && config.publicUrl != null) {
                putJsonObject("reply_markup") {
                    putJsonArray("inline_keyboard") {
                        addJsonArray {
                            addJsonObject {
                                put("text", withButton.openButton)
                                putJsonObject("web_app") { put("url", config.publicUrl) }
                            }
                        }
                    }
                }
            }
        })
    }

    private suspend fun isAllowed(telegramId: Long) =
        config.groupChatId == null || telegram.isMember(config.groupChatId, telegramId)

    /** Largest size of a compressed photo, or an image sent "as file" (keeps full quality). */
    private fun photoFileId(message: JsonObject): String? {
        message["photo"]?.jsonArray?.lastOrNull()?.jsonObject?.get("file_id")?.jsonPrimitive?.content?.let { return it }
        val doc = message["document"]?.jsonObject ?: return null
        val mime = doc["mime_type"]?.jsonPrimitive?.content.orEmpty()
        return if (mime.startsWith("image/")) doc["file_id"]?.jsonPrimitive?.content else null
    }
}

fun Route.botWebhook(config: AppConfig, bot: Bot) {
    post("/bot/webhook") {
        if (config.webhookSecret == null ||
            call.request.headers["X-Telegram-Bot-Api-Secret-Token"] != config.webhookSecret
        ) {
            return@post call.respond(HttpStatusCode.Forbidden)
        }
        val update = call.receive<JsonObject>()
        // Always 200: a failing update would otherwise be redelivered by Telegram over and over.
        runCatching { bot.handle(update) }.onFailure { log.error("Failed to handle update", it) }
        call.respond(HttpStatusCode.OK)
    }
}
