package app.petrolheads.db

import app.petrolheads.CarDto
import app.petrolheads.CarRequest
import app.petrolheads.DriverDto
import app.petrolheads.FeedCarDto
import app.petrolheads.LikeDto
import app.petrolheads.routes.badRequest
import app.petrolheads.routes.notFound
import app.petrolheads.LapDto
import app.petrolheads.LapRequest
import app.petrolheads.PhotoDto
import app.petrolheads.photos.PhotoService
import app.petrolheads.TrackDto
import app.petrolheads.TrackRequest
import app.petrolheads.UpdateProfileRequest
import app.petrolheads.UserDto
import app.petrolheads.auth.TelegramUser
import org.jetbrains.exposed.v1.core.ResultRow
import org.jetbrains.exposed.v1.core.SortOrder
import org.jetbrains.exposed.v1.core.and
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.core.inList
import org.jetbrains.exposed.v1.core.isNull
import org.jetbrains.exposed.v1.core.neq
import org.jetbrains.exposed.v1.core.plus
import org.jetbrains.exposed.v1.jdbc.deleteWhere
import org.jetbrains.exposed.v1.jdbc.insertAndGetId
import org.jetbrains.exposed.v1.jdbc.insertIgnore
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.jetbrains.exposed.v1.jdbc.update
import java.time.LocalDate

object UserRepository {
    suspend fun upsertFromTelegram(tg: TelegramUser): Long = dbQuery {
        val existing = Users.selectAll().where { Users.telegramId eq tg.id }.singleOrNull()
        if (existing == null) {
            Users.insertAndGetId {
                it[telegramId] = tg.id
                it[username] = tg.username
                it[firstName] = tg.firstName
                it[photoUrl] = tg.photoUrl
            }.value
        } else {
            val id = existing[Users.id].value
            if (existing[Users.username] != tg.username ||
                existing[Users.firstName] != tg.firstName ||
                existing[Users.photoUrl] != tg.photoUrl
            ) {
                Users.update({ Users.id eq id }) {
                    it[username] = tg.username
                    it[firstName] = tg.firstName
                    it[photoUrl] = tg.photoUrl
                }
            }
            id
        }
    }

    suspend fun find(id: Long): UserDto? = dbQuery {
        Users.selectAll().where { Users.id eq id }.singleOrNull()?.toUserDto()
    }

    suspend fun updateProfile(id: Long, req: UpdateProfileRequest) = dbQuery {
        Users.update({ Users.id eq id }) {
            it[nickname] = req.nickname
            it[crew] = req.crew
            it[bio] = req.bio
        }
    }

    /** Everyone in the club with their main car (incl. photos, for the cutout), highest rep first. */
    suspend fun directory(viewerId: Long): List<DriverDto> = dbQuery {
        val users = Users.selectAll().orderBy(Users.rep to SortOrder.DESC, Users.id to SortOrder.ASC).map { it.toUserDto() }
        val cars = Cars.selectAll().where { Cars.soldAt.isNull() }
            .orderBy(Cars.isMain to SortOrder.DESC, Cars.id to SortOrder.ASC)
            .map { it.toCarDto() }
        val mainCars = cars.groupBy { it.userId }.mapValues { it.value.first() }
        val photos = CarPhotos.selectAll().where { CarPhotos.carId inList mainCars.values.map { it.id } }
            .orderBy(CarPhotos.id)
            .groupBy({ it[CarPhotos.carId].value }, { it.toPhotoDto() })
        val carCounts = cars.groupingBy { it.userId }.eachCount()
        val likedCars = CarScores.decorate(cars, viewerId)
        val likesByUser = likedCars.groupBy { it.userId }.mapValues { (_, cs) -> cs.sumOf { it.likes } }
        val likedById = likedCars.associateBy { it.id }
        // Only people who've added at least one car (current or former) are listed.
        val owners = Cars.selectAll().map { it[Cars.userId].value }.toSet()
        val bests = TierRepository.homeBests()
        users.filter { it.id in owners }.map { u ->
            val main = mainCars[u.id]?.let { likedById.getValue(it.id).copy(photos = photos[it.id].orEmpty()) }
            DriverDto(u, main, carCounts[u.id] ?: 0, likesByUser[u.id] ?: 0, app.petrolheads.Tier.forLap(bests[u.id]).key)
        }
    }

    fun findMany(ids: Collection<Long>): Map<Long, UserDto> =
        Users.selectAll().where { Users.id inList ids }.associate { it[Users.id].value to it.toUserDto() }
}

object CarRepository {
    /** A user's cars with their photos, main car first. */
    suspend fun forUser(userId: Long): List<CarDto> = dbQuery {
        val cars = Cars.selectAll().where { Cars.userId eq userId }
            .orderBy(Cars.isMain to SortOrder.DESC, Cars.id to SortOrder.ASC)
            .map { it.toCarDto() }
        val photos = CarPhotos.selectAll().where { CarPhotos.carId inList cars.map { it.id } }
            .orderBy(CarPhotos.id)
            .groupBy({ it[CarPhotos.carId].value }, { it.toPhotoDto() })
        cars.map { it.copy(photos = photos[it.id].orEmpty()) }
    }

    /** Cars owned by the user with the given Telegram id (used by the bot). */
    suspend fun forTelegramUser(telegramId: Long): Pair<Long, List<CarDto>>? = dbQuery {
        val user = Users.selectAll().where { Users.telegramId eq telegramId }.singleOrNull() ?: return@dbQuery null
        val userId = user[Users.id].value
        userId to Cars.selectAll().where { (Cars.userId eq userId) and Cars.soldAt.isNull() }
            .orderBy(Cars.isMain to SortOrder.DESC, Cars.id to SortOrder.ASC)
            .map { it.toCarDto() }
    }

    suspend fun find(id: Long): CarDto? = dbQuery {
        Cars.selectAll().where { Cars.id eq id }.singleOrNull()?.toCarDto()
    }

    suspend fun create(userId: Long, req: CarRequest): CarDto = dbQuery {
        val noCurrentCars = Cars.selectAll().where { (Cars.userId eq userId) and Cars.soldAt.isNull() }.empty()
        // A former car can never be the main ride.
        val main = !req.sold && (req.isMain || noCurrentCars)
        if (main) clearMain(userId)
        val id = Cars.insertAndGetId {
            it[Cars.userId] = userId
            it.fill(req)
            it[isMain] = main
            it[soldAt] = if (req.sold) soldDate(req, existing = null) else null
        }.value
        Cars.selectAll().where { Cars.id eq id }.single().toCarDto()
    }

    suspend fun update(userId: Long, carId: Long, req: CarRequest): CarDto? = dbQuery {
        val existing = Cars.selectAll().where { (Cars.id eq carId) and (Cars.userId eq userId) }.singleOrNull()
            ?: return@dbQuery null
        val main = req.isMain && !req.sold
        if (main) clearMain(userId, except = carId)
        Cars.update({ Cars.id eq carId }) {
            it.fill(req)
            it[isMain] = main
            it[soldAt] = if (req.sold) soldDate(req, existing[Cars.soldAt]) else null
        }
        if (existing[Cars.isMain] && !main) promoteMain(userId)
        Cars.selectAll().where { Cars.id eq carId }.single().toCarDto()
    }

    /** Only the year is shown, so a manually entered year is stored as 1 January of it. */
    private fun soldDate(req: CarRequest, existing: LocalDate?): LocalDate = when {
        req.soldYear == null -> existing ?: LocalDate.now()
        existing?.year == req.soldYear -> existing
        else -> LocalDate.of(req.soldYear, 1, 1)
    }

    /** After the main car is sold or demoted, the oldest remaining current car takes its place. */
    private fun promoteMain(userId: Long) {
        val hasMain = !Cars.selectAll().where { (Cars.userId eq userId) and (Cars.isMain eq true) }.empty()
        if (hasMain) return
        val next = Cars.selectAll().where { (Cars.userId eq userId) and Cars.soldAt.isNull() }
            .orderBy(Cars.id).firstOrNull() ?: return
        Cars.update({ Cars.id eq next[Cars.id] }) { it[isMain] = true }
    }

    suspend fun delete(userId: Long, carId: Long): Boolean = dbQuery {
        val deleted = Cars.deleteWhere { (Cars.id eq carId) and (Cars.userId eq userId) } > 0
        if (deleted) promoteMain(userId)
        deleted
    }.also { deleted -> if (deleted) Reputation.recomputeAll() }

    fun findMany(ids: Collection<Long>): Map<Long, CarDto> =
        Cars.selectAll().where { Cars.id inList ids }.associate { it[Cars.id].value to it.toCarDto() }

    private fun clearMain(userId: Long, except: Long? = null) {
        Cars.update({
            if (except == null) Cars.userId eq userId else (Cars.userId eq userId) and (Cars.id neq except)
        }) { it[isMain] = false }
    }

    private fun org.jetbrains.exposed.v1.core.statements.UpdateBuilder<*>.fill(req: CarRequest) {
        this[Cars.make] = req.make
        this[Cars.model] = req.model
        this[Cars.year] = req.year
        this[Cars.color] = req.color
        this[Cars.hp] = req.hp
        this[Cars.torqueNm] = req.torqueNm
        this[Cars.weightKg] = req.weightKg
        this[Cars.drivetrain] = req.drivetrain
        this[Cars.mods] = req.mods
    }
}

object TierRepository {
    /** Best verified lap per user on the home track (see [app.petrolheads.Tier.HOME_TRACK]). */
    fun homeBests(): Map<Long, Int> {
        val home = Tracks.selectAll().where { Tracks.name eq app.petrolheads.Tier.HOME_TRACK }.map { it[Tracks.id].value }
        if (home.isEmpty()) return emptyMap()
        return LapTimes.selectAll()
            .where { (LapTimes.trackId inList home) and (LapTimes.status eq LapStatus.VERIFIED) }
            .groupBy({ it[LapTimes.userId].value }, { it[LapTimes.timeMs] })
            .mapValues { (_, times) -> times.min() }
    }
}

object LikeRepository {
    suspend fun setLike(carId: Long, userId: Long, liked: Boolean): LikeDto = dbQuery {
        val car = Cars.selectAll().where { Cars.id eq carId }.singleOrNull() ?: notFound("Car not found")
        if (car[Cars.userId].value == userId) badRequest("You can't like your own car")
        if (liked) {
            CarLikes.insertIgnore {
                it[CarLikes.carId] = carId
                it[CarLikes.userId] = userId
            }
        } else {
            CarLikes.deleteWhere { (CarLikes.carId eq carId) and (CarLikes.userId eq userId) }
        }
        val n = CarLikes.selectAll().where { CarLikes.carId eq carId }.count().toInt()
        LikeDto(n, liked)
    }.also { Reputation.recomputeAll() }

    /** Every car still in a garage, with owner, photos and likes, for the club-wide grid. */
    suspend fun feed(viewerId: Long): List<FeedCarDto> = dbQuery {
        val cars = Cars.selectAll().where { Cars.soldAt.isNull() }.orderBy(Cars.id, SortOrder.DESC).map { it.toCarDto() }
        val photos = CarPhotos.selectAll().where { CarPhotos.carId inList cars.map { it.id } }
            .orderBy(CarPhotos.id)
            .groupBy({ it[CarPhotos.carId].value }, { it.toPhotoDto() })
        val owners = UserRepository.findMany(cars.map { it.userId }.toSet())
        CarScores.decorate(cars, viewerId).mapNotNull { c ->
            FeedCarDto(c.copy(photos = photos[c.id].orEmpty()), owners[c.userId] ?: return@mapNotNull null)
        }
    }
}

object TrackRepository {
    /** [onlyWithResults]: just the tracks that have at least one verified lap (what the leaderboard shows). */
    suspend fun all(onlyWithResults: Boolean = false): List<TrackDto> = dbQuery {
        val withResults = if (onlyWithResults) {
            LapTimes.selectAll().where { LapTimes.status eq LapStatus.VERIFIED }.map { it[LapTimes.trackId].value }.toSet()
        } else {
            null
        }
        Tracks.selectAll()
            .orderBy(Tracks.position to SortOrder.ASC, Tracks.name to SortOrder.ASC, Tracks.lengthM to SortOrder.DESC_NULLS_LAST)
            .map { it.toTrackDto() }
            .filter { withResults == null || it.id in withResults }
    }

    suspend fun find(id: Long): TrackDto? = dbQuery {
        Tracks.selectAll().where { Tracks.id eq id }.singleOrNull()?.toTrackDto()
    }

    suspend fun create(req: TrackRequest): TrackDto = dbQuery {
        val id = Tracks.insertAndGetId {
            it[name] = req.name
            it[layout] = req.layout
            it[country] = req.country
            it[lengthM] = req.lengthM
        }.value
        TrackDto(id, req.name, req.layout, req.country, req.lengthM)
    }

    fun findMany(ids: Collection<Long>): Map<Long, TrackDto> =
        Tracks.selectAll().where { Tracks.id inList ids }.associate { it[Tracks.id].value to it.toTrackDto() }
}

object LapRepository {
    suspend fun create(userId: Long, req: LapRequest, lapDate: LocalDate): LapDto = dbQuery {
        val id = LapTimes.insertAndGetId {
            it[LapTimes.userId] = userId
            it[carId] = req.carId
            it[trackId] = req.trackId
            it[timeMs] = req.timeMs
            it[LapTimes.lapDate] = lapDate
            it[conditions] = req.conditions
            it[tyres] = req.tyres
            it[proofUrl] = req.proofUrl
        }.value
        LapTimes.selectAll().where { LapTimes.id eq id }.single().toLapDto()
    }

    suspend fun find(id: Long): LapDto? = dbQuery {
        LapTimes.selectAll().where { LapTimes.id eq id }.singleOrNull()?.toLapDto()
    }

    /** All of a user's laps, fastest first; the profile uses the first per track. */
    suspend fun forUser(userId: Long): List<LapDto> = dbQuery {
        LapTimes.selectAll().where { LapTimes.userId eq userId }
            .orderBy(LapTimes.timeMs)
            .map { it.toLapDto() }
    }

    /** Verified laps on a track, fastest first. Fine for a club-sized dataset. */
    suspend fun verifiedOnTrack(trackId: Long): List<LapDto> = dbQuery {
        LapTimes.selectAll()
            .where { (LapTimes.trackId eq trackId) and (LapTimes.status eq LapStatus.VERIFIED) }
            .orderBy(LapTimes.timeMs)
            .map { it.toLapDto() }
    }

    suspend fun pending(): List<LapDto> = dbQuery {
        LapTimes.selectAll().where { LapTimes.status eq LapStatus.PENDING }
            .orderBy(LapTimes.id)
            .map { it.toLapDto() }
    }

    /** Sets the review status and awards rep the first time a lap gets verified. */
    /** Sets the review status; reputation is recomputed since leaderboards may have changed. */
    suspend fun review(lapId: Long, status: String, reviewerId: Long): LapDto? = dbQuery {
        val lap = LapTimes.selectAll().where { LapTimes.id eq lapId }.singleOrNull()?.toLapDto()
            ?: return@dbQuery null
        LapTimes.update({ LapTimes.id eq lapId }) {
            it[LapTimes.status] = status
            it[verifiedBy] = reviewerId
        }
        lap.copy(status = status)
    }.also { if (it != null) Reputation.recomputeAll() }
}

fun ResultRow.toUserDto() = UserDto(
    id = this[Users.id].value,
    telegramId = this[Users.telegramId],
    username = this[Users.username],
    firstName = this[Users.firstName],
    photoUrl = this[Users.photoUrl],
    nickname = this[Users.nickname],
    crew = this[Users.crew],
    bio = this[Users.bio],
    rep = this[Users.rep],
)

fun ResultRow.toCarDto() = CarDto(
    id = this[Cars.id].value,
    userId = this[Cars.userId].value,
    make = this[Cars.make],
    model = this[Cars.model],
    year = this[Cars.year],
    color = this[Cars.color],
    hp = this[Cars.hp],
    torqueNm = this[Cars.torqueNm],
    weightKg = this[Cars.weightKg],
    drivetrain = this[Cars.drivetrain],
    mods = this[Cars.mods],
    isMain = this[Cars.isMain],
    photoUrl = this[Cars.photoUrl],
    garageImageUrl = this[Cars.garageImageUrl],
    soldAt = this[Cars.soldAt]?.toString(),
)

fun ResultRow.toPhotoDto() = PhotoDto(
    id = this[CarPhotos.id].value,
    url = PhotoService.urlFor(this[CarPhotos.fileName]),
    width = this[CarPhotos.width],
    height = this[CarPhotos.height],
    cutoutUrl = this[CarPhotos.cutoutFile]?.let { PhotoService.urlFor(it) },
    cutoutStatus = this[CarPhotos.cutoutStatus],
)

fun ResultRow.toTrackDto() = TrackDto(
    id = this[Tracks.id].value,
    name = this[Tracks.name],
    layout = this[Tracks.layout],
    country = this[Tracks.country],
    lengthM = this[Tracks.lengthM],
    nameRu = this[Tracks.nameRu],
    layoutRu = this[Tracks.layoutRu],
    countryRu = this[Tracks.countryRu],
)

fun ResultRow.toLapDto() = LapDto(
    id = this[LapTimes.id].value,
    userId = this[LapTimes.userId].value,
    carId = this[LapTimes.carId].value,
    trackId = this[LapTimes.trackId].value,
    timeMs = this[LapTimes.timeMs],
    lapDate = this[LapTimes.lapDate].toString(),
    conditions = this[LapTimes.conditions],
    tyres = this[LapTimes.tyres],
    proofUrl = this[LapTimes.proofUrl],
    status = this[LapTimes.status],
)
