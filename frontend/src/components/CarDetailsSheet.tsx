import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { createPortal } from "react-dom";
import type { Car } from "../api/types";
import { colorLabel, findColor } from "../colors";
import { carTitle } from "../format";
import { useI18n } from "../i18n";
import { LikeButton } from "./LikeButton";
import { PillButton } from "./ui";

type Props = {
  car: Car | null;
  own: boolean;
  onClose: () => void;
  /** Shown when opened from the club grid: jump to the owner's garage. */
  onOpenGarage?: () => void;
};

/** Bottom sheet with a car's specs, modifications and photos. */
export function CarDetailsSheet({ car, own, onClose, onOpenGarage }: Props) {
  const { t, lang } = useI18n();
  const [photo, setPhoto] = useState<string | null>(null);
  const unit = (en: string, ru: string) => (lang === "ru" ? ru : en);

  // Portal: <main> is its own stacking context, so the sheet must live at body level to cover the bottom bar.
  return createPortal(
    <AnimatePresence>
      {car && (
        <motion.div className="fixed inset-0 z-50 flex items-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/70" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-label={carTitle(car)}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => (info.offset.y > 100 || info.velocity.y > 500) && onClose()}
            className="relative mx-auto max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-t-2xl border-t-2 border-lime/60 bg-[#0d0d10] px-4 pb-[max(env(safe-area-inset-bottom),16px)] pt-2"
          >
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-white/25" />
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate font-display text-lg text-steel">{car.make}</div>
                <h2 className="title-lime text-3xl leading-none">{car.model}</h2>
              </div>
              <LikeButton car={car} own={own} />
            </div>

            <div className="strip mt-3 px-3 py-2">
              <div className="flex items-baseline justify-between gap-2">
                <span className="title-lime text-xl">{t.visualRating}</span>
                <span className="label-white text-2xl">{car.rating.toFixed(2)} ★</span>
              </div>
              <div className="text-sm text-white/85">{t.ratingBreakdown(car.lapPoints, car.likes)}</div>
              <div className="mt-0.5 text-[11px] italic text-steel">{t.ratingHow}</div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              {[
                [t.year, car.year],
                [t.power, car.hp && `${car.hp} ${unit("hp", "л.с.")}`],
                [t.torque, car.torqueNm && `${car.torqueNm} ${unit("Nm", "Нм")}`],
                [t.weight, car.weightKg && `${car.weightKg} ${unit("kg", "кг")}`],
                [t.drivetrain, car.drivetrain && t.drive[car.drivetrain]],
                [
                  t.color,
                  car.color && (
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="inline-block h-3 w-3 shrink-0 rounded-full border border-white/40"
                        style={{ background: findColor(car.color)?.hex ?? "transparent" }}
                      />
                      {colorLabel(car.color, lang)}
                    </span>
                  ),
                ],
              ].map(([label, value]) => (
                <div key={String(label)} className="strip px-1 py-2">
                  <div className="truncate text-[10px] uppercase text-steel">{String(label).replace(/\s*\(.*\)|\s*\*/g, "")}</div>
                  <div className="label-white truncate text-lg normal-case leading-tight">{value || "—"}</div>
                </div>
              ))}
            </div>

            <h3 className="title-lime mt-4 text-2xl">{t.modsTitle}</h3>
            {car.mods.length === 0 ? (
              <p className="text-sm italic text-steel">{t.noMods}</p>
            ) : (
              <ul className="mt-1 space-y-1">
                {car.mods.map((m, i) => (
                  <li key={i} className="strip flex items-center gap-2 px-3 py-1.5">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-bar shadow-[0_0_6px_rgb(124_204_53/0.8)]" />
                    <span className="label-white text-lg normal-case">{m}</span>
                  </li>
                ))}
              </ul>
            )}

            {car.photos.length > 0 && (
              <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1">
                {car.photos.map((p) => (
                  <button key={p.id} onClick={() => setPhoto(p.url)} className="shrink-0">
                    <img src={p.url} alt="" loading="lazy" className="h-24 w-36 rounded-md border border-white/15 object-cover" />
                  </button>
                ))}
              </div>
            )}

            <div className="mt-4 flex justify-end gap-3">
              {onOpenGarage && <PillButton onClick={onOpenGarage}>{t.openGarage}</PillButton>}
              <PillButton onClick={onClose}>{t.close}</PillButton>
            </div>
          </motion.div>

          <AnimatePresence>
            {photo && (
              <motion.button
                className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 p-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setPhoto(null)}
                aria-label={t.close}
              >
                <img src={photo} alt="" className="max-h-full max-w-full object-contain" />
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
