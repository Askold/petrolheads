import { useRef, useState } from "react";
import { MAX_PHOTO_BYTES, useMyProfile, useSubmitLap, useTracks, useUploadProof } from "../api/client";
import { ErrorBox, Field, Loader, Panel, PillButton, ScreenHeader } from "../components/ui";
import { carTitle, maskLap, parseLap } from "../format";
import { trackText, useI18n } from "../i18n";
import { haptic } from "../telegram";

const today = () => new Date().toISOString().slice(0, 10);

type Props = {
  /** Track preselected from the leaderboard. */
  initialTrackId?: number;
  onDone: () => void;
  onAddCar: () => void;
};

export function LapFormScreen({ initialTrackId, onDone, onAddCar }: Props) {
  const { t, lang } = useI18n();
  const profile = useMyProfile();
  const tracks = useTracks();
  const submit = useSubmitLap();
  const uploadProof = useUploadProof();
  const gallery = useRef<HTMLInputElement>(null);
  const [carId, setCarId] = useState<number | "">("");
  const [trackId, setTrackId] = useState<number | "">(initialTrackId ?? "");
  const [time, setTime] = useState("");
  const [lapDate, setLapDate] = useState(today());
  const [proofUrl, setProofUrl] = useState("");

  if (profile.isPending || tracks.isPending) return <Loader />;
  if (profile.isError) return <ErrorBox error={profile.error} />;
  if (tracks.isError) return <ErrorBox error={tracks.error} />;

  // Current cars first; former ones stay selectable for logging older laps.
  const cars = [...profile.data.cars].sort((a, b) => Number(a.soldAt != null) - Number(b.soldAt != null));
  if (cars.length === 0) {
    return (
      <div className="space-y-2">
        <ScreenHeader title={t.logLap} />
        <Panel innerClassName="p-4 text-center">
          <p className="mb-3 text-sm text-steel">{t.addCarFirst}</p>
          <PillButton onClick={onAddCar}>{t.addCar}</PillButton>
        </Panel>
      </div>
    );
  }

  const selectedCar = carId === "" ? (cars.find((c) => c.isMain) ?? cars[0]).id : carId;
  const selectedTrack = trackId === "" ? tracks.data[0]?.id : trackId;
  const timeMs = parseLap(time);
  const uploadedProof = proofUrl.startsWith("/media/");

  const onProofFile = (file: File | undefined) => {
    if (gallery.current) gallery.current.value = "";
    if (!file || file.size > MAX_PHOTO_BYTES) return;
    uploadProof.mutate(file, { onSuccess: (r) => (haptic.success(), setProofUrl(r.url)), onError: () => haptic.error() });
  };

  return (
    <div className="space-y-2">
      <ScreenHeader title={t.logLap} />
      <Panel innerClassName="space-y-3 p-4">
        <Field label={t.track}>
          <select className="field" value={selectedTrack} onChange={(e) => setTrackId(Number(e.target.value))}>
            {tracks.data.map((tr) => {
              const tt = trackText(tr, lang);
              return (
                <option key={tr.id} value={tr.id}>
                  {tt.name}
                  {tt.layout ? ` — ${tt.layout}` : ""}
                </option>
              );
            })}
          </select>
        </Field>
        <Field label={t.car}>
          <select className="field" value={selectedCar} onChange={(e) => setCarId(Number(e.target.value))}>
            {cars.map((c) => (
              <option key={c.id} value={c.id}>
                {carTitle(c)}
                {c.soldAt ? ` (${t.formerTag})` : ""}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t.lapTimeLabel}>
          <input
            className="field font-display text-3xl italic tracking-wider"
            inputMode="numeric"
            autoComplete="off"
            placeholder="7:45.123"
            value={time}
            onChange={(e) => setTime(maskLap(e.target.value))}
          />
          {time.length >= 4 && !timeMs && <span className="mt-1 block text-xs italic text-danger">{t.lapFormatHint}</span>}
        </Field>
        <Field label={t.date}>
          <input className="field" type="date" max={today()} value={lapDate} onChange={(e) => setLapDate(e.target.value)} />
        </Field>

        <Field label={t.proof}>
          <span className="mb-2 block text-xs italic text-steel">{t.proofHint}</span>
          {uploadedProof ? (
            <div className="flex items-center gap-3">
              <img src={proofUrl} alt="" className="h-20 w-28 rounded-md border border-white/20 object-cover" />
              <PillButton variant="danger" className="text-base" onClick={() => setProofUrl("")}>
                {t.removeProof}
              </PillButton>
            </div>
          ) : (
            <div className="space-y-2">
              <PillButton className="w-full text-base" disabled={uploadProof.isPending} onClick={() => gallery.current?.click()}>
                {uploadProof.isPending ? t.proofUploading : t.proofFromGallery}
              </PillButton>
              <input ref={gallery} type="file" accept="image/*" hidden onChange={(e) => onProofFile(e.target.files?.[0])} />
              <input className="field" placeholder={t.proofLink} value={proofUrl} onChange={(e) => setProofUrl(e.target.value)} />
            </div>
          )}
          {uploadProof.isError && <ErrorBox error={uploadProof.error} />}
        </Field>

        <p className="text-xs italic text-steel">{t.proofNote}</p>
        {submit.isError && <ErrorBox error={submit.error} />}
        <div className="flex justify-end">
          <PillButton
            disabled={!timeMs || submit.isPending || uploadProof.isPending || selectedTrack == null}
            onClick={() =>
              submit.mutate(
                {
                  carId: selectedCar,
                  trackId: selectedTrack!,
                  timeMs: timeMs!,
                  lapDate,
                  conditions: null,
                  tyres: null,
                  proofUrl: proofUrl.trim() || null,
                },
                { onSuccess: () => (haptic.success(), onDone()), onError: () => haptic.error() },
              )
            }
          >
            {t.submitLap}
          </PillButton>
        </div>
      </Panel>
    </div>
  );
}
