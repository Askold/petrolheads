import type { Car, User } from "./api/types";

/** 465123 -> "7:45.123" */
export function formatLap(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const millis = ms % 1000;
  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

/**
 * Formats raw keystrokes as a lap time while typing, so only digits are needed:
 * "7" → "7", "745" → "7:45", "745123" → "7:45.123", "1012345" → "10:12.345".
 */
export function maskLap(input: string): string {
  const d = input.replace(/\D/g, "").slice(0, 7);
  if (d.length <= 1) return d;
  if (d.length <= 3) return `${d[0]}:${d.slice(1)}`;
  if (d.length <= 6) return `${d[0]}:${d.slice(1, 3)}.${d.slice(3)}`;
  return `${d.slice(0, 2)}:${d.slice(2, 4)}.${d.slice(4)}`;
}

/** Accepts "7:45.123", "7:45.1" or "45.123"; returns null when invalid. */
export function parseLap(input: string): number | null {
  const m = input.trim().match(/^(?:(\d{1,2}):)?(\d{1,2})(?:[.,](\d{1,3}))?$/);
  if (!m) return null;
  const minutes = Number(m[1] ?? 0);
  const seconds = Number(m[2]);
  if (seconds >= 60 && m[1] !== undefined) return null;
  const millis = Number((m[3] ?? "0").padEnd(3, "0"));
  return minutes * 60000 + seconds * 1000 + millis;
}

export const displayName = (u: User) => u.nickname ?? u.username ?? u.firstName;

export const carTitle = (c: Car) => `${c.make} ${c.model}`;

/** The cover photo, which carries the background-removed cutout used on the turntable. */
export const coverPhoto = (c: Car) => c.photos.find((p) => p.url === c.photoUrl) ?? null;

