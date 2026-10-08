import { CAR_COLORS, colorLabel, findColor } from "../colors";
import { useI18n } from "../i18n";
import { haptic } from "../telegram";

/** Swatch grid; tapping the selected swatch again clears the colour. */
export function ColorPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { lang } = useI18n();
  const selected = findColor(value);
  // A colour typed before the picker existed stays selectable as-is.
  const legacy = value && !selected ? value : null;

  return (
    <div>
      <div className="grid grid-cols-6 gap-2">
        {CAR_COLORS.map((c) => {
          const active = selected?.key === c.key;
          return (
            <button
              key={c.key}
              type="button"
              aria-label={colorLabel(c.key, lang) ?? c.key}
              aria-pressed={active}
              onClick={() => {
                haptic.select();
                onChange(active ? "" : c.key);
              }}
              className={`aspect-square rounded-full border-2 transition ${
                active ? "scale-110 border-lime shadow-[0_0_10px_rgb(185_240_95/0.7)]" : "border-white/25"
              }`}
              style={{ background: c.hex }}
            />
          );
        })}
      </div>
      <div className="mt-1.5 min-h-5 text-sm italic text-lime">
        {selected ? colorLabel(selected.key, lang) : legacy ? `${legacy}` : ""}
      </div>
    </div>
  );
}
