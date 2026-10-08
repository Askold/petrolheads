package app.petrolheads.photos

import com.drew.imaging.ImageMetadataReader
import com.drew.metadata.exif.ExifIFD0Directory
import java.awt.RenderingHints
import java.awt.geom.AffineTransform
import java.awt.image.BufferedImage
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import javax.imageio.IIOImage
import javax.imageio.ImageIO
import javax.imageio.ImageWriteParam

class InvalidImageException(message: String) : RuntimeException(message)

class ProcessedImage(val jpeg: ByteArray, val width: Int, val height: Int)

/**
 * Normalises an uploaded photo: applies EXIF orientation, downsizes and re-encodes as JPEG.
 * Re-encoding drops all metadata, including GPS coordinates people don't mean to share.
 */
object ImageProcessor {
    private const val MAX_SIDE = 2048
    private const val MAX_PIXELS = 60_000_000L // refuse decompression bombs before decoding

    fun process(bytes: ByteArray): ProcessedImage {
        checkDimensions(bytes)
        val decoded = runCatching { ImageIO.read(ByteArrayInputStream(bytes)) }.getOrNull()
            ?: throw InvalidImageException("Unsupported image. Use JPEG, PNG or WebP.")

        val oriented = applyOrientation(decoded, readOrientation(bytes))
        val resized = downscale(oriented)
        return ProcessedImage(encodeJpeg(resized), resized.width, resized.height)
    }

    private fun checkDimensions(bytes: ByteArray) {
        ImageIO.createImageInputStream(ByteArrayInputStream(bytes)).use { input ->
            val reader = ImageIO.getImageReaders(input).asSequence().firstOrNull()
                ?: throw InvalidImageException("Unsupported image. Use JPEG, PNG or WebP.")
            try {
                reader.input = input
                if (reader.getWidth(0).toLong() * reader.getHeight(0) > MAX_PIXELS) {
                    throw InvalidImageException("Image resolution is too large")
                }
            } finally {
                reader.dispose()
            }
        }
    }

    private fun readOrientation(bytes: ByteArray): Int = runCatching {
        ImageMetadataReader.readMetadata(ByteArrayInputStream(bytes))
            .getFirstDirectoryOfType(ExifIFD0Directory::class.java)
            ?.getInt(ExifIFD0Directory.TAG_ORIENTATION)
    }.getOrNull() ?: 1

    /** EXIF orientations 1-8; see https://exiftool.org/TagNames/EXIF.html (Orientation). */
    internal fun applyOrientation(src: BufferedImage, orientation: Int): BufferedImage {
        if (orientation !in 2..8) return src
        val w = src.width.toDouble()
        val h = src.height.toDouble()
        val swap = orientation >= 5
        val t = AffineTransform()
        when (orientation) {
            2 -> { t.translate(w, 0.0); t.scale(-1.0, 1.0) }
            3 -> { t.translate(w, h); t.rotate(Math.PI) }
            4 -> { t.translate(0.0, h); t.scale(1.0, -1.0) }
            5 -> { t.rotate(-Math.PI / 2); t.scale(-1.0, 1.0) }
            6 -> { t.translate(h, 0.0); t.rotate(Math.PI / 2) }
            7 -> { t.scale(-1.0, 1.0); t.translate(-h, 0.0); t.translate(0.0, w); t.rotate(3 * Math.PI / 2) }
            8 -> { t.translate(0.0, w); t.rotate(3 * Math.PI / 2) }
        }
        val out = BufferedImage(if (swap) src.height else src.width, if (swap) src.width else src.height, BufferedImage.TYPE_INT_RGB)
        out.createGraphics().apply {
            setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR)
            drawImage(src, t, null)
            dispose()
        }
        return out
    }

    private fun downscale(src: BufferedImage): BufferedImage {
        val scale = minOf(1.0, MAX_SIDE.toDouble() / maxOf(src.width, src.height))
        val w = (src.width * scale).toInt().coerceAtLeast(1)
        val h = (src.height * scale).toInt().coerceAtLeast(1)
        // Always redraw into an RGB buffer: drops alpha (JPEG can't store it) and normalises colour models.
        val out = BufferedImage(w, h, BufferedImage.TYPE_INT_RGB)
        out.createGraphics().apply {
            setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC)
            setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY)
            color = java.awt.Color.BLACK
            fillRect(0, 0, w, h)
            drawImage(src, 0, 0, w, h, null)
            dispose()
        }
        return out
    }

    private fun encodeJpeg(img: BufferedImage): ByteArray {
        val writer = ImageIO.getImageWritersByFormatName("jpeg").next()
        val out = ByteArrayOutputStream()
        ImageIO.createImageOutputStream(out).use { ios ->
            writer.output = ios
            val params = writer.defaultWriteParam.apply {
                compressionMode = ImageWriteParam.MODE_EXPLICIT
                compressionQuality = 0.88f
            }
            writer.write(null, IIOImage(img, null, null), params)
            writer.dispose()
        }
        return out.toByteArray()
    }
}
