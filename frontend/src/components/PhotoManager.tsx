import { useRef, useState } from "react";
import { MAX_PHOTO_BYTES, useDeletePhoto, useMeta, useMyProfile, useSetCover, useUploadPhotos } from "../api/client";
import type { Photo } from "../api/types";
import { useI18n } from "../i18n";
import { haptic } from "../telegram";
import { ErrorBox, PillButton, Panel } from "./ui";

/** Photo strip for one of the current user's cars: upload from the device, pick cover, delete. */
export function PhotoManager({ carId }: { carId: number }) {
  const { t } = useI18n();
  // Read the car from the profile query so the strip updates after uploads.
  const car = useMyProfile().data?.cars.find((c) => c.id === carId);
  const meta = useMeta();
  const upload = useUploadPhotos();
  const remove = useDeletePhoto();
  const setCover = useSetCover();
  const galleryInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<Photo | null>(null);
  const [tooBig, setTooBig] = useState<string | null>(null);

  if (!car) return null;
  const photos = car.photos;
  const busy = upload.isPending || remove.isPending || setCover.isPending;

  const onFiles = (list: FileList | null) => {
    const files = Array.from(list ?? []);
    [galleryInput, cameraInput].forEach((r) => r.current && (r.current.value = ""));
    if (files.length === 0) return;
    const big = files.filter((f) => f.size > MAX_PHOTO_BYTES);
    setTooBig(big.length ? t.tooBig(big.map((f) => f.name).join(", ")) : null);
    const ok = files.filter((f) => f.size <= MAX_PHOTO_BYTES);
    if (ok.length) upload.mutate({ carId, files: ok }, { onSuccess: () => haptic.success(), onError: () => haptic.error() });
  };

  return (
    <Panel innerClassName="space-y-3 p-4">
      <div className="flex items-center justify-between">
        <span className="label-white text-sm text-steel">
          {t.photos} <span className="text-white">{photos.length}</span>/12
        </span>
        {upload.isPending && <span className="title-lime animate-pulse text-base">{t.uploading}</span>}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <PillButton className="text-base" disabled={busy || photos.length >= 12} onClick={() => galleryInput.current?.click()}>
          {t.gallery}
        </PillButton>
        <PillButton className="text-base" disabled={busy || photos.length >= 12} onClick={() => cameraInput.current?.click()}>
          {t.camera}
        </PillButton>
        {/* No `capture` attribute: lets the phone offer its photo library. */}
        <input ref={galleryInput} type="file" accept="image/*" multiple hidden onChange={(e) => onFiles(e.target.files)} />
        <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={(e) => onFiles(e.target.files)} />
      </div>

      {photos.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((p) => {
            const isCover = p.url === car.photoUrl;
            const isSelected = selected?.id === p.id;
            return (
              <button
                key={p.id}
                onClick={() => (haptic.select(), setSelected(isSelected ? null : p))}
                className={`relative aspect-[4/3] overflow-hidden border ${
                  isSelected ? "border-lime shadow-[0_0_10px_rgb(185_240_95/0.6)]" : "border-white/15"
                }`}
              >
                <img src={p.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                {p.cutoutStatus === "pending" && (
                  <span className="absolute inset-x-0 bottom-0 animate-pulse bg-black/70 text-center font-display text-xs italic text-lime">
                    {t.cuttingOut}
                  </span>
                )}
                {p.cutoutStatus === "failed" && (
                  <span className="absolute inset-x-0 bottom-0 bg-black/70 text-center font-display text-xs italic text-danger">
                    {t.noCutout}
                  </span>
                )}
                {isCover && (
                  <span className="absolute left-0 top-0 bg-lime px-1 font-display text-[10px] font-black uppercase italic text-black">
                    {t.cover}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-sm italic text-steel">{t.noPhotos}</p>
      )}

      {selected && (
        <div className="flex gap-2">
          <PillButton
           
            className="flex-1 text-sm"
            disabled={busy || selected.url === car.photoUrl}
            onClick={() => setCover.mutate(selected.id)}
          >
            {t.setCover}
          </PillButton>
          <PillButton
            variant="danger"
            className="flex-1 text-sm"
            disabled={busy}
            onClick={() => remove.mutate(selected.id, { onSuccess: () => setSelected(null) })}
          >
            {t.delete}
          </PillButton>
        </div>
      )}

      {tooBig && <p className="text-xs text-danger">{tooBig}</p>}
      {(upload.error || remove.error || setCover.error) && <ErrorBox error={upload.error ?? remove.error ?? setCover.error} />}

      {meta.data?.botUsername && (
        <p className="text-xs italic text-steel">
          {t.sendToBot(
            <a className="text-lime not-italic" href={`https://t.me/${meta.data.botUsername}`} target="_blank" rel="noreferrer">
            @{meta.data.botUsername}
          </a>,
          )}
        </p>
      )}
    </Panel>
  );
}
