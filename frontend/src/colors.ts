import type { Lang } from "./i18n";

/** Car colours offered in the picker. `key` is what's stored; labels are per language. */
export const CAR_COLORS = [
  { key: "White", hex: "#f4f4f4", ru: "Белый" },
  { key: "Black", hex: "#111111", ru: "Чёрный" },
  { key: "Silver", hex: "#c0c4ca", ru: "Серебристый" },
  { key: "Grey", hex: "#6b6f76", ru: "Серый" },
  { key: "Red", hex: "#d21f2b", ru: "Красный" },
  { key: "Burgundy", hex: "#6d1424", ru: "Бордовый" },
  { key: "Orange", hex: "#f2700f", ru: "Оранжевый" },
  { key: "Yellow", hex: "#f5d10f", ru: "Жёлтый" },
  { key: "Gold", hex: "#c9a646", ru: "Золотой" },
  { key: "Green", hex: "#2f9e44", ru: "Зелёный" },
  { key: "Light Blue", hex: "#5ab4f0", ru: "Голубой" },
  { key: "Blue", hex: "#1f4fd1", ru: "Синий" },
  { key: "Dark Blue", hex: "#16224f", ru: "Тёмно-синий" },
  { key: "Purple", hex: "#7a3fc4", ru: "Фиолетовый" },
  { key: "Pink", hex: "#ee6aa7", ru: "Розовый" },
  { key: "Brown", hex: "#6b4429", ru: "Коричневый" },
  { key: "Beige", hex: "#d9c7a3", ru: "Бежевый" },
  { key: "Other", hex: "conic-gradient(#d21f2b, #f5d10f, #2f9e44, #1f4fd1, #7a3fc4, #d21f2b)", ru: "Другой" },
] as const;

export type CarColor = (typeof CAR_COLORS)[number];

/** Finds a palette colour by stored key or by its Russian name (older free-text values). */
export function findColor(value: string | null | undefined): CarColor | undefined {
  if (!value) return undefined;
  const v = value.trim().toLowerCase().replace(/ё/g, "е");
  return CAR_COLORS.find((c) => c.key.toLowerCase() === v || c.ru.toLowerCase().replace(/ё/g, "е") === v);
}

/** Display name in the current language; unknown free-text colours are shown as typed. */
export function colorLabel(value: string | null | undefined, lang: Lang): string | null {
  if (!value) return null;
  const c = findColor(value);
  if (!c) return value;
  return lang === "ru" ? c.ru : c.key;
}
