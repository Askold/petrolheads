package app.petrolheads

import kotlinx.serialization.Serializable

@Serializable
data class UserDto(
    val id: Long,
    val telegramId: Long,
    val username: String?,
    val firstName: String,
    val photoUrl: String?,
    val nickname: String?,
    val crew: String?,
    val bio: String?,
    val rep: Int,
)

@Serializable
data class CarDto(
    val id: Long,
    val userId: Long,
    val make: String,
    val model: String,
    val year: Int?,
    val color: String?,
    val hp: Int?,
    val torqueNm: Int?,
    val weightKg: Int?,
    val drivetrain: String?,
    val mods: List<String>,
    val isMain: Boolean,
    /** Cover photo, one of [photos]. */
    val photoUrl: String?,
    val garageImageUrl: String?,
    val photos: List<PhotoDto> = emptyList(),
    /** ISO date the car was sold; null while it's still in the garage. */
    val soldAt: String? = null,
    val likes: Int = 0,
    val likedByMe: Boolean = false,
    /** Points from leaderboard positions set with this car (F1-style). */
    val lapPoints: Int = 0,
    /** Overall 0..10 from [lapPoints] and [likes], relative to the club's best (see CarScores). */
    val rating: Double = 0.0,
    /** Club-relative performance bars; null when horsepower is unknown. */
    val stats: CarStatsDto? = null,
)

@Serializable
data class CarStatsDto(val acceleration: Double, val topSpeed: Double, val handling: Double)

@Serializable
data class PhotoDto(
    val id: Long,
    val url: String,
    val width: Int,
    val height: Int,
    /** Transparent PNG of just the car, once [cutoutStatus] is "done". */
    val cutoutUrl: String? = null,
    val cutoutStatus: String = "pending",
)

@Serializable
data class MetaDto(
    val botUsername: String?,
    /** The viewer may add and change things (group member or admin); otherwise the app is read-only. */
    val isMember: Boolean = true,
    /** Invite link to the club group, shown to non-members (GROUP_INVITE_URL). */
    val groupInviteUrl: String? = null,
)

@Serializable
data class TrackDto(
    val id: Long,
    val name: String,
    val layout: String?,
    val country: String?,
    val lengthM: Int?,
    val nameRu: String? = null,
    val layoutRu: String? = null,
    val countryRu: String? = null,
)

@Serializable
data class LapDto(
    val id: Long,
    val userId: Long,
    val carId: Long,
    val trackId: Long,
    val timeMs: Int,
    val lapDate: String,
    val conditions: String?,
    val tyres: String?,
    val proofUrl: String?,
    val status: String,
)

@Serializable
data class PersonalBestDto(val track: TrackDto, val lap: LapDto, val car: CarDto)

@Serializable
data class ProfileDto(
    val user: UserDto,
    val cars: List<CarDto>,
    val personalBests: List<PersonalBestDto>,
    val isMe: Boolean,
    val isAdmin: Boolean,
    val tier: TierDto = TierDto.of(null),
    val rep: RepBreakdownDto? = null,
)

/** How a driver's reputation adds up (see db/Reputation). */
@Serializable
data class RepBreakdownDto(val lapPoints: Int, val likes: Int, val likePoints: Int, val tierBonus: Int, val total: Int)

@Serializable
data class DriverDto(val user: UserDto, val mainCar: CarDto?, val carCount: Int, val likes: Int = 0, val tier: String = "member")

/** A car in the club-wide "Garages" grid, with its owner. */
@Serializable
data class FeedCarDto(val car: CarDto, val owner: UserDto)

@Serializable
data class LikeDto(val likes: Int, val likedByMe: Boolean)

@Serializable
data class UploadedDto(val url: String)

@Serializable
data class LeaderboardEntryDto(val position: Int, val user: UserDto, val car: CarDto, val lap: LapDto)

@Serializable
data class LeaderboardDto(val track: TrackDto, val entries: List<LeaderboardEntryDto>)

@Serializable
data class PendingLapDto(val lap: LapDto, val user: UserDto, val car: CarDto, val track: TrackDto)

// --- requests ---

@Serializable
data class UpdateProfileRequest(val nickname: String? = null, val crew: String? = null, val bio: String? = null)

@Serializable
data class CarRequest(
    val make: String,
    val model: String,
    val year: Int? = null,
    val color: String? = null,
    val hp: Int? = null,
    val torqueNm: Int? = null,
    val weightKg: Int? = null,
    val drivetrain: String? = null,
    val mods: List<String> = emptyList(),
    val isMain: Boolean = false,
    /** True for a car the driver used to own. */
    val sold: Boolean = false,
    /** Year it was sold; defaults to the current year (or the stored one when re-saving). */
    val soldYear: Int? = null,
)

@Serializable
data class TrackRequest(val name: String, val layout: String? = null, val country: String? = null, val lengthM: Int? = null)

@Serializable
data class LapRequest(
    val carId: Long,
    val trackId: Long,
    val timeMs: Int,
    val lapDate: String,
    val conditions: String? = null,
    val tyres: String? = null,
    val proofUrl: String? = null,
)

@Serializable
data class ReviewLapRequest(val status: String)

@Serializable
data class AdminDto(
    val id: Long?,
    val username: String?,
    /** The matching app user once they've opened the app. */
    val user: UserDto?,
    /** Set via ADMIN_TELEGRAM_IDS on the server; can't be removed from the app. */
    val fromConfig: Boolean,
)

@Serializable
data class AddAdminRequest(val username: String)

@Serializable
data class MusicTrackDto(val id: Long, val url: String, val title: String?, val performer: String?, val durationS: Int?)
