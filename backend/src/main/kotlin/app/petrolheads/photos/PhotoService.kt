package app.petrolheads.photos

import app.petrolheads.AppConfig
import app.petrolheads.PhotoDto
import app.petrolheads.db.CutoutStatus
import app.petrolheads.db.CarPhotos
import app.petrolheads.db.Cars
import app.petrolheads.db.dbQuery
import app.petrolheads.routes.badRequest
import app.petrolheads.routes.notFound
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.jetbrains.exposed.v1.core.SortOrder
import org.jetbrains.exposed.v1.core.and
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.jdbc.deleteWhere
import org.jetbrains.exposed.v1.jdbc.insertAndGetId
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.jetbrains.exposed.v1.jdbc.update
import java.nio.file.Files
import java.nio.file.Path
import java.util.UUID
import kotlin.io.path.deleteIfExists

enum class PhotoSource(val db: String) { APP("app"), BOT("bot") }

class PhotoService(uploadDir: String, private val config: AppConfig) {
    val dir: Path = Path.of(uploadDir).toAbsolutePath().also { Files.createDirectories(it) }
    val cutouts = CutoutWorker(config, dir)

    /** Processes and stores a photo for a car the user owns. The first photo becomes the cover. */
    suspend fun add(userId: Long, carId: Long, bytes: ByteArray, source: PhotoSource): PhotoDto {
        if (bytes.size > MAX_UPLOAD_BYTES) badRequest("Photo is larger than ${MAX_UPLOAD_BYTES / 1_000_000} MB")
        val car = dbQuery { Cars.selectAll().where { Cars.id eq carId }.singleOrNull() } ?: notFound("Car not found")
        if (car[Cars.userId].value != userId) notFound("Car not found")
        val count = dbQuery { CarPhotos.selectAll().where { CarPhotos.carId eq carId }.count() }
        if (count >= MAX_PHOTOS_PER_CAR) badRequest("A car can have at most $MAX_PHOTOS_PER_CAR photos")

        val image = withContext(Dispatchers.Default) {
            try {
                ImageProcessor.process(bytes)
            } catch (e: InvalidImageException) {
                badRequest(e.message ?: "Invalid image")
            }
        }
        val fileName = "${UUID.randomUUID()}.jpg"
        withContext(Dispatchers.IO) { Files.write(dir.resolve(fileName), image.jpeg) }

        return dbQuery {
            val id = CarPhotos.insertAndGetId {
                it[CarPhotos.carId] = carId
                it[CarPhotos.fileName] = fileName
                it[width] = image.width
                it[height] = image.height
                it[CarPhotos.uploadSource] = source.db
                it[cutoutStatus] = if (cutouts.enabled) CutoutStatus.PENDING else CutoutStatus.SKIPPED
            }.value
            if (car[Cars.photoUrl] == null) {
                Cars.update({ Cars.id eq carId }) { it[photoUrl] = urlFor(fileName) }
            }
            PhotoDto(id, urlFor(fileName), image.width, image.height, cutoutStatus = if (cutouts.enabled) CutoutStatus.PENDING else CutoutStatus.SKIPPED)
        }.also { cutouts.enqueue(it.id) }
    }

    /** Stores a lap-proof screenshot from the gallery (re-encoded, so EXIF/GPS is stripped). */
    suspend fun addProof(bytes: ByteArray): String {
        if (bytes.size > MAX_UPLOAD_BYTES) badRequest("Photo is larger than ${MAX_UPLOAD_BYTES / 1_000_000} MB")
        val image = withContext(Dispatchers.Default) {
            try {
                ImageProcessor.process(bytes)
            } catch (e: InvalidImageException) {
                badRequest(e.message ?: "Invalid image")
            }
        }
        val fileName = "proof-${UUID.randomUUID()}.jpg"
        withContext(Dispatchers.IO) { Files.write(dir.resolve(fileName), image.jpeg) }
        return urlFor(fileName)
    }

    suspend fun delete(userId: Long, photoId: Long) {
        val files = dbQuery {
            val photo = ownedPhoto(userId, photoId)
            val carId = photo[CarPhotos.carId].value
            CarPhotos.deleteWhere { CarPhotos.id eq photoId }
            if (photo[Cars.photoUrl] == urlFor(photo[CarPhotos.fileName])) {
                // Promote the newest remaining photo to cover, if any.
                val next = CarPhotos.selectAll().where { CarPhotos.carId eq carId }
                    .orderBy(CarPhotos.id, SortOrder.DESC).firstOrNull()
                Cars.update({ Cars.id eq carId }) { it[photoUrl] = next?.let { n -> urlFor(n[CarPhotos.fileName]) } }
            }
            listOfNotNull(photo[CarPhotos.fileName], photo[CarPhotos.cutoutFile])
        }
        withContext(Dispatchers.IO) { files.forEach { dir.resolve(it).deleteIfExists() } }
    }

    suspend fun setCover(userId: Long, photoId: Long) = dbQuery {
        val photo = ownedPhoto(userId, photoId)
        Cars.update({ Cars.id eq photo[CarPhotos.carId].value }) { it[photoUrl] = urlFor(photo[CarPhotos.fileName]) }
    }

    /** Photo joined with its car, only if the car belongs to [userId]. */
    private fun ownedPhoto(userId: Long, photoId: Long) =
        (CarPhotos innerJoin Cars).selectAll()
            .where { (CarPhotos.id eq photoId) and (Cars.userId eq userId) }
            .singleOrNull()
            ?: notFound("Photo not found")

    companion object {
        const val MAX_UPLOAD_BYTES = 15_000_000
        const val MAX_PHOTOS_PER_CAR = 12
        fun urlFor(fileName: String) = "/media/$fileName"
    }
}
