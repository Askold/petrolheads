package app.petrolheads.photos

import java.awt.RenderingHints
import java.awt.image.BufferedImage
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import javax.imageio.ImageIO

/**
 * Tidies a background-removed PNG so the car can sit on the turntable:
 * - keeps only the main subject (largest opaque region plus anything centred over/near it),
 *   which drops fragments of neighbouring cars or people the model let through
 * - crops to the subject and caps the width
 */
object CutoutCleaner {
    private const val SOLID = 128 // alpha treated as "part of an object" when finding regions
    private const val HALO = 3 // px of soft edge kept around kept regions
    private const val MAX_WIDTH = 1400

    fun clean(png: ByteArray): ByteArray {
        val src = ImageIO.read(ByteArrayInputStream(png)) ?: error("rembg returned an unreadable image")
        val img = toArgb(src)
        keepMainSubject(img)
        val cropped = cropToContent(img) ?: error("No subject found in photo")
        val out = ByteArrayOutputStream()
        ImageIO.write(downscale(cropped), "png", out)
        return out.toByteArray()
    }

    private fun toArgb(src: BufferedImage): BufferedImage {
        if (src.type == BufferedImage.TYPE_INT_ARGB) return src
        return BufferedImage(src.width, src.height, BufferedImage.TYPE_INT_ARGB).also {
            it.createGraphics().apply { drawImage(src, 0, 0, null); dispose() }
        }
    }

    private class Region(var size: Int = 0, var minX: Int = Int.MAX_VALUE, var minY: Int = Int.MAX_VALUE, var maxX: Int = -1, var maxY: Int = -1) {
        fun add(x: Int, y: Int) {
            size++
            if (x < minX) minX = x
            if (y < minY) minY = y
            if (x > maxX) maxX = x
            if (y > maxY) maxY = y
        }
        val cx get() = (minX + maxX) / 2
        val cy get() = (minY + maxY) / 2
    }

    internal fun keepMainSubject(img: BufferedImage) {
        val w = img.width
        val h = img.height
        val argb = img.getRGB(0, 0, w, h, null, 0, w)
        val labels = IntArray(w * h) // 0 = background, n = region n
        val regions = mutableListOf(Region()) // index 0 unused
        val stack = IntArray(w * h)

        for (start in argb.indices) {
            if (labels[start] != 0 || (argb[start] ushr 24) < SOLID) continue
            val label = regions.size
            val region = Region().also { regions += it }
            var top = 0
            stack[top++] = start
            labels[start] = label
            while (top > 0) {
                val i = stack[--top]
                val x = i % w
                val y = i / w
                region.add(x, y)
                fun visit(j: Int) {
                    if (labels[j] == 0 && (argb[j] ushr 24) >= SOLID) {
                        labels[j] = label
                        stack[top++] = j
                    }
                }
                if (x > 0) visit(i - 1)
                if (x < w - 1) visit(i + 1)
                if (y > 0) visit(i - w)
                if (y < h - 1) visit(i + w)
            }
        }
        if (regions.size <= 1) return

        val main = regions.drop(1).maxBy { it.size }
        // Detached parts (spoilers, antennas) sit over the car horizontally and close to it vertically.
        val slack = (main.maxY - main.minY) / 4
        val keep = BooleanArray(regions.size) { idx ->
            idx > 0 && regions[idx].let { r ->
                r === main || (r.size >= main.size / 100 &&
                    r.cx in main.minX..main.maxX && r.cy in (main.minY - slack)..(main.maxY + slack))
            }
        }

        // Soft edges (alpha < SOLID) have no label; keep them only near kept regions.
        val near = BooleanArray(w * h)
        for (i in labels.indices) if (keep[labels[i]]) near[i] = true
        dilate(near, w, h, HALO)

        for (i in argb.indices) if (!near[i]) argb[i] = 0
        img.setRGB(0, 0, w, h, argb, 0, w)
    }

    /** Square dilation done as two 1-D passes. */
    private fun dilate(mask: BooleanArray, w: Int, h: Int, r: Int) {
        val tmp = BooleanArray(mask.size)
        for (y in 0 until h) for (x in 0 until w) {
            var v = false
            for (dx in -r..r) { val xx = x + dx; if (xx in 0 until w && mask[y * w + xx]) { v = true; break } }
            tmp[y * w + x] = v
        }
        for (y in 0 until h) for (x in 0 until w) {
            var v = false
            for (dy in -r..r) { val yy = y + dy; if (yy in 0 until h && tmp[yy * w + x]) { v = true; break } }
            mask[y * w + x] = v
        }
    }

    internal fun cropToContent(img: BufferedImage): BufferedImage? {
        var minX = img.width; var minY = img.height; var maxX = -1; var maxY = -1
        for (y in 0 until img.height) for (x in 0 until img.width) {
            if ((img.getRGB(x, y) ushr 24) > 16) {
                if (x < minX) minX = x
                if (x > maxX) maxX = x
                if (y < minY) minY = y
                if (y > maxY) maxY = y
            }
        }
        if (maxX < 0) return null
        return img.getSubimage(minX, minY, maxX - minX + 1, maxY - minY + 1)
    }

    private fun downscale(src: BufferedImage): BufferedImage {
        if (src.width <= MAX_WIDTH) return src
        val w = MAX_WIDTH
        val h = (src.height * MAX_WIDTH.toDouble() / src.width).toInt().coerceAtLeast(1)
        return BufferedImage(w, h, BufferedImage.TYPE_INT_ARGB).also {
            it.createGraphics().apply {
                setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC)
                drawImage(src, 0, 0, w, h, null)
                dispose()
            }
        }
    }
}
