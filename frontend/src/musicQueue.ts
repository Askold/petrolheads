import type { MusicTrack } from "./api/types";

/** Play queue for the background music: one shuffled round of the playlist at a time. */
export function shuffled<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export type Queue = { queue: MusicTrack[]; pos: number; /** bumps on every advance, so a repeat of the same file restarts */ plays: number };
export type QueueAction = { type: "load"; tracks: MusicTrack[] } | { type: "next" };

/** Next round: reshuffled, and the track that just finished never opens it (no back-to-back repeat). */
export function nextRound(prev: MusicTrack[]): MusicTrack[] {
  const q = shuffled(prev);
  if (q.length > 1 && q[0].id === prev[prev.length - 1].id) [q[0], q[1]] = [q[1], q[0]];
  return q;
}

export function queueReducer(s: Queue, action: QueueAction): Queue {
  if (action.type === "load") {
    // Playlist changed (track added/removed): keep the current song going, reshuffle the rest after it.
    const current = s.queue[s.pos];
    if (current && action.tracks.some((t) => t.id === current.id)) {
      return { queue: [current, ...shuffled(action.tracks.filter((t) => t.id !== current.id))], pos: 0, plays: s.plays };
    }
    return { queue: shuffled(action.tracks), pos: 0, plays: s.plays + 1 };
  }
  if (s.queue.length === 0) return s;
  if (s.pos + 1 < s.queue.length) return { ...s, pos: s.pos + 1, plays: s.plays + 1 };
  return { queue: nextRound(s.queue), pos: 0, plays: s.plays + 1 }; // loop around
}
