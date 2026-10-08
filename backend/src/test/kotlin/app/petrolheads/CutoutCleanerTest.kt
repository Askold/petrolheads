package app.petrolheads

import app.petrolheads.photos.CutoutCleaner
import java.awt.Color
import java.awt.image.BufferedImage
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import javax.imageio.ImageIO
import kotlin.test.Test
import kotlin.test.assertEquals

class CutoutCleanerTest {
    private fun png(draw: (java.awt.Graphics2D) -> Unit): ByteArray {
        val img = BufferedImage(400, 200, BufferedImage.TYPE_INT_ARGB)
        img.createGraphics().apply { draw(this); dispose() }
        return ByteArrayOutputStream().also { ImageIO.write(img, "png", it) }.toByteArray()
    }

    private fun decode(bytes: ByteArray) = ImageIO.read(ByteArrayInputStream(bytes))

    @Test
    fun `drops a stray fragment beside the car and crops to the car`() {
        val result = decode(CutoutCleaner.clean(png { g ->
            g.color = Color.BLUE
            g.fillRect(100, 50, 250, 120) // the car
            g.color = Color.WHITE
            g.fillRect(10, 80, 30, 60) // wheel of the car parked next to it
        }))
        assertEquals(250 to 120, result.width to result.height)
    }

    @Test
    fun `keeps detached parts that sit within the car outline`() {
        val result = decode(CutoutCleaner.clean(png { g ->
            g.color = Color.BLUE
            g.fillRect(100, 60, 250, 110) // body
            g.fillRect(120, 40, 200, 6) // spoiler, separated by a transparent gap
        }))
        assertEquals(250 to 130, result.width to result.height)
    }
}
