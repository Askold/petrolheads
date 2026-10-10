// Mirrors backend/src/main/kotlin/app/petrolheads/Models.kt

export type User = {
  id: number;
  telegramId: number;
  username: string | null;
  firstName: string;
  photoUrl: string | null;
  nickname: string | null;
  crew: string | null;
  bio: string | null;
  rep: number;
};

export type Drivetrain = "FWD" | "RWD" | "AWD";

export type Car = {
  id: number;
  userId: number;
  make: string;
  model: string;
  year: number | null;
  color: string | null;
  hp: number | null;
  torqueNm: number | null;
  weightKg: number | null;
  drivetrain: Drivetrain | null;
  mods: string[];
  isMain: boolean;
  /** Cover photo; one of `photos`. */
  photoUrl: string | null;
  garageImageUrl: string | null;
  photos: Photo[];
  /** ISO date the car was sold; null while it's still in the garage. */
  soldAt: string | null;
  likes: number;
  likedByMe: boolean;
  /** Points from leaderboard positions set with this car (F1-style). */
  lapPoints: number;
  /** Overall 0..10: 60% leaderboard points, 40% likes, each relative to the club's best car. */
  rating: number;
  /** 0..1 bars scaled across the club's cars; null when horsepower is unknown. */
  stats: CarStats | null;
};

export type CarStats = { acceleration: number; topSpeed: number; handling: number };

export type FeedCar = { car: Car; owner: User };

export type CutoutStatus = "pending" | "done" | "failed" | "skipped";

export type Photo = {
  id: number;
  url: string;
  width: number;
  height: number;
  /** Transparent PNG of just the car (background removed), when cutoutStatus is "done". */
  cutoutUrl: string | null;
  cutoutStatus: CutoutStatus;
};

/** isMember: the viewer may add and change things; otherwise the app is read-only for them. */
export type Meta = { botUsername: string | null; isMember: boolean; groupInviteUrl: string | null };

export type Track = {
  id: number;
  name: string;
  layout: string | null;
  country: string | null;
  lengthM: number | null;
  nameRu: string | null;
  layoutRu: string | null;
  countryRu: string | null;
};

/** Stock specs from the backend's car catalog, for autofill. */
export type CatalogCar = {
  make: string;
  model: string;
  from: number;
  to: number | null;
  hp: number;
  torqueNm: number;
  weightKg: number;
  drivetrain: Drivetrain;
};

export type LapStatus = "pending" | "verified" | "rejected";

export type Lap = {
  id: number;
  userId: number;
  carId: number;
  trackId: number;
  timeMs: number;
  lapDate: string;
  conditions: "dry" | "damp" | "wet" | null;
  tyres: string | null;
  proofUrl: string | null;
  status: LapStatus;
};

export type PersonalBest = { track: Track; lap: Lap; car: Car };

export type TierKey = "member" | "petrolhead" | "racer" | "elite";

/** Club status from the best verified lap on the home track (thresholds live on the backend). */
export type TierInfo = {
  tier: TierKey;
  bestMs: number | null;
  trackName: string;
  nextTier: TierKey | null;
  nextTierMaxMs: number | null;
};

export type Profile = {
  user: User;
  cars: Car[];
  personalBests: PersonalBest[];
  isMe: boolean;
  isAdmin: boolean;
  tier: TierInfo;
  rep: RepBreakdown | null;
};

/** How a driver's reputation adds up; recomputed on the server from places, likes and tier. */
export type RepBreakdown = { lapPoints: number; likes: number; likePoints: number; tierBonus: number; total: number };

export type MusicTrack = { id: number; url: string; title: string | null; performer: string | null; durationS: number | null };

export type Admin = { id: number | null; username: string | null; user: User | null; fromConfig: boolean };

export type Driver = { user: User; mainCar: Car | null; carCount: number; likes: number; tier: TierKey };

export type LeaderboardEntry = { position: number; user: User; car: Car; lap: Lap };
export type Leaderboard = { track: Track; entries: LeaderboardEntry[] };
export type PendingLap = { lap: Lap; user: User; car: Car; track: Track };

export type CarInput = Omit<Car, "id" | "userId" | "garageImageUrl" | "photoUrl" | "photos" | "soldAt" | "likes" | "likedByMe" | "lapPoints" | "rating" | "stats"> & { sold: boolean; soldYear: number | null };
export type LapInput = Pick<Lap, "carId" | "trackId" | "timeMs" | "lapDate" | "conditions" | "tyres" | "proofUrl">;
export type ProfileInput = Pick<User, "nickname" | "crew" | "bio">;
