package app.petrolheads.db

import kotlinx.serialization.json.Json
import org.jetbrains.exposed.v1.core.ReferenceOption
import org.jetbrains.exposed.v1.core.Table
import org.jetbrains.exposed.v1.core.dao.id.LongIdTable
import org.jetbrains.exposed.v1.javatime.date
import org.jetbrains.exposed.v1.javatime.timestampWithTimeZone
import org.jetbrains.exposed.v1.json.jsonb

// Schema is owned by Flyway (resources/db/migration); these objects only map it.

object Users : LongIdTable("users") {
    val telegramId = long("telegram_id").uniqueIndex()
    val username = varchar("username", 64).nullable()
    val firstName = varchar("first_name", 128)
    val photoUrl = text("photo_url").nullable()
    val nickname = varchar("nickname", 32).nullable()
    val crew = varchar("crew", 32).nullable()
    val bio = varchar("bio", 280).nullable()
    val rep = integer("rep").default(0)
    val createdAt = timestampWithTimeZone("created_at")
}

object Cars : LongIdTable("cars") {
    val userId = reference("user_id", Users, onDelete = ReferenceOption.CASCADE)
    val make = varchar("make", 64)
    val model = varchar("model", 64)
    val year = integer("year").nullable()
    val color = varchar("color", 32).nullable()
    val hp = integer("hp").nullable()
    val torqueNm = integer("torque_nm").nullable()
    val weightKg = integer("weight_kg").nullable()
    val drivetrain = varchar("drivetrain", 8).nullable()
    val mods = jsonb<List<String>>("mods", Json)
    val isMain = bool("is_main").default(false)
    val photoUrl = text("photo_url").nullable()
    val garageImageUrl = text("garage_image_url").nullable()
    /** Set when the driver no longer owns the car; it then shows under "former cars". */
    val soldAt = date("sold_at").nullable()
}

object CarPhotos : LongIdTable("car_photos") {
    val carId = reference("car_id", Cars, onDelete = ReferenceOption.CASCADE)
    val fileName = varchar("file_name", 64)
    val width = integer("width")
    val height = integer("height")
    val uploadSource = varchar("source", 8)
    val cutoutFile = varchar("cutout_file", 64).nullable()
    val cutoutStatus = varchar("cutout_status", 8).default(CutoutStatus.PENDING)
}

object CutoutStatus {
    const val PENDING = "pending"
    const val DONE = "done"
    const val FAILED = "failed"
    const val SKIPPED = "skipped"
}

object CarLikes : Table("car_likes") {
    val carId = reference("car_id", Cars, onDelete = ReferenceOption.CASCADE)
    val userId = reference("user_id", Users, onDelete = ReferenceOption.CASCADE)
    override val primaryKey = PrimaryKey(carId, userId)
}

object Admins : LongIdTable("admins") {
    val username = varchar("username", 64).nullable()
    val telegramId = long("telegram_id").nullable()
    val addedBy = reference("added_by", Users, onDelete = ReferenceOption.SET_NULL).nullable()
}

object Tracks : LongIdTable("tracks") {
    val name = varchar("name", 128)
    val layout = varchar("layout", 64).nullable()
    val country = varchar("country", 64).nullable()
    val lengthM = integer("length_m").nullable()
    val nameRu = varchar("name_ru", 128).nullable()
    val layoutRu = varchar("layout_ru", 64).nullable()
    val countryRu = varchar("country_ru", 64).nullable()
    val position = integer("position").default(100)
}

object LapTimes : LongIdTable("lap_times") {
    val userId = reference("user_id", Users, onDelete = ReferenceOption.CASCADE)
    val carId = reference("car_id", Cars, onDelete = ReferenceOption.CASCADE)
    val trackId = reference("track_id", Tracks, onDelete = ReferenceOption.CASCADE)
    val timeMs = integer("time_ms")
    val lapDate = date("lap_date")
    val conditions = varchar("conditions", 16).nullable()
    val tyres = varchar("tyres", 64).nullable()
    val proofUrl = text("proof_url").nullable()
    val status = varchar("status", 16).default(LapStatus.PENDING)
    val verifiedBy = reference("verified_by", Users, onDelete = ReferenceOption.SET_NULL).nullable()
}

object LapStatus {
    const val PENDING = "pending"
    const val VERIFIED = "verified"
    const val REJECTED = "rejected"
    val all = setOf(PENDING, VERIFIED, REJECTED)
}
