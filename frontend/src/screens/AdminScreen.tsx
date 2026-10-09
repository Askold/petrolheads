import { useState } from "react";
import { usePendingLaps, useReviewLap } from "../api/client";
import { AdminsPanel } from "../components/AdminsPanel";
import { MusicPanel } from "../components/MusicPanel";
import { ErrorBox, Loader, Panel, PillButton, ScreenHeader, Switcher } from "../components/ui";
import { carTitle, displayName, formatLap } from "../format";
import { trackText, useI18n } from "../i18n";

export function AdminScreen() {
  const { t, lang } = useI18n();
  const pending = usePendingLaps(true);
  const review = useReviewLap();
  const SECTIONS = ["laps", "admins", "music"] as const;
  const [section, setSection] = useState<(typeof SECTIONS)[number]>("laps");
  const step = (d: number) => setSection((s) => SECTIONS[(SECTIONS.indexOf(s) + d + SECTIONS.length) % SECTIONS.length]);

  return (
    <div className="space-y-2">
      <ScreenHeader title={t.raceControl}>
        <div className="mt-2 flex justify-center">
          <Switcher label={<span className="inline-block w-44">{t.adminSections[section]}</span>} onPrev={() => step(-1)} onNext={() => step(1)} />
        </div>
      </ScreenHeader>
      {section === "admins" ? (
        <AdminsPanel />
      ) : section === "music" ? (
        <MusicPanel />
      ) : (
        <>
      <p className="px-1 text-xs italic text-steel">{t.adminNote}</p>
      {pending.isPending ? (
        <Loader />
      ) : pending.isError ? (
        <ErrorBox error={pending.error} />
      ) : pending.data.length === 0 ? (
        <Panel innerClassName="p-4 text-center text-sm italic text-steel">{t.nothingToReview}</Panel>
      ) : (
        <div className="space-y-2">
          {pending.data.map(({ lap, user, car, track }) => (
            <Panel key={lap.id} innerClassName="space-y-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="label-white truncate text-xl normal-case">{displayName(user)}</div>
                  <div className="truncate text-xs text-steel">
                    {trackText(track, lang).name} · {carTitle(car)} · {lap.lapDate}
                  </div>
                </div>
                <span className="title-lime text-2xl tabular-nums leading-none">{formatLap(lap.timeMs)}</span>
              </div>
              {lap.proofUrl?.startsWith("/media/") ? (
                <a href={lap.proofUrl} target="_blank" rel="noreferrer">
                  <img src={lap.proofUrl} alt="" className="max-h-56 w-full rounded-md border border-white/20 object-contain" />
                </a>
              ) : lap.proofUrl ? (
                <a href={lap.proofUrl} target="_blank" rel="noreferrer" className="block truncate text-xs text-lime underline">
                  {lap.proofUrl}
                </a>
              ) : (
                <div className="text-xs italic text-danger">{t.noProof}</div>
              )}
              <div className="flex justify-end gap-3 pt-1">
                <PillButton
                  variant="danger"
                  disabled={review.isPending}
                  onClick={() => review.mutate({ id: lap.id, status: "rejected" })}
                >
                  {t.reject}
                </PillButton>
                <PillButton disabled={review.isPending} onClick={() => review.mutate({ id: lap.id, status: "verified" })}>
                  {t.verify}
                </PillButton>
              </div>
            </Panel>
          ))}
        </div>
      )}
        </>
      )}
    </div>
  );
}
