import { useMemo } from "react";
import { useI18n } from "../i18n";
import { canonicalCar } from "../twins";

export type CarFilter = { make: string; model: string };
export const NO_FILTER: CarFilter = { make: "", model: "" };

/** Filter keys come from canonicalCar, so twins (Roadster = MX-5) and spelling variants group together. */
export function matchesFilter(car: { make: string; model: string } | null | undefined, f: CarFilter): boolean {
  if (!f.make) return true;
  if (!car) return false;
  const c = canonicalCar(car.make, car.model);
  if (c.makeKey !== f.make) return false;
  return !f.model || c.modelKey === f.model;
}

type Option = { key: string; label: string; count: number };

function options(values: { key: string; label: string }[]): Option[] {
  const byKey = new Map<string, Option>();
  for (const v of values) {
    const o = byKey.get(v.key);
    if (o) o.count++;
    else byKey.set(v.key, { key: v.key, label: v.label, count: 1 });
  }
  return [...byKey.values()].sort((a, b) => a.label.localeCompare(b.label));
}

/** Make → model dropdowns built from the cars on screen, each option with its count. */
export function MakeModelFilter({
  cars,
  value,
  onChange,
}: {
  cars: { make: string; model: string }[];
  value: CarFilter;
  onChange: (f: CarFilter) => void;
}) {
  const { t } = useI18n();
  const canon = useMemo(() => cars.map((c) => canonicalCar(c.make, c.model)), [cars]);
  const makes = useMemo(() => options(canon.map((c) => ({ key: c.makeKey, label: c.makeLabel }))), [canon]);
  const models = useMemo(
    () =>
      value.make
        ? options(canon.filter((c) => c.makeKey === value.make).map((c) => ({ key: c.modelKey, label: c.modelLabel })))
        : [],
    [canon, value.make],
  );
  const active = value.make !== "";

  return (
    <div className="flex items-center gap-2">
      <select
        aria-label={t.allMakes}
        className={`field min-w-0 flex-1 py-1.5 text-sm ${active ? "!border-lime" : ""}`}
        value={value.make}
        onChange={(e) => onChange({ make: e.target.value, model: "" })}
      >
        <option value="">{t.allMakes}</option>
        {makes.map((o) => (
          <option key={o.key} value={o.key}>
            {o.label} ({o.count})
          </option>
        ))}
      </select>
      <select
        aria-label={t.allModels}
        className={`field min-w-0 flex-1 py-1.5 text-sm ${value.model ? "!border-lime" : ""}`}
        value={value.model}
        disabled={!active}
        onChange={(e) => onChange({ ...value, model: e.target.value })}
      >
        <option value="">{t.allModels}</option>
        {models.map((o) => (
          <option key={o.key} value={o.key}>
            {o.label} ({o.count})
          </option>
        ))}
      </select>
      {active && (
        <button
          type="button"
          aria-label={t.resetFilter}
          onClick={() => onChange(NO_FILTER)}
          className="circle-arrow h-8 w-8 shrink-0 text-sm"
        >
          ✕
        </button>
      )}
    </div>
  );
}
