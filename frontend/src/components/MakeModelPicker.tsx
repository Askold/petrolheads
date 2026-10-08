import { useMemo, useState } from "react";
import { useCatalog } from "../api/client";
import type { CatalogCar } from "../api/types";
import { useI18n } from "../i18n";
import { Field } from "./ui";

const OTHER = "__other";

type Props = {
  make: string;
  model: string;
  onChange: (make: string, model: string) => void;
  /** Called when a catalog model is picked, to fill in stock specs. */
  onPickCatalog: (car: CatalogCar) => void;
};

/**
 * Make and model chosen from the catalog, with an "Other…" escape hatch to type a car
 * that isn't listed. Cars saved before the picker existed open in typed mode.
 */
export function MakeModelPicker({ make, model, onChange, onPickCatalog }: Props) {
  const { t } = useI18n();
  const catalog = useCatalog();
  const cars = catalog.data ?? [];

  const makes = useMemo(() => [...new Set(cars.map((c) => c.make))].sort((a, b) => a.localeCompare(b)), [cars]);
  const models = useMemo(() => cars.filter((c) => c.make === make), [cars, make]);

  const makeListed = makes.includes(make);
  const modelListed = models.some((c) => c.model === model);
  // Typed mode when the user chose "Other…" or the saved value isn't in the catalog.
  const [customMake, setCustomMake] = useState(false);
  const [customModel, setCustomModel] = useState(false);
  const typedMake = customMake || (catalog.isSuccess && make !== "" && !makeListed);
  const typedModel = typedMake || customModel || (catalog.isSuccess && model !== "" && !modelListed);

  const backLink = (onClick: () => void) => (
    <button type="button" onClick={onClick} className="mt-1 text-xs italic text-lime underline">
      {t.backToList}
    </button>
  );

  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label={t.make}>
        {typedMake ? (
          <>
            <input className="field" placeholder="Nissan" value={make} onChange={(e) => onChange(e.target.value, model)} />
            {backLink(() => {
              setCustomMake(false);
              setCustomModel(false);
              onChange("", "");
            })}
          </>
        ) : (
          <select
            className="field"
            value={makeListed ? make : ""}
            disabled={catalog.isPending}
            onChange={(e) => {
              if (e.target.value === OTHER) {
                setCustomMake(true);
                onChange("", "");
              } else {
                setCustomModel(false);
                onChange(e.target.value, "");
              }
            }}
          >
            <option value="" disabled>
              {t.chooseMake}
            </option>
            {makes.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
            <option value={OTHER}>{t.otherMake}</option>
          </select>
        )}
      </Field>

      <Field label={t.model}>
        {typedModel ? (
          <>
            <input
              className="field"
              placeholder="Skyline GT-R R34"
              value={model}
              disabled={!make.trim()}
              onChange={(e) => onChange(make, e.target.value)}
            />
            {!typedMake &&
              backLink(() => {
                setCustomModel(false);
                onChange(make, "");
              })}
          </>
        ) : (
          <select
            className="field"
            value={modelListed ? model : ""}
            disabled={!make}
            onChange={(e) => {
              if (e.target.value === OTHER) {
                setCustomModel(true);
                onChange(make, "");
                return;
              }
              const picked = models.find((c) => c.model === e.target.value);
              if (picked) onPickCatalog(picked);
            }}
          >
            <option value="" disabled>
              {t.chooseModel}
            </option>
            {models.map((c) => (
              <option key={c.model} value={c.model}>
                {c.model} ({c.from}–{c.to ?? "…"})
              </option>
            ))}
            <option value={OTHER}>{t.otherModel}</option>
          </select>
        )}
      </Field>
    </div>
  );
}
