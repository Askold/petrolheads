import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMusic } from "../api/client";
import type { MusicTrack } from "../api/types";
import { useI18n } from "../i18n";
import { haptic } from "../telegram";

const PREF_KEY = "music";
const VOLUME = 0.4;

const trackName = (t: MusicTrack) => [t.performer, t.title].filter(Boolean).join(" — ") || "♪";

function readPref(): boolean {
  try {
    return localStorage.getItem(PREF_KEY) !== "off";
  } catch {
    return true;
  }
}

function shuffled<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Background music: shuffled playlist, low volume, ♪ toggle in the corner.
 * Browsers only allow sound after a user gesture, so playback starts on the first tap.
 * Pauses while the Mini App is hidden.
 */
export function MusicPlayer() {
  const { t } = useI18n();
  const music = useMusic();
  const playlist = useMemo(() => shuffled(music.data ?? []), [music.data]);
  const [on, setOn] = useState(readPref);
  const [unlocked, setUnlocked] = useState(false);
  const [visible, setVisible] = useState(() => document.visibilityState === "visible");
  const [index, setIndex] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);

  const track = playlist.length ? playlist[index % playlist.length] : null;

  useEffect(() => {
    const a = new Audio();
    a.volume = VOLUME;
    a.preload = "auto";
    a.onended = () => setIndex((i) => i + 1);
    // A broken file shouldn't stop the music: skip to the next one.
    a.onerror = () => setIndex((i) => i + 1);
    audio.current = a;
    const unlock = () => setUnlocked(true);
    const onVisibility = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("pointerdown", unlock, { once: true });
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      a.pause();
      document.removeEventListener("pointerdown", unlock);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // Load the current track and announce it.
  useEffect(() => {
    const a = audio.current;
    if (!a || !track) return;
    if (!a.src.endsWith(track.url)) {
      a.src = track.url;
      if (on && unlocked) setToast(trackName(track));
    }
  }, [track, on, unlocked]);

  // Play or pause to match the toggle, the first-tap unlock and app visibility.
  useEffect(() => {
    const a = audio.current;
    if (!a || !track) return;
    if (on && unlocked && visible) a.play().catch(() => {});
    else a.pause();
  }, [on, unlocked, visible, track]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(id);
  }, [toast]);

  if (!playlist.length) return null;

  const toggle = () => {
    haptic.select();
    const next = !on;
    setOn(next);
    setUnlocked(true);
    setToast(next ? (track ? trackName(track) : t.musicOn) : t.musicOff);
    try {
      localStorage.setItem(PREF_KEY, next ? "on" : "off");
    } catch {
      // storage unavailable
    }
  };

  return (
    <>
      <button
        onClick={toggle}
        aria-label={on ? t.musicOn : t.musicOff}
        aria-pressed={on}
        className={`circle-arrow fixed right-3 top-3 z-40 h-9 w-9 bg-black/50 text-lg ${on ? "!border-lime !text-lime" : "opacity-70"}`}
      >
        {on ? "♪" : <span className="relative">♪<span className="absolute left-[-3px] top-1/2 h-[2px] w-4 -rotate-45 bg-current" /></span>}
      </button>
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="strip fixed right-14 top-3.5 z-40 max-w-[60vw] truncate px-3 py-1 text-sm italic text-white"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
