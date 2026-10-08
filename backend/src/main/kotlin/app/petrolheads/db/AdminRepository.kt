package app.petrolheads.db

import app.petrolheads.AdminDto
import app.petrolheads.auth.TelegramUser
import app.petrolheads.routes.badRequest
import app.petrolheads.routes.notFound
import org.jetbrains.exposed.v1.core.and
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.core.inList
import org.jetbrains.exposed.v1.core.isNull
import org.jetbrains.exposed.v1.jdbc.deleteWhere
import org.jetbrains.exposed.v1.jdbc.insertAndGetId
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.jetbrains.exposed.v1.jdbc.update

object AdminRepository {
    private val USERNAME = Regex("^[a-z0-9_]{4,32}$")

    fun normalizeUsername(raw: String): String {
        val u = raw.trim().removePrefix("@").lowercase()
        if (!USERNAME.matches(u)) badRequest("Enter a Telegram username like @whoisitalex")
        return u
    }

    /**
     * True if [tg] is an app-managed admin. A username-only row gets bound to the Telegram id
     * the first time that user shows up.
     */
    suspend fun isAdmin(tg: TelegramUser): Boolean = dbQuery {
        if (!Admins.selectAll().where { Admins.telegramId eq tg.id }.empty()) return@dbQuery true
        val username = tg.username?.lowercase() ?: return@dbQuery false
        val bound = Admins.update({ (Admins.username eq username) and Admins.telegramId.isNull() }) {
            it[telegramId] = tg.id
        }
        bound > 0
    }

    suspend fun list(configIds: Set<Long>): List<AdminDto> = dbQuery {
        val rows = Admins.selectAll().orderBy(Admins.id).toList()
        val ids = rows.mapNotNull { it[Admins.telegramId] } + configIds
        val users = Users.selectAll().where { Users.telegramId inList ids }.associate { it[Users.telegramId] to it.toUserDto() }
        val fromDb = rows.map { r ->
            AdminDto(r[Admins.id].value, r[Admins.username], r[Admins.telegramId]?.let { users[it] }, fromConfig = false)
        }
        val dbIds = rows.mapNotNull { it[Admins.telegramId] }.toSet()
        val fromConfig = (configIds - dbIds).map { id -> AdminDto(null, users[id]?.username, users[id], fromConfig = true) }
        fromConfig + fromDb
    }

    suspend fun add(username: String, addedBy: Long) = dbQuery {
        val u = normalizeUsername(username)
        if (!Admins.selectAll().where { Admins.username eq u }.empty()) badRequest("@$u is already an admin")
        // If they've already opened the app, bind right away.
        val tgId = Users.selectAll().firstOrNull { it[Users.username]?.lowercase() == u }?.get(Users.telegramId)
        if (tgId != null && !Admins.selectAll().where { Admins.telegramId eq tgId }.empty()) badRequest("@$u is already an admin")
        Admins.insertAndGetId {
            it[Admins.username] = u
            it[telegramId] = tgId
            it[Admins.addedBy] = addedBy
        }
    }

    suspend fun remove(id: Long, requesterTelegramId: Long) = dbQuery {
        val row = Admins.selectAll().where { Admins.id eq id }.singleOrNull() ?: notFound("Admin not found")
        if (row[Admins.telegramId] == requesterTelegramId) badRequest("You can't remove yourself")
        Admins.deleteWhere { Admins.id eq id }
    }
}
