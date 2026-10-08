package app.petrolheads

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class CarCatalogTest {
    private fun first(q: String) = CarCatalog.search(q).firstOrNull()?.let { "${it.make} ${it.model}" }

    @Test
    fun `catalog loads`() = assertTrue(CarCatalog.size > 250)

    @Test
    fun `matches regardless of punctuation and case`() {
        assertEquals("Nissan Skyline GT-R R34", first("gtr r34"))
        assertEquals("Mazda MX-5 NA", first("mx5 na"))
    }

    @Test
    fun `matches russian names and nicknames`() {
        assertEquals("Lada 2107", first("семерка"))
        assertEquals("Lada 2107", first("семёрка"))
        assertEquals("Lada 2101", first("копейка"))
        assertEquals("Toyota Supra A80", first("супра 2jz"))
        assertEquals("Mercedes-Benz S500 W140", first("кабан"))
        assertEquals("Mercedes-AMG G 63 W463", first("гелик"))
        assertEquals("Lada 2110", first("десятка"))
        assertEquals("Hyundai Solaris II 1.6", first("солярис"))
        assertEquals("Nissan Laurel Club S C35", first("лаурель c35"))
    }

    @Test
    fun `twins find the same car`() {
        assertTrue(first("mazda roadster")!!.startsWith("Mazda MX-5"))
        assertTrue(first("eunos")!!.startsWith("Mazda MX-5"))
        assertEquals("Toyota GT86", first("scion fr-s"))
        assertEquals("Chevrolet Lacetti 1.6", first("gentra"))
        assertEquals("Lada Niva 4x4", first("ваз 2121"))
    }

    @Test
    fun `no duplicate entries`() {
        val all = CarCatalog.search("a", limit = 1000) + CarCatalog.search("а", limit = 1000)
        val keys = all.map { it.make + " " + it.model }.distinct()
        assertEquals(keys.size, keys.toSet().size)
    }

    @Test
    fun `empty query returns nothing`() = assertTrue(CarCatalog.search("  ").isEmpty())
}
