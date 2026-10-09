import { useDeleteMusic, useMusic } from "../api/client";
import { useI18n } from "../i18n";
import { ErrorBox, Loader, PillButton } from "./ui";

const duration = (s: number | null) => (s == null ? "" : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`);

/** Admin view of the background playlist; tracks are added through the bot. */
export function MusicPanel() {
  const { t } = useI18n();
  const music = useMusic();
  const remove = useDeleteMusic();

  if (music.isPending) return <Loader />;
  if (music.isError) return <ErrorBox error={music.error} />;

  return (
    <div className="space-y-2">
      <p className="px-1 text-xs italic text-steel">{t.musicHint}</p>
      {remove.error && <ErrorBox error={remove.error} />}
      {music.data.length === 0 ? (
        <div className="strip px-4 py-6 text-center text-sm italic text-steel">{t.noMusic}</div>
      ) : (
        <div className="strip divide-y divide-white/10">
          {music.data.map((m) => {
            const name = [m.performer, m.title].filter(Boolean).join(" — ") || "♪";
            return (
              <div key={m.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0">
                  <div className="label-white truncate text-lg normal-case leading-tight">{name}</div>
                  <div className="text-xs text-steel">{duration(m.durationS)}</div>
                </div>
                <PillButton
                  variant="danger"
                  className="shrink-0 text-base"
                  disabled={remove.isPending}
                  onClick={() => confirm(t.confirmDeleteTrack(name)) && remove.mutate(m.id)}
                >
                  {t.deleteTrack}
                </PillButton>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
