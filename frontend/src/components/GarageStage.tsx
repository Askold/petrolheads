import { AnimatePresence, motion } from "motion/react";
import type { Car } from "../api/types";
import { carTitle, coverPhoto } from "../format";
import { LikeButton } from "./LikeButton";
import { useI18n } from "../i18n";
import { useSwipeTap } from "../swipeTap";
import { StatBar, VisualRating } from "./ui";

/** Turntable platform with a hazard-striped rim. */
function Turntable() {
  return (
    <svg viewBox="0 0 400 110" className="absolute inset-x-0 bottom-0 w-full" aria-hidden>
      <defs>
        <radialGradient id="deck" cx="50%" cy="40%" r="60%">
          <stop offset="0" stopColor="#4a4a4e" />
          <stop offset="0.7" stopColor="#262628" />
          <stop offset="1" stopColor="#161618" />
        </radialGradient>
      </defs>
      {/* rim thickness */}
      <ellipse cx="200" cy="62" rx="196" ry="44" fill="#0b0b0c" />
      <ellipse cx="200" cy="62" rx="190" ry="40" fill="none" stroke="#141414" strokeWidth="9" />
      <ellipse cx="200" cy="62" rx="190" ry="40" fill="none" stroke="#e0aa22" strokeWidth="9" strokeDasharray="34 26" opacity="0.9" />
      {/* deck */}
      <ellipse cx="200" cy="54" rx="186" ry="40" fill="url(#deck)" />
      <ellipse cx="200" cy="54" rx="186" ry="40" fill="none" stroke="#000" strokeOpacity="0.6" strokeWidth="2" />
      <ellipse cx="200" cy="56" rx="120" ry="22" fill="#fff" opacity="0.05" />
    </svg>
  );
}

/** Placeholder coupe until the car has a photo (later: a generated garage render). */
export function Silhouette() {
  return (
    <svg viewBox="0 0 320 110" className="w-full drop-shadow-[0_6px_6px_rgb(0_0_0/0.8)]">
      <defs>
        <linearGradient id="paint" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#f2f2f4" />
          <stop offset="0.35" stopColor="#a9abb2" />
          <stop offset="0.6" stopColor="#55575e" />
          <stop offset="1" stopColor="#1c1c1f" />
        </linearGradient>
      </defs>
      <path
        d="M14 78 L22 62 Q30 54 58 50 L108 30 Q124 22 152 22 L204 24 Q226 26 246 44 L292 54 Q308 58 308 70 L306 82 L14 84 Z"
        fill="url(#paint)"
      />
      <path d="M118 34 Q130 28 152 28 L170 28 L170 48 L96 50 Z" fill="#141518" />
      <path d="M178 28 L202 29 Q220 31 236 46 L178 48 Z" fill="#141518" />
      <path d="M290 60 L306 64" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      <path d="M40 70 L300 68" stroke="#000" strokeOpacity="0.35" strokeWidth="1.5" />
      {[78, 250].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy={82} r={19} fill="#0a0a0a" />
          <circle cx={cx} cy={82} r={14} fill="#2a2a2c" stroke="#c9c9cc" strokeWidth="1.5" />
          {Array.from({ length: 6 }, (_, i) => (
            <path
              key={i}
              d={`M${cx} 82 L${cx + 13 * Math.cos((i * Math.PI) / 3)} ${82 + 13 * Math.sin((i * Math.PI) / 3)}`}
              stroke="#d8d8db"
              strokeWidth="2.5"
            />
          ))}
          <circle cx={cx} cy={82} r={3.5} fill="#e0aa22" />
        </g>
      ))}
    </svg>
  );
}

/** Background-removed car standing on the deck, with a contact shadow and a faint floor reflection. */
function CutoutCar({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="relative flex h-[150px] items-end justify-center">
      <div className="absolute bottom-[-6px] left-[8%] right-[8%] h-6 rounded-[50%] bg-black/80 blur-md" />
      <img src={src} alt={alt} className="relative max-h-full max-w-full object-contain drop-shadow-[0_4px_6px_rgb(0_0_0/0.6)]" />
      <img
        src={src}
        alt=""
        aria-hidden
        className="reflection pointer-events-none absolute top-full max-h-[40%] max-w-full object-contain object-top"
      />
    </div>
  );
}

function CarVisual({ car }: { car: Car }) {
  const { t } = useI18n();
  const cover = coverPhoto(car);
  if (car.garageImageUrl) return <CutoutCar src={car.garageImageUrl} alt={carTitle(car)} />;
  if (cover?.cutoutStatus === "done" && cover.cutoutUrl) return <CutoutCar src={cover.cutoutUrl} alt={carTitle(car)} />;
  if (!cover) return <Silhouette />;
  // No cutout (yet): feather the raw photo's edges so it sits in the scene.
  return (
    <div className="relative">
      <img
        src={cover.url}
        alt={carTitle(car)}
        className="aspect-[16/10] w-full rounded object-cover [mask-image:radial-gradient(75%_70%_at_50%_50%,black_60%,transparent_100%)]"
      />
      {cover.cutoutStatus === "pending" && (
        <span className="title-lime absolute inset-x-0 bottom-1 animate-pulse text-center text-lg">{t.onTurntable}</span>
      )}
    </div>
  );
}

/** The car on the turntable, visual rating on the right and the three stat bars below. */
type StageProps = {
  car: Car;
  /** Whether the viewer owns the car (can't like it). */
  own: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  /** Tap on the car (not a swipe) opens its details. */
  onTap?: () => void;
};

export function GarageStage({ car, own, onPrev, onNext, onTap }: StageProps) {
  const { t } = useI18n();
  // Swipe changes car, a short tap opens details; the two never trigger each other.
  const gestures = useSwipeTap({ onTap, onSwipeLeft: onNext, onSwipeRight: onPrev });
  return (
    <div>
      <div className="stage-light relative h-[230px] select-none [&_img]:pointer-events-none" {...gestures}>
        <div className="absolute right-1 top-1 z-10">
          <VisualRating value={car.rating} />
          <div className="mt-1 flex justify-end pr-3">
            <LikeButton car={car} own={own} />
          </div>
        </div>
        {car.soldAt && (
          <div className="absolute left-1 top-1 z-10 -rotate-6 rounded border-2 border-danger/80 px-2 py-0.5 font-display text-lg font-bold uppercase italic text-danger/90">
            {t.soldIn(car.soldAt.slice(0, 4))}
          </div>
        )}
        <Turntable />
        {/* Club emblem painted on the deck, squashed into the turntable's perspective */}
        <img
          src="/brand/emblem-white.png"
          alt=""
          aria-hidden
          className="pointer-events-none absolute bottom-[22px] left-1/2 w-[46%] opacity-[0.13]"
          style={{ transform: "translateX(-50%) scaleY(0.3)", transformOrigin: "bottom center" }}
        />
        <AnimatePresence mode="wait">
          <motion.div
            key={car.id}
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -60 }}
            transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
            className="absolute inset-x-[6%] bottom-[34px]"
          >
            <CarVisual car={car} />
          </motion.div>
        </AnimatePresence>
      </div>
      {/* Bars are relative to the other cars in the club (see CarScores on the backend). */}
      <div className="strip mt-1 px-3 py-2.5">
        <div className="flex gap-4">
          <StatBar label={t.acceleration} value={car.stats?.acceleration ?? 0} />
          <StatBar label={t.topSpeed} value={car.stats?.topSpeed ?? 0} />
          <StatBar label={t.handling} value={car.stats?.handling ?? 0} />
        </div>
        {!car.stats && <p className="mt-1.5 text-center text-[11px] italic text-steel">{t.noStats}</p>}
      </div>
    </div>
  );
}
