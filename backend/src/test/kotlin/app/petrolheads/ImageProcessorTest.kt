package app.petrolheads

import app.petrolheads.photos.ImageProcessor
import app.petrolheads.photos.InvalidImageException
import java.awt.image.BufferedImage
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import javax.imageio.ImageIO
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

class ImageProcessorTest {
    private fun png(w: Int, h: Int, type: Int = BufferedImage.TYPE_INT_RGB): ByteArray {
        val out = ByteArrayOutputStream()
        ImageIO.write(BufferedImage(w, h, type), "png", out)
        return out.toByteArray()
    }

    @Test
    fun `converts to jpeg and keeps small images at original size`() {
        val result = ImageProcessor.process(png(640, 480, BufferedImage.TYPE_INT_ARGB))
        assertEquals(640 to 480, result.width to result.height)
        val decoded = ImageIO.read(ByteArrayInputStream(result.jpeg))
        assertEquals(640, decoded.width)
        // JPEG SOI marker
        assertTrue(result.jpeg[0] == 0xFF.toByte() && result.jpeg[1] == 0xD8.toByte())
    }

    @Test
    fun `downscales the long side to 2048`() {
        val result = ImageProcessor.process(png(4096, 1024))
        assertEquals(2048 to 512, result.width to result.height)
    }

    @Test
    fun `rejects non-images`() {
        assertFailsWith<InvalidImageException> { ImageProcessor.process("not an image".toByteArray()) }
    }

    /**
     * 3x2 image with a marked top-left pixel. For each EXIF orientation, the marker must land where
     * a correctly displayed image would put it.
     */
    @Test
    fun `applies every exif orientation`() {
        val src = BufferedImage(3, 2, BufferedImage.TYPE_INT_RGB).apply { setRGB(0, 0, 0xFF0000) }
        // orientation -> expected (width, height, marker x, marker y)
        val expected = mapOf(
            1 to listOf(3, 2, 0, 0),
            2 to listOf(3, 2, 2, 0), // mirrored horizontally
            3 to listOf(3, 2, 2, 1), // rotated 180
            4 to listOf(3, 2, 0, 1), // mirrored vertically
            5 to listOf(2, 3, 0, 0), // transposed
            6 to listOf(2, 3, 1, 0), // rotated 90 CW
            7 to listOf(2, 3, 1, 2), // transversed
            8 to listOf(2, 3, 0, 2), // rotated 90 CCW
        )
        for ((orientation, exp) in expected) {
            val out = ImageProcessor.applyOrientation(src, orientation)
            assertEquals(exp[0] to exp[1], out.width to out.height, "size for orientation $orientation")
            assertEquals(0xFF0000, out.getRGB(exp[2], exp[3]) and 0xFFFFFF, "marker for orientation $orientation")
        }
    }
}
