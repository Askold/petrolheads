package app.petrolheads

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

/** Stock specs for autofilling the car form. Approximate factory figures; users can edit everything. */
@Serializable
data class CatalogCar(
    val make: String,
    val model: String,
    val from: Int,
    val to: Int? = null,
    val hp: Int,
    val torqueNm: Int,
    val weightKg: Int,
    val drivetrain: String,
)

/** Search over the bundled resources/car_catalog.json. Matches English and Russian names and nicknames. */
object CarCatalog {
    @Serializable
    private data class Entry(
        val make: String, val model: String, val from: Int, val to: Int? = null,
        val hp: Int, val torqueNm: Int, val weightKg: Int, val drivetrain: String, val aliases: String = "",
    )

    private class Indexed(val car: CatalogCar, val haystack: String, val modelKey: String)

    private val entries: List<Indexed> by lazy {
        val text = CarCatalog::class.java.getResource("/car_catalog.json")!!.readText()
        Json.decodeFromString<List<Entry>>(text).map { e ->
            val car = CatalogCar(e.make, e.model, e.from, e.to, e.hp, e.torqueNm, e.weightKg, e.drivetrain)
            val raw = "${e.make} ${e.model} ${e.aliases}"
            Indexed(car, normalize(raw) + " " + normalize(raw).replace(" ", ""), normalize(e.model))
        }
    }

    val size get() = entries.size

    /** The whole catalog (a few hundred rows), for the make → model pickers. */
    fun all(): List<CatalogCar> = entries.map { it.car }

    /** "ё" -> "е", lowercase, punctuation (R-34, MX-5, GT-R) folded so "gtr r34" matches "GT-R R34". */
    internal fun normalize(s: String) =
        s.lowercase().replace('ё', 'е').replace(Regex("[^\\p{L}\\p{N} ]"), "").replace(Regex("\\s+"), " ").trim()

    fun search(query: String, limit: Int = 10): List<CatalogCar> {
        val tokens = normalize(query).split(' ').filter { it.isNotEmpty() }
        if (tokens.isEmpty()) return emptyList()
        return entries
            .filter { e -> tokens.all { it in e.haystack } }
            // Model-name hits first, then newest
            .sortedWith(compareByDescending<Indexed> { e -> tokens.count { it in e.modelKey } }.thenByDescending { it.car.from })
            .take(limit)
            .map { it.car }
    }
}
