package app.petrolheads

data class DbConfig(val url: String, val user: String, val password: String)

data class AppConfig(
    val port: Int,
    val botToken: String,
    /** Telegram chat id of the car group; when set, only its members can use the app. */
    val groupChatId: Long?,
    val adminTelegramIds: Set<Long>,
    /** Public HTTPS origin of the app, e.g. https://petrolheads.example.com */
    val publicUrl: String?,
    val webhookSecret: String?,
    val db: DbConfig,
    /** Accepts `Authorization: tma dev` as a fake user. Never enable in production. */
    val devAuth: Boolean,
    val corsOrigins: List<String>,
    /** Where processed car photos are stored; served at /media/<file>. */
    val uploadDir: String,
    /** Base URL of the rembg background-removal service; null disables cutouts. */
    val cutoutUrl: String?,
    val cutoutModel: String,
) {
    companion object {
        fun fromEnv(env: Map<String, String> = System.getenv()): AppConfig {
            fun opt(name: String) = env[name]?.takeIf { it.isNotBlank() }
            fun req(name: String) = opt(name) ?: error("Missing required env var $name")

            val devAuth = opt("DEV_AUTH")?.toBoolean() ?: false
            return AppConfig(
                port = opt("PORT")?.toInt() ?: 8080,
                botToken = if (devAuth) opt("BOT_TOKEN") ?: "dev" else req("BOT_TOKEN"),
                groupChatId = opt("GROUP_CHAT_ID")?.toLong(),
                adminTelegramIds = opt("ADMIN_TELEGRAM_IDS")
                    ?.split(",")?.mapNotNull { it.trim().toLongOrNull() }?.toSet()
                    ?: emptySet(),
                publicUrl = opt("PUBLIC_URL")?.trimEnd('/'),
                webhookSecret = opt("BOT_WEBHOOK_SECRET"),
                db = DbConfig(
                    url = opt("DATABASE_URL") ?: "jdbc:postgresql://localhost:5432/petrolheads",
                    user = opt("DATABASE_USER") ?: "petrolheads",
                    password = opt("DATABASE_PASSWORD") ?: "petrolheads",
                ),
                devAuth = devAuth,
                corsOrigins = opt("CORS_ORIGINS")?.split(",")?.map { it.trim() } ?: emptyList(),
                uploadDir = opt("UPLOAD_DIR") ?: "uploads",
                cutoutUrl = opt("CUTOUT_URL")?.trimEnd('/'),
                cutoutModel = opt("CUTOUT_MODEL") ?: "isnet-general-use",
            )
        }
    }
}
