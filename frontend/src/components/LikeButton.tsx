import { useLike } from "../api/client";
import type { Car } from "../api/types";
import { useI18n } from "../i18n";
import { haptic } from "../telegram";

/** ♥ toggle with the like count. Read-only on your own car. */
export function LikeButton({ car, own, className = "" }: { car: Car; own: boolean; className?: string }) {
  const { t } = useI18n();
  const like = useLike();
  // Optimistic: flip immediately, the refetch brings the real count.
  const pending = like.isPending ? like.variables : null;
  const liked = pending && pending.carId === car.id ? pending.liked : car.likedByMe;
  const count = car.likes + (liked === car.likedByMe ? 0 : liked ? 1 : -1);

  return (
    <button
      disabled={own || like.isPending}
      aria-label={own ? t.ownCar : t.likeHint}
      aria-pressed={liked}
      // Keep the press from reaching the turntable's tap/swipe handlers.
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        haptic.tap();
        like.mutate({ carId: car.id, liked: !liked });
      }}
      className={`pill inline-flex items-center gap-1.5 px-3 py-1 text-lg leading-none ${liked ? "!text-neon-pink" : ""} ${className}`}
      data-active={liked}
    >
      <span className={liked ? "drop-shadow-[0_0_6px_rgb(255_90_122/0.8)]" : "opacity-80"}>{liked ? "♥" : "♡"}</span>
      <span className="tabular-nums">{count}</span>
    </button>
  );
}
