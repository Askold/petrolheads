package app.petrolheads.routes

import app.petrolheads.AddAdminRequest
import app.petrolheads.CarCatalog
import app.petrolheads.CarRequest
import app.petrolheads.LapRequest
import app.petrolheads.LeaderboardDto
import app.petrolheads.LeaderboardEntryDto
import app.petrolheads.PendingLapDto
import app.petrolheads.MetaDto
import app.petrolheads.PersonalBestDto
import app.petrolheads.PhotoDto
import app.petrolheads.photos.PhotoService
import app.petrolheads.photos.PhotoSource
import app.petrolheads.telegram.TelegramApi
import io.ktor.http.content.PartData
import io.ktor.http.content.forEachPart
import io.ktor.server.request.receiveMultipart
import io.ktor.utils.io.readRemaining
import kotlinx.io.readByteArray
import app.petrolheads.ProfileDto
import app.petrolheads.ReviewLapRequest
import app.petrolheads.TierDto
import app.petrolheads.TrackRequest
import app.petrolheads.UploadedDto
import app.petrolheads.UpdateProfileRequest
import app.petrolheads.auth.user
import app.petrolheads.db.CarRepository
import app.petrolheads.db.LapRepository
import app.petrolheads.db.LapStatus
import app.petrolheads.db.AdminRepository
import app.petrolheads.db.CarScores
import app.petrolheads.db.MusicRepository
import app.petrolheads.db.Reputation
import app.petrolheads.db.TierRepository
import app.petrolheads.db.LikeRepository
import app.petrolheads.db.TrackRepository
import app.petrolheads.db.UserRepository
import app.petrolheads.db.dbQuery
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.ApplicationCall
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.delete
import io.ktor.server.routing.get
import io.ktor.server.routing.patch
import io.ktor.server.routing.post
import io.ktor.server.routing.put
import io.ktor.server.routing.route
import java.time.LocalDate
import java.time.format.DateTimeParseException

private val DRIVETRAINS = setOf("FWD", "RWD", "AWD")
private val CONDITIONS = setOf("dry", "damp", "wet")

fun Route.apiRoutes(photos: PhotoService, telegram: TelegramApi, adminTelegramIds: Set<Long>, groupInviteUrl: String?) = route("/api") {
    get("/meta") { call.respond(MetaDto(telegram.botUsername(), call.user.isMember, groupInviteUrl)) }

    get("/music") { call.respond(MusicRepository.list()) }

    get("/catalog/all") { call.respond(CarCatalog.all()) }

    get("/catalog") {
        val q = call.request.queryParameters["q"].orEmpty().take(64)
        call.respond(CarCatalog.search(q))
    }

    get("/me") { call.respond(buildProfile(call.user.userId, call)) }

    patch("/me") {
        call.requireMember()
        val req = call.receive<UpdateProfileRequest>()
        UserRepository.updateProfile(
            call.user.userId,
            UpdateProfileRequest(
                nickname = req.nickname.clean("nickname", 32),
                crew = req.crew.clean("crew", 32),
                bio = req.bio.clean("bio", 280),
            ),
        )
        call.respond(buildProfile(call.user.userId, call))
    }

    get("/users") { call.respond(UserRepository.directory(call.user.userId)) }

    // multipart/form-data with one "file" image part; returns the URL to use as a lap's proofUrl
    post("/proofs") {
        call.requireMember()
        var url: String? = null
        call.receiveMultipart(formFieldLimit = PhotoService.MAX_UPLOAD_BYTES.toLong()).forEachPart { part ->
            try {
                if (part is PartData.FileItem && part.name == "file" && url == null) {
                    val bytes = part.provider().readRemaining(PhotoService.MAX_UPLOAD_BYTES + 1L).readByteArray()
                    url = photos.addProof(bytes)
                }
            } finally {
                part.dispose()
            }
        }
        call.respond(HttpStatusCode.Created, UploadedDto(url ?: badRequest("No file in request")))
    }

    get("/users/{id}") { call.respond(buildProfile(call.longParam("id"), call)) }

    route("/cars") {
        get("/feed") { call.respond(LikeRepository.feed(call.user.userId)) }
        post("/{id}/like") { call.requireMember(); call.respond(LikeRepository.setLike(call.longParam("id"), call.user.userId, liked = true)) }
        delete("/{id}/like") { call.requireMember(); call.respond(LikeRepository.setLike(call.longParam("id"), call.user.userId, liked = false)) }
        post {
            call.requireMember()
            val car = CarRepository.create(call.user.userId, call.receive<CarRequest>().validated())
            call.respond(HttpStatusCode.Created, car)
        }
        put("/{id}") {
            call.requireMember()
            val car = CarRepository.update(call.user.userId, call.longParam("id"), call.receive<CarRequest>().validated())
                ?: notFound("Car not found")
            call.respond(car)
        }
        delete("/{id}") {
            call.requireMember()
            if (!CarRepository.delete(call.user.userId, call.longParam("id"))) notFound("Car not found")
            call.respond(HttpStatusCode.NoContent)
        }
        // multipart/form-data with one or more "photo" file parts
        post("/{id}/photos") {
            call.requireMember()
            val carId = call.longParam("id")
            val uploaded = mutableListOf<PhotoDto>()
            call.receiveMultipart(formFieldLimit = PhotoService.MAX_UPLOAD_BYTES.toLong()).forEachPart { part ->
                try {
                    if (part is PartData.FileItem && part.name == "photo") {
                        val bytes = part.provider().readRemaining(PhotoService.MAX_UPLOAD_BYTES + 1L).readByteArray()
                        uploaded += photos.add(call.user.userId, carId, bytes, PhotoSource.APP)
                    }
                } finally {
                    part.dispose()
                }
            }
            if (uploaded.isEmpty()) badRequest("No photo in request")
            call.respond(HttpStatusCode.Created, uploaded)
        }
    }

    route("/photos/{id}") {
        delete {
            call.requireMember()
            photos.delete(call.user.userId, call.longParam("id"))
            call.respond(HttpStatusCode.NoContent)
        }
        post("/cover") {
            call.requireMember()
            photos.setCover(call.user.userId, call.longParam("id"))
            call.respond(HttpStatusCode.NoContent)
        }
    }

    route("/tracks") {
        get { call.respond(TrackRepository.all(onlyWithResults = call.request.queryParameters["withResults"] == "true")) }
        post {
            if (!call.user.isAdmin) forbidden("Only admins can add tracks")
            val req = call.receive<TrackRequest>()
            val track = TrackRepository.create(
                TrackRequest(
                    name = req.name.clean("name", 128) ?: badRequest("name is required"),
                    layout = req.layout.clean("layout", 64),
                    country = req.country.clean("country", 64),
                    lengthM = req.lengthM.inRange("lengthM", 100..100_000),
                )
            )
            call.respond(HttpStatusCode.Created, track)
        }
        get("/{id}/leaderboard") {
            val track = TrackRepository.find(call.longParam("id")) ?: notFound("Track not found")
            val bestPerUser = LapRepository.verifiedOnTrack(track.id).distinctBy { it.userId }
            val entries = dbQuery {
                val users = UserRepository.findMany(bestPerUser.map { it.userId })
                val cars = CarRepository.findMany(bestPerUser.map { it.carId })
                bestPerUser.mapIndexedNotNull { i, lap ->
                    LeaderboardEntryDto(i + 1, users[lap.userId] ?: return@mapIndexedNotNull null,
                        cars[lap.carId] ?: return@mapIndexedNotNull null, lap)
                }
            }
            call.respond(LeaderboardDto(track, entries))
        }
    }

    post("/laps") {
        call.requireMember()
        val req = call.receive<LapRequest>()
        val car = CarRepository.find(req.carId) ?: badRequest("Unknown car")
        if (car.userId != call.user.userId) forbidden("You can only log laps with your own cars")
        TrackRepository.find(req.trackId) ?: badRequest("Unknown track")
        req.timeMs.inRange("timeMs", 10_000..3_600_000)

        val lapDate = try {
            LocalDate.parse(req.lapDate)
        } catch (_: DateTimeParseException) {
            badRequest("lapDate must be YYYY-MM-DD")
        }
        if (lapDate.isAfter(LocalDate.now().plusDays(1))) badRequest("lapDate cannot be in the future")
        if (req.conditions != null && req.conditions !in CONDITIONS) badRequest("conditions must be one of $CONDITIONS")

        val lap = LapRepository.create(
            call.user.userId,
            req.copy(tyres = req.tyres.clean("tyres", 64), proofUrl = req.proofUrl.proofUrl("proofUrl")),
            lapDate,
        )
        call.respond(HttpStatusCode.Created, lap)
    }

    route("/admin") {
        delete("/music/{id}") {
            if (!call.user.isAdmin) forbidden()
            MusicRepository.delete(photos.dir, call.longParam("id"))
            call.respond(MusicRepository.list())
        }
        route("/admins") {
            get {
                if (!call.user.isAdmin) forbidden()
                call.respond(AdminRepository.list(adminTelegramIds))
            }
            post {
                if (!call.user.isAdmin) forbidden()
                AdminRepository.add(call.receive<AddAdminRequest>().username, call.user.userId)
                call.respond(HttpStatusCode.Created, AdminRepository.list(adminTelegramIds))
            }
            delete("/{id}") {
                if (!call.user.isAdmin) forbidden()
                AdminRepository.remove(call.longParam("id"), call.user.telegramId)
                call.respond(AdminRepository.list(adminTelegramIds))
            }
        }
        get("/laps/pending") {
            if (!call.user.isAdmin) forbidden()
            val laps = LapRepository.pending()
            val result = dbQuery {
                val users = UserRepository.findMany(laps.map { it.userId })
                val cars = CarRepository.findMany(laps.map { it.carId })
                val tracks = TrackRepository.findMany(laps.map { it.trackId })
                laps.mapNotNull { lap ->
                    PendingLapDto(lap, users[lap.userId] ?: return@mapNotNull null,
                        cars[lap.carId] ?: return@mapNotNull null, tracks[lap.trackId] ?: return@mapNotNull null)
                }
            }
            call.respond(result)
        }
        post("/laps/{id}/review") {
            if (!call.user.isAdmin) forbidden()
            val status = call.receive<ReviewLapRequest>().status
            if (status !in LapStatus.all) badRequest("status must be one of ${LapStatus.all}")
            val lap = LapRepository.review(call.longParam("id"), status, call.user.userId) ?: notFound("Lap not found")
            call.respond(lap)
        }
    }
}

private suspend fun buildProfile(userId: Long, call: ApplicationCall): ProfileDto {
    val user = UserRepository.find(userId) ?: notFound("User not found")
    val cars = CarRepository.forUser(userId)
        .let { list -> dbQuery { CarScores.decorate(list, call.user.userId) } }
    val isMe = userId == call.user.userId
    // Others only see verified times; you also see your own pending ones.
    val laps = LapRepository.forUser(userId)
        .filter { it.status == LapStatus.VERIFIED || (isMe && it.status == LapStatus.PENDING) }
        .distinctBy { it.trackId }
    val tracks = dbQuery { TrackRepository.findMany(laps.map { it.trackId }) }
    val carsById = cars.associateBy { it.id }
    val bests = laps.mapNotNull { lap ->
        PersonalBestDto(tracks[lap.trackId] ?: return@mapNotNull null, lap, carsById[lap.carId] ?: return@mapNotNull null)
    }
    val tier = TierDto.of(dbQuery { TierRepository.homeBests()[userId] })
    val rep = dbQuery { Reputation.computeAll()[userId] }
    return ProfileDto(user, cars, bests, isMe = isMe, isAdmin = isMe && call.user.isAdmin, tier = tier, rep = rep)
}

private fun CarRequest.validated(): CarRequest {
    val dt = drivetrain?.uppercase()
    if (dt != null && dt !in DRIVETRAINS) badRequest("drivetrain must be one of $DRIVETRAINS")
    if (mods.size > 50) badRequest("Too many mods")
    return copy(
        make = make.clean("make", 64) ?: badRequest("make is required"),
        model = model.clean("model", 64) ?: badRequest("model is required"),
        year = year.inRange("year", 1886..LocalDate.now().year + 1),
        color = color.clean("color", 32),
        hp = hp.inRange("hp", 1..5000),
        torqueNm = torqueNm.inRange("torqueNm", 1..10_000),
        weightKg = weightKg.inRange("weightKg", 100..10_000),
        drivetrain = dt,
        mods = mods.mapNotNull { it.clean("mod", 80) },
        soldYear = soldYear.inRange("soldYear", 1900..LocalDate.now().year).also { sy ->
            if (sy != null && year != null && sy < year) badRequest("soldYear can't be before the car's year")
        },
    )
}

/** Browsing is open to everyone in Telegram; changes need membership in the club group. */
private fun ApplicationCall.requireMember() {
    if (!user.isMember) forbidden("Only members of the Petrolheads group can do this")
}

private fun ApplicationCall.longParam(name: String): Long =
    parameters[name]?.toLongOrNull() ?: badRequest("Invalid $name")
