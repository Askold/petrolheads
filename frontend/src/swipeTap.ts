import { useRef, type PointerEvent } from "react";

/** Max finger travel (px) that still counts as a tap. */
const TAP_SLOP = 10;
/** Max press duration (ms) for a tap; longer is a hold, not a tap. */
const TAP_MAX_MS = 500;
/** Horizontal travel (px) for a swipe, or less if it's a quick flick. */
const SWIPE_MIN = 50;
const FLICK_MIN = 25;
const FLICK_MAX_MS = 250;

/**
 * Tells a tap from a horizontal swipe on one element, using raw pointer events.
 * Anything in between (a drag that's neither short nor clearly sideways) does nothing,
 * and vertical scrolling is left to the browser via `touch-action: pan-y` (it fires pointercancel).
 */
export function useSwipeTap({ onTap, onSwipeLeft, onSwipeRight }: { onTap?: () => void; onSwipeLeft?: () => void; onSwipeRight?: () => void }) {
  const start = useRef<{ x: number; y: number; t: number; id: number } | null>(null);

  return {
    style: { touchAction: "pan-y" as const },
    onPointerDown: (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      start.current = { x: e.clientX, y: e.clientY, t: e.timeStamp, id: e.pointerId };
    },
    onPointerUp: (e: PointerEvent) => {
      const s = start.current;
      start.current = null;
      if (!s || s.id !== e.pointerId) return;
      const dx = e.clientX - s.x;
      const dy = e.clientY - s.y;
      const dt = e.timeStamp - s.t;
      const sideways = Math.abs(dx) > Math.abs(dy) * 1.5;
      if (sideways && (Math.abs(dx) >= SWIPE_MIN || (Math.abs(dx) >= FLICK_MIN && dt <= FLICK_MAX_MS))) {
        (dx < 0 ? onSwipeLeft : onSwipeRight)?.();
      } else if (Math.hypot(dx, dy) <= TAP_SLOP && dt <= TAP_MAX_MS) {
        onTap?.();
      }
    },
    onPointerCancel: () => {
      start.current = null;
    },
  };
}
