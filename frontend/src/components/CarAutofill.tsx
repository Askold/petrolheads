import { useEffect, useState } from "react";
import { useCatalogSearch } from "../api/client";
import type { CatalogCar } from "../api/types";
import { useI18n } from "../i18n";
import { haptic } from "../telegram";
import { Field } from "./ui";

/** Debounced search over the stock-spec catalog; picking a result fills the car form. */
export function CarAutofill({ onPick }: { onPick: (car: CatalogCar) => void }) {
  const { t, lang } = useI18n();
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<CatalogCar | null>(null);
  const results = useCatalogSearch(query);

  useEffect(() => {
    const id = setTimeout(() => setQuery(input), 250);
    return () => clearTimeout(id);
  }, [input]);

  const showList = !picked && query.trim().length >= 2 && results.data;

  return (
    <div className="space-y-2">
      <Field label={t.findCar}>
        <input
          className="field"
          placeholder={t.findPlaceholder}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setPicked(null);
          }}
        />
      </Field>
      {showList &&
        (results.data.length === 0 ? (
          <p className="px-1 text-xs italic text-steel">{t.notInCatalog}</p>
        ) : (
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {results.data.map((c) => (
              <button
                key={`${c.make}-${c.model}`}
                onClick={() => {
                  haptic.select();
                  setPicked(c);
                  setInput(`${c.make} ${c.model}`);
                  onPick(c);
                }}
                className="flex w-full items-center justify-between gap-2 rounded-lg border-2 border-transparent bg-white/[0.06] px-2.5 py-1.5 text-left active:border-lime"
              >
                <div className="min-w-0">
                  <div className="label-white truncate text-lg normal-case leading-tight">
                    {c.make} {c.model}
                  </div>
                  <div className="text-xs text-steel">
                    {c.from}–{c.to ?? "…"} · {c.hp} {lang === "ru" ? "л.с." : "hp"} · {c.weightKg} {lang === "ru" ? "кг" : "kg"} · {t.drive[c.drivetrain]}
                  </div>
                </div>
                <span className="title-lime text-2xl">›</span>
              </button>
            ))}
          </div>
        ))}
      {picked && <p className="px-1 text-xs italic text-lime">{t.catalogNote}</p>}
    </div>
  );
}
