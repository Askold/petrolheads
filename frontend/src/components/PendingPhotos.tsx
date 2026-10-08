import { useEffect, useMemo, useRef } from "react";
import { MAX_PHOTO_BYTES } from "../api/client";
import { useI18n } from "../i18n";
import { haptic } from "../telegram";
import { PillButton } from "./ui";

const MAX_PHOTOS = 12;

/** Photos picked before the car exists; they're uploaded right after it's created. */
export function PendingPhotos({ files, onChange }: { files: File[]; onChange: (files: File[]) => void }) {
  const { t } = useI18n();
  const gallery = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach(URL.revokeObjectURL), [previews]);

  const add = (list: FileList | null) => {
    // Copy first: FileList is live, and resetting the input (so the same file can be re-picked) empties it.
    const picked = Array.from(list ?? []).filter((f) => f.size <= MAX_PHOTO_BYTES);
    [gallery, camera].forEach((r) => r.current && (r.current.value = ""));
    if (picked.length) haptic.select();
    onChange([...files, ...picked].slice(0, MAX_PHOTOS));
  };

  return (
    <div className="space-y-2">
      <span className="label-white block text-sm tracking-wide text-steel">
        {t.photos} <span className="text-white">{files.length}</span>/{MAX_PHOTOS}
      </span>
      {files.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {previews.map((src, i) => (
            <div key={src} className="relative aspect-[4/3] overflow-hidden rounded border border-white/15">
              <img src={src} alt="" className="h-full w-full object-cover" />
              {i === 0 && (
                <span className="absolute left-0 top-0 bg-lime px-1 font-display text-[10px] font-black uppercase italic text-black">
                  {t.cover}
                </span>
              )}
              <button
                type="button"
                aria-label={t.delete}
                onClick={() => onChange(files.filter((_, j) => j !== i))}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/75 text-sm text-white"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <PillButton className="text-base" disabled={files.length >= MAX_PHOTOS} onClick={() => gallery.current?.click()}>
          {t.gallery}
        </PillButton>
        <PillButton className="text-base" disabled={files.length >= MAX_PHOTOS} onClick={() => camera.current?.click()}>
          {t.camera}
        </PillButton>
      </div>
      <input ref={gallery} type="file" accept="image/*" multiple hidden onChange={(e) => add(e.target.files)} />
      <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={(e) => add(e.target.files)} />
      <p className="text-xs italic text-steel">{t.noPhotos}</p>
    </div>
  );
}
