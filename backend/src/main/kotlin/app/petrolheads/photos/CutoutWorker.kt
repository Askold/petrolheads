package app.petrolheads.photos

import app.petrolheads.AppConfig
import app.petrolheads.db.CarPhotos
import app.petrolheads.db.CutoutStatus
import app.petrolheads.db.dbQuery
import io.ktor.client.HttpClient
import io.ktor.client.engine.cio.CIO
import io.ktor.client.plugins.HttpTimeout
import io.ktor.client.request.forms.formData
import io.ktor.client.request.forms.submitFormWithBinaryData
import io.ktor.client.statement.bodyAsBytes
import io.ktor.http.Headers
import io.ktor.http.HttpHeaders
import io.ktor.http.isSuccess
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.jetbrains.exposed.v1.jdbc.update
import org.slf4j.LoggerFactory
import java.nio.file.Files
import java.nio.file.Path
import java.util.UUID

/**
 * Background removal queue. Photos are processed one at a time (the model needs ~1 GB RAM),
 * by a rembg service at CUTOUT_URL. Pending photos are re-queued on startup.
 */
class CutoutWorker(private val config: AppConfig, private val dir: Path) {
    private val log = LoggerFactory.getLogger(CutoutWorker::class.java)
    private val queue = Channel<Long>(Channel.UNLIMITED)
    private val client = HttpClient(CIO) {
        install(HttpTimeout) { requestTimeoutMillis = 180_000 }
    }

    val enabled get() = config.cutoutUrl != null

    fun enqueue(photoId: Long) {
        queue.trySend(photoId)
    }

    fun start(scope: CoroutineScope) {
        scope.launch {
            if (!enabled) {
                log.info("CUTOUT_URL not set, background removal disabled")
                // Otherwise the app would keep waiting for cutouts that never come.
                dbQuery {
                    CarPhotos.update({ CarPhotos.cutoutStatus eq CutoutStatus.PENDING }) { it[cutoutStatus] = CutoutStatus.SKIPPED }
                }
                return@launch
            }
            val pending = dbQuery {
                CarPhotos.selectAll().where { CarPhotos.cutoutStatus eq CutoutStatus.PENDING }.map { it[CarPhotos.id].value }
            }
            if (pending.isNotEmpty()) log.info("Re-queueing {} photos for background removal", pending.size)
            pending.forEach(::enqueue)
            for (id in queue) process(id)
        }
    }

    private suspend fun process(photoId: Long) {
        val fileName = dbQuery {
            CarPhotos.selectAll().where { CarPhotos.id eq photoId }.singleOrNull()
                ?.takeIf { it[CarPhotos.cutoutStatus] == CutoutStatus.PENDING }
                ?.get(CarPhotos.fileName)
        } ?: return // deleted or already processed

        val started = System.currentTimeMillis()
        val result = runCatching {
            val original = withContext(Dispatchers.IO) { Files.readAllBytes(dir.resolve(fileName)) }
            val png = withRetry { removeBackground(original) }
            val cleaned = withContext(Dispatchers.Default) { CutoutCleaner.clean(png) }
            val cutoutName = "${UUID.randomUUID()}-cut.png"
            withContext(Dispatchers.IO) { Files.write(dir.resolve(cutoutName), cleaned) }
            cutoutName
        }

        val stillExists = dbQuery {
            CarPhotos.update({ CarPhotos.id eq photoId }) {
                it[cutoutFile] = result.getOrNull()
                it[cutoutStatus] = if (result.isSuccess) CutoutStatus.DONE else CutoutStatus.FAILED
            } > 0
        }
        result
            .onSuccess { log.info("Cutout for photo {} done in {} ms", photoId, System.currentTimeMillis() - started) }
            .onFailure { log.warn("Cutout for photo {} failed", photoId, it) }
        // Photo deleted while processing: don't leave the cutout behind.
        if (!stillExists) result.getOrNull()?.let { withContext(Dispatchers.IO) { Files.deleteIfExists(dir.resolve(it)) } }
    }

    /** The service may still be loading its model (e.g. right after a deploy); wait for it instead of failing. */
    private suspend fun <T> withRetry(block: suspend () -> T): T {
        var delayMs = 2_000L
        repeat(8) {
            try {
                return block()
            } catch (e: java.io.IOException) {
                log.info("Cutout service unavailable ({}), retrying in {} ms", e.javaClass.simpleName, delayMs)
                kotlinx.coroutines.delay(delayMs)
                delayMs = (delayMs * 2).coerceAtMost(30_000)
            }
        }
        return block()
    }

    private suspend fun removeBackground(image: ByteArray): ByteArray {
        val response = client.submitFormWithBinaryData(
            url = "${config.cutoutUrl}/api/remove",
            formData = formData {
                append("model", config.cutoutModel)
                append("ppm", "true") // post-process mask: smoother edges
                append("file", image, Headers.build {
                    append(HttpHeaders.ContentType, "image/jpeg")
                    append(HttpHeaders.ContentDisposition, "filename=\"photo.jpg\"")
                })
            },
        )
        check(response.status.isSuccess()) { "rembg responded ${response.status}" }
        return response.bodyAsBytes()
    }
}
