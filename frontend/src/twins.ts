/**
 * Badge-engineered / renamed twins counted as one car (e.g. Mazda Roadster = MX-5).
 * Makes and models are free text, so everything works on lowercased, space-collapsed strings.
 */

const norm = (s: string) => s.trim().toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ");

/** Make spellings and sister brands folded into one make. */
const MAKE_ALIASES: Record<string, string> = {
  vaz: "lada",
  ваз: "lada",
  лада: "lada",
  vw: "volkswagen",
  mercedes: "mercedes-benz",
  "mercedes-amg": "mercedes-benz",
  "mercedes benz": "mercedes-benz",
  мерседес: "mercedes-benz",
  škoda: "skoda",
  dacia: "renault",
  eunos: "mazda",
  scion: "toyota",
  acura: "honda",
  ravon: "chevrolet",
};

/** Proper-case labels for canonical makes shown in the filter. */
const MAKE_LABELS: Record<string, string> = {
  lada: "Lada",
  volkswagen: "Volkswagen",
  "mercedes-benz": "Mercedes-Benz",
  skoda: "Skoda",
  renault: "Renault",
  mazda: "Mazda",
  toyota: "Toyota",
  honda: "Honda",
  chevrolet: "Chevrolet",
  mitsubishi: "Mitsubishi",
};

type Rule = {
  /** Original (pre-alias) makes the rule applies to. */
  makes: string[];
  /** Matched at the start of the model; the rest of the model (generation etc.) is kept. */
  model: RegExp;
  to: { make: string; model: string };
};

const RULES: Rule[] = [
  { makes: ["mazda", "eunos"], model: /^(eunos roadster|roadster|miata|mx ?-?5)\b/, to: { make: "mazda", model: "MX-5" } },
  { makes: ["toyota", "scion"], model: /^(gt ?-?86|ft ?-?86|86|fr ?-?s)(?=\s|$)/, to: { make: "toyota", model: "GT86" } },
  { makes: ["acura", "honda"], model: /^nsx\b/, to: { make: "honda", model: "NSX" } },
  { makes: ["acura", "honda"], model: /^(integra|rsx)\b/, to: { make: "honda", model: "Integra" } },
  { makes: ["mitsubishi", "dodge"], model: /^(3000 ?gt|gto|stealth)\b/, to: { make: "mitsubishi", model: "3000GT" } },
  { makes: ["mitsubishi"], model: /^(lancer )?evo(lution)?\b/, to: { make: "mitsubishi", model: "Lancer Evolution" } },
  { makes: ["lada", "vaz", "ваз", "лада"], model: /^(niva legend|niva 4x4|нива|niva|2121)(?=\s|$)/, to: { make: "lada", model: "Niva 4x4" } },
  { makes: ["chevrolet"], model: /^(niva|нива)\b/, to: { make: "lada", model: "Niva Travel" } },
  { makes: ["daewoo", "ravon", "chevrolet"], model: /^(gentra|lacetti)\b/, to: { make: "chevrolet", model: "Lacetti" } },
];

export type CanonicalCar = { makeKey: string; makeLabel: string; modelKey: string; modelLabel: string };

/** Folds a car's make/model into its twin group. Keys are for comparing, labels for display. */
export function canonicalCar(make: string, model: string): CanonicalCar {
  const m = norm(make);
  const mod = model.trim().replace(/\s+/g, " ");
  const modNorm = norm(model);

  for (const r of RULES) {
    if (!r.makes.includes(m)) continue;
    const hit = modNorm.match(r.model);
    if (!hit) continue;
    const rest = mod.slice(hit[0].length).trim();
    const label = rest ? `${r.to.model} ${rest}` : r.to.model;
    return { makeKey: r.to.make, makeLabel: MAKE_LABELS[r.to.make] ?? r.to.make, modelKey: norm(label), modelLabel: label };
  }

  const makeKey = MAKE_ALIASES[m] ?? m;
  return {
    makeKey,
    makeLabel: MAKE_LABELS[makeKey] ?? make.trim(),
    modelKey: modNorm,
    modelLabel: mod,
  };
}
