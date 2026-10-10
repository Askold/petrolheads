import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { useCanEdit, useLeaderboard, useMyProfile, useTracksWithResults } from "../api/client";
import { ReadOnlyBanner } from "../components/ReadOnlyBanner";
import { type CarFilter, MakeModelFilter, matchesFilter, NO_FILTER } from "../components/MakeModelFilter";
import { CircleArrow, EmptyEmblem, ErrorBox, Loader, PillButton, ScreenHeader } from "../components/ui";
import { carTitle, displayName, formatLap } from "../format";
import { trackText, useI18n } from "../i18n";

export function LeaderboardScreen({
  onOpenUser,
  onAddLap,
}: {
  onOpenUser: (userId: number) => void;
  /** Opens the lap form; without a track id it starts from the first track. */
  onAddLap: (trackId?: number) => void;
}) {
  const { t, lang } = useI18n();
  const tracks = useTracksWithResults();
  const canEdit = useCanEdit();
  const me = useMyProfile();
  const [index, setIndex] = useState(0);
  const [filter, setFilter] = useState<CarFilter>(NO_FILTER);
  // The list can shrink or grow as laps get verified; keep the index in range.
  const track = tracks.data?.[Math.min(index, Math.max(0, (tracks.data?.length ?? 1) - 1))];
  const board = useLeaderboard(track?.id ?? null);

  if (tracks.isPending) return <Loader label={t.loadingTracks} />;
  if (tracks.isError) return <ErrorBox error={tracks.error} />;
  if (tracks.data.length === 0) {
    return (
      <div className="space-y-2">
        <ScreenHeader title={t.leaderboard} />
        <div className="strip space-y-2 px-4 py-8 text-center">
          <EmptyEmblem />
          <div className="title-lime text-2xl">{t.noResultsAnywhere}</div>
          <div className="mt-1 text-sm italic text-steel">{t.beFirst}</div>
        </div>
        {canEdit ? (
          <PillButton className="w-full" onClick={() => onAddLap()}>
            + {t.addResult}
          </PillButton>
        ) : (
          <ReadOnlyBanner />
        )}
      </div>
    );
  }

  const count = tracks.data.length;
  const step = (d: number) => setIndex((i) => (i + d + count) % count);
  const tt = track ? trackText(track, lang) : null;

  return (
    <div className="space-y-2">
      <ScreenHeader title={t.leaderboard} progress={count > 1 ? index / (count - 1) : 0.5}>
        {/* Track selector band */}
        <div className="frost mt-2.5 flex items-center gap-2 px-2 py-2">
          <CircleArrow dir="left" label={t.prevTrack} onClick={() => step(-1)} />
          <AnimatePresence mode="wait">
            <motion.div
              key={track?.id}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.18 }}
              className="min-w-0 flex-1 text-center leading-none"
            >
              <div className="truncate font-display text-base font-semibold not-italic text-[#2c2c30]/80">
                {[tt?.country, tt?.layout, track?.lengthM && `${(track.lengthM / 1000).toFixed(2)} ${lang === "ru" ? "км" : "km"}`]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
              <div className="line-clamp-2 font-display text-[28px] font-bold uppercase not-italic leading-[0.95] tracking-tight text-[#2c2c30]/85">
                {tt?.name}
              </div>
            </motion.div>
          </AnimatePresence>
          <CircleArrow dir="right" label={t.nextTrack} onClick={() => step(1)} />
        </div>
        {board.data && board.data.entries.length > 0 && (
          <div className="mt-2">
            <MakeModelFilter cars={board.data.entries.map((e) => e.car)} value={filter} onChange={setFilter} />
          </div>
        )}
      </ScreenHeader>

      {track && canEdit && (
        <PillButton className="w-full" onClick={() => onAddLap(track.id)}>
          + {t.addResult}
        </PillButton>
      )}
      {!canEdit && <ReadOnlyBanner />}

      {board.isPending ? (
        <Loader label={t.timing} />
      ) : board.isError ? (
        <ErrorBox error={board.error} />
      ) : board.data.entries.length === 0 ? (
        <div className="strip px-4 py-8 text-center">
          <div className="title-lime text-2xl">{t.noVerified}</div>
          <div className="mt-1 text-sm italic text-steel">{t.beFirst}</div>
        </div>
      ) : (
        <div className="strip p-1.5">
          <div className="label-white flex px-2.5 pb-1 pt-1 text-sm text-steel">
            <span className="w-9">{t.pos}</span>
            <span className="flex-1">{t.driver}</span>
            <span>{t.lapTime}</span>
          </div>
          <div className="space-y-1">
            {/* With a filter on, positions are ranks within that make/model. */}
            {board.data.entries.filter((e) => matchesFilter(e.car, filter)).length === 0 && (
              <div className="px-4 py-6 text-center text-sm italic text-steel">{t.nothingMatches}</div>
            )}
            {board.data.entries.filter((e) => matchesFilter(e.car, filter)).map((e, i) => {
              const isMe = e.user.id === me.data?.user.id;
              return (
                <motion.button
                  key={e.lap.id}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => onOpenUser(e.user.id)}
                  className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left ${
                    isMe ? "lime-frame bg-black/40" : "border-2 border-transparent bg-white/[0.04]"
                  }`}
                >
                  <span className={`label-white w-9 text-3xl leading-none ${i === 0 ? "!text-lime" : ""}`}>{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="label-white truncate text-xl normal-case leading-tight">
                      {displayName(e.user)}
                      {e.user.crew && <span className="ml-1.5 text-sm text-steel">[{e.user.crew}]</span>}
                    </div>
                    <div className="truncate text-xs text-steel">{carTitle(e.car)}</div>
                  </div>
                  <span className="title-lime text-2xl tabular-nums leading-none">{formatLap(e.lap.timeMs)}</span>
                </motion.button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
