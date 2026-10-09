package app.petrolheads.db

import app.petrolheads.MusicTrackDto
import app.petrolheads.photos.PhotoService
import app.petrolheads.routes.notFound
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.jdbc.deleteWhere
import org.jetbrains.exposed.v1.jdbc.insertAndGetId
import org.jetbrains.exposed.v1.jdbc.selectAll
import java.nio.file.Files
import java.nio.file.Path
import java.util.UUID
import kotlin.io.path.deleteIfExists

/** Background music. Files live next to the photos and are served from /media. */
object MusicRepository {
    const val MAX_BYTES = 20_000_000 // Bot API download limit

    /** Formats every phone WebView plays (iOS has no Ogg/FLAC in <audio>), by MIME type → file extension. */
    val SUPPORTED = mapOf(
        "audio/mpeg" to "mp3",
        "audio/mp3" to "mp3",
        "audio/mp4" to "m4a",
        "audio/x-m4a" to "m4a",
        "audio/m4a" to "m4a",
        "audio/aac" to "aac",
    )

    suspend fun list(): List<MusicTrackDto> = dbQuery {
        Music.selectAll().orderBy(Music.id).map {
            MusicTrackDto(
                it[Music.id].value,
                PhotoService.urlFor(it[Music.fileName]),
                it[Music.title],
                it[Music.performer],
                it[Music.durationS],
            )
        }
    }

    suspend fun add(dir: Path, bytes: ByteArray, ext: String, title: String?, performer: String?, durationS: Int?, addedBy: Long?): MusicTrackDto {
        val fileName = "music-${UUID.randomUUID()}.$ext"
        withContext(Dispatchers.IO) { Files.write(dir.resolve(fileName), bytes) }
        val id = dbQuery {
            Music.insertAndGetId {
                it[Music.title] = title?.take(200)
                it[Music.performer] = performer?.take(200)
                it[Music.fileName] = fileName
                it[Music.durationS] = durationS
                it[Music.addedBy] = addedBy
            }.value
        }
        return MusicTrackDto(id, PhotoService.urlFor(fileName), title, performer, durationS)
    }

    suspend fun delete(dir: Path, id: Long) {
        val file = dbQuery {
            val row = Music.selectAll().where { Music.id eq id }.singleOrNull() ?: notFound("Track not found")
            Music.deleteWhere { Music.id eq id }
            row[Music.fileName]
        }
        withContext(Dispatchers.IO) { dir.resolve(file).deleteIfExists() }
    }
}
