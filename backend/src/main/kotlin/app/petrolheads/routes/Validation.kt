package app.petrolheads.routes

import io.ktor.server.plugins.BadRequestException
import io.ktor.server.plugins.NotFoundException

class ForbiddenException(message: String) : RuntimeException(message)

fun badRequest(message: String): Nothing = throw BadRequestException(message)
fun notFound(message: String = "Not found"): Nothing = throw NotFoundException(message)
fun forbidden(message: String = "Forbidden"): Nothing = throw ForbiddenException(message)

/** Trims, turns blank into null and enforces a max length. */
fun String?.clean(field: String, maxLength: Int): String? {
    val v = this?.trim()?.takeIf { it.isNotEmpty() } ?: return null
    if (v.length > maxLength) badRequest("$field must be at most $maxLength characters")
    return v
}

fun Int?.inRange(field: String, range: IntRange): Int? {
    if (this != null && this !in range) badRequest("$field must be between ${range.first} and ${range.last}")
    return this
}

fun String?.httpUrl(field: String): String? {
    val v = clean(field, 2048) ?: return null
    if (!v.startsWith("https://") && !v.startsWith("http://")) badRequest("$field must be an http(s) URL")
    return v
}

/** An external http(s) link or a file uploaded to this server (/media/...). */
fun String?.proofUrl(field: String): String? {
    val v = clean(field, 2048) ?: return null
    if (Regex("^/media/[A-Za-z0-9-]+\\.jpg$").matches(v)) return v
    return v.httpUrl(field)
}
