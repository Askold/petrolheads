import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { Drivetrain, Track } from "./api/types";
import { telegramLanguage } from "./telegram";

export type Lang = "en" | "ru";

const en = {
  tabs: { garage: "My Garage", leaderboard: "Leaderboard", drivers: "Garages", admin: "Admin" },
  back: "Back",
  save: "Save",
  loading: "Loading",
  loadingGarage: "Loading garage",
  loadingTracks: "Loading tracks",
  timing: "Timing",
  somethingWrong: "Something went wrong",
  language: "Language",
  langName: "English",

  visualRating: "Rating",
  ratingBreakdown: (points: number, likes: number) => `${points} pts from leaderboards · ${likes} ♥`,
  ratingHow: "60% leaderboard positions (F1 points), 40% likes, compared with the club's best car.",
  noStats: "No specs: add power and weight",
  likeHint: "Like",
  ownCar: "Your car",
  likesCount: (n: number) => (n === 1 ? "1 like" : `${n} likes`),
  details: "Details",
  modsTitle: "Modifications",
  noMods: "Stock, no mods listed.",
  openGarage: "Open Garage",
  close: "Close",
  tapForDetails: "Tap the car for details",
  garages: "Garages",
  viewCars: "Cars",
  viewDrivers: "Drivers",
  sortBy: "Sort",
  allMakes: "All makes",
  allModels: "All models",
  resetFilter: "Reset filter",
  nothingMatches: "No cars match the filter.",
  sort: { rating: "By rating", likes: "Most liked", power: "Most powerful", newest: "Newest", name: "By name", rep: "By rep" },
  acceleration: "Acceleration",
  topSpeed: "Top Speed",
  handling: "Handling",
  onTurntable: "Putting it on the turntable…",
  status: { verified: "Verified", pending: "Pending", rejected: "Rejected" },

  myGarage: "My Garage",
  someonesGarage: (name: string) => `${name}'s Garage`,
  myCars: "My Cars",
  cars: "Cars",
  formerCars: "Previously Owned",
  soldIn: (year: string) => `Sold ${year}`,
  emptyFormer: "No former cars.",
  swipeHint: "Swipe to change car",
  emptyGarageMine: "Your garage is empty",
  noCars: "No cars yet",
  addCar: "Add Car",
  editCar: "Edit Car",
  rep: "rep",
  bioPrompt: "Tap to set your street name, crew and bio",
  bestLaps: "Best Laps",
  noLaps: "No laps logged yet.",
  streetName: "Street name",
  crew: "Crew",
  bio: "Bio",

  leaderboard: "Leaderboard",
  noVerified: "No verified laps yet",
  noResultsAnywhere: "No results on any track yet",
  beFirst: "Be the first to set a time here.",
  pos: "Pos",
  driver: "Driver",
  lapTime: "Lap Time",
  prevTrack: "Previous track",
  nextTrack: "Next track",

  logLap: "Log a Lap",
  addCarFirst: "Add a car to your garage first.",
  track: "Track",
  car: "Car",
  lapTimeLabel: "Lap time (m:ss.mmm)",
  lapFormatHint: "Use format m:ss.mmm",
  date: "Date",
  proof: "Proof",
  proofHint: "Screenshot from RaceChrono / lap timer, or a link to a video",
  proofFromGallery: "🖼 From Gallery",
  proofLink: "or paste a link: https://…",
  proofUploading: "Uploading…",
  removeProof: "Remove",
  proofNote: "Laps show on the leaderboard after an admin verifies the proof.",
  submitLap: "Submit Lap",
  addResult: "Add Your Time",

  raceControl: "Admin",
  adminSections: { laps: "Lap Review", admins: "Admins" },
  addAdmin: "Add",
  adminUsernamePlaceholder: "@username",
  adminHint: "Admins verify laps and manage this list. Someone added by username becomes admin when they next open the app.",
  adminFromConfig: "server",
  adminNotJoined: "hasn't opened the app yet",
  removeAdmin: "Remove",
  confirmRemoveAdmin: (name: string) => `Remove admin rights from ${name}?`,
  adminNote: "Verify submitted lap times. Each verified lap awards 100 rep.",
  nothingToReview: "Nothing to review.",
  noProof: "No proof attached",
  verify: "Verify",
  drivers: "Drivers",
  noDrivers: "Nobody here yet.",
  carsCount: (n: number) => (n === 1 ? "1 car" : `${n} cars`),
  noCarYet: "No car yet",
  reject: "Reject",

  tuneCar: "Tune Car",
  newCar: "New Car",
  specs: "Specs",
  findCar: "Find your car",
  findPlaceholder: "e.g. Skyline R34, Supra, Lada 2107",
  catalogNote: "Stock specs: adjust them to your build.",
  notInCatalog: "Not in the catalog. Fill in the specs below.",
  make: "Make *",
  chooseMake: "Choose make",
  chooseModel: "Choose model",
  otherMake: "Other make…",
  otherModel: "Other model…",
  backToList: "From list",
  model: "Model *",
  year: "Year",
  color: "Color",
  power: "Power (hp)",
  torque: "Torque (Nm)",
  weight: "Weight (kg)",
  drivetrain: "Drivetrain",
  drive: { FWD: "FWD", RWD: "RWD", AWD: "AWD" } as Record<Drivetrain, string>,
  mods: "Mods (one per line)",
  mainRide: "Main ride (shown on profile)",
  addToGarage: "Add to Garage",
  formerCarCheckbox: "I no longer own this car",
  soldYear: "Year sold",
  soldNote: "Saving moves the car to \"Previously Owned\". Its photos and lap times are kept.",
  markSold: "Sold",
  returnToGarage: "Back to Garage",
  deleteCar: "Delete",
  confirmDelete: (car: string) => `Delete ${car} for good, with its photos and lap times?`,
  formerTag: "sold",

  photos: "Photos",
  gallery: "🖼 Gallery",
  camera: "📷 Camera",
  uploading: "Uploading…",
  cuttingOut: "Cutting out…",
  noCutout: "No cutout",
  cover: "Cover",
  noPhotos: "No photos yet. A 3/4 front or side shot with the whole car in frame works best. The background is removed automatically.",
  setCover: "Set as Cover",
  delete: "Delete",
  tooBig: (names: string) => `${names}: larger than 15 MB, skipped`,
  sendToBot: (bot: ReactNode) => <>Or send photos to {bot} in a private chat. Location data is removed from every photo.</>,
};

type Dict = typeof en;

const ru: Dict = {
  tabs: { garage: "Мой гараж", leaderboard: "Рейтинг", drivers: "Гаражи", admin: "Админка" },
  back: "Назад",
  save: "Сохранить",
  loading: "Загрузка",
  loadingGarage: "Открываем гараж",
  loadingTracks: "Загружаем трассы",
  timing: "Хронометраж",
  somethingWrong: "Что-то пошло не так",
  language: "Язык",
  langName: "Русский",

  visualRating: "Рейтинг",
  ratingBreakdown: (points, likes) => `${points} очк. за места в рейтингах · ${likes} ♥`,
  ratingHow: "60% — места в рейтингах трасс (очки как в F1), 40% — лайки; относительно лучшей машины клуба.",
  noStats: "Нет данных: укажите мощность и массу",
  likeHint: "Нравится",
  ownCar: "Ваша машина",
  likesCount: (n) => {
    const m10 = n % 10;
    const m100 = n % 100;
    const word = m10 === 1 && m100 !== 11 ? "лайк" : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? "лайка" : "лайков";
    return `${n} ${word}`;
  },
  details: "Подробнее",
  modsTitle: "Модификации",
  noMods: "Сток, доработок не указано.",
  openGarage: "Открыть гараж",
  close: "Закрыть",
  tapForDetails: "Нажмите на машину, чтобы посмотреть детали",
  garages: "Гаражи",
  viewCars: "Машины",
  viewDrivers: "Пилоты",
  sortBy: "Сортировка",
  allMakes: "Все марки",
  allModels: "Все модели",
  resetFilter: "Сбросить фильтр",
  nothingMatches: "Нет машин по фильтру.",
  sort: { rating: "По рейтингу", likes: "По лайкам", power: "По мощности", newest: "Новые", name: "По названию", rep: "По репутации" },
  acceleration: "Разгон",
  // Short forms: the three stat labels share one row on a phone.
  topSpeed: "Скорость",
  handling: "Контроль",
  onTurntable: "Ставим на поворотный круг…",
  status: { verified: "Подтверждён", pending: "На проверке", rejected: "Отклонён" },

  myGarage: "Мой гараж",
  someonesGarage: (name) => `Гараж: ${name}`,
  myCars: "Мои машины",
  cars: "Машины",
  formerCars: "Были раньше",
  soldIn: (year) => `Продана в ${year}`,
  emptyFormer: "Бывших машин нет.",
  swipeHint: "Листайте свайпом",
  emptyGarageMine: "Ваш гараж пуст",
  noCars: "Машин пока нет",
  addCar: "Добавить",
  editCar: "Изменить",
  rep: "реп.",
  bioPrompt: "Нажмите, чтобы указать позывной, команду и пару слов о себе",
  bestLaps: "Лучшие круги",
  noLaps: "Кругов пока нет.",
  streetName: "Позывной",
  crew: "Команда",
  bio: "О себе",

  leaderboard: "Рейтинг",
  noVerified: "Подтверждённых кругов пока нет",
  noResultsAnywhere: "Пока нет результатов ни на одной трассе",
  beFirst: "Станьте первым на этой трассе.",
  pos: "Поз.",
  driver: "Пилот",
  lapTime: "Время круга",
  prevTrack: "Предыдущая трасса",
  nextTrack: "Следующая трасса",

  logLap: "Новый заезд",
  addCarFirst: "Сначала добавьте машину в гараж.",
  track: "Трасса",
  car: "Машина",
  lapTimeLabel: "Время круга (м:сс.ммм)",
  lapFormatHint: "Формат: м:сс.ммм",
  date: "Дата",
  proof: "Доказательство",
  proofHint: "Скриншот из RaceChrono / лап-таймера или ссылка на видео",
  proofFromGallery: "🖼 Из галереи",
  proofLink: "или вставьте ссылку: https://…",
  proofUploading: "Загрузка…",
  removeProof: "Убрать",
  proofNote: "Круг появится в рейтинге после проверки судьёй.",
  submitLap: "Отправить",
  addResult: "Добавить результат",

  raceControl: "Админка",
  adminSections: { laps: "Проверка кругов", admins: "Администраторы" },
  addAdmin: "Добавить",
  adminUsernamePlaceholder: "@username",
  adminHint: "Админы проверяют круги и ведут этот список. Добавленный по username станет админом, когда в следующий раз откроет приложение.",
  adminFromConfig: "сервер",
  adminNotJoined: "ещё не открывал приложение",
  removeAdmin: "Убрать",
  confirmRemoveAdmin: (name) => `Забрать права админа у ${name}?`,
  adminNote: "Проверьте присланные круги. За каждый подтверждённый круг — 100 реп.",
  nothingToReview: "Нечего проверять.",
  noProof: "Доказательство не приложено",
  verify: "Подтвердить",
  drivers: "Пилоты",
  noDrivers: "Пока никого нет.",
  carsCount: (n) => {
    const m10 = n % 10;
    const m100 = n % 100;
    const word = m10 === 1 && m100 !== 11 ? "машина" : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? "машины" : "машин";
    return `${n} ${word}`;
  },
  noCarYet: "Машины пока нет",
  reject: "Отклонить",

  tuneCar: "Тюнинг",
  newCar: "Новая машина",
  specs: "Характеристики",
  findCar: "Найдите свою машину",
  findPlaceholder: "например: Skyline R34, Supra, семёрка",
  catalogNote: "Заводские характеристики: поправьте их под свой тюнинг.",
  notInCatalog: "Нет в каталоге. Заполните характеристики ниже.",
  make: "Марка *",
  chooseMake: "Выберите марку",
  chooseModel: "Выберите модель",
  otherMake: "Другая марка…",
  otherModel: "Другая модель…",
  backToList: "Из списка",
  model: "Модель *",
  year: "Год",
  color: "Цвет",
  power: "Мощность (л.с.)",
  torque: "Момент (Нм)",
  weight: "Масса (кг)",
  drivetrain: "Привод",
  drive: { FWD: "Передний", RWD: "Задний", AWD: "Полный" },
  mods: "Доработки (по одной в строке)",
  mainRide: "Основная машина (в профиле)",
  addToGarage: "В гараж",
  formerCarCheckbox: "Это моя бывшая машина",
  soldYear: "Год продажи",
  soldNote: "После сохранения машина переедет в «Были раньше». Фото и круги сохранятся.",
  markSold: "Продана",
  returnToGarage: "Вернуть в гараж",
  deleteCar: "Удалить",
  confirmDelete: (car) => `Удалить ${car} насовсем, вместе с фото и кругами?`,
  formerTag: "продана",

  photos: "Фото",
  gallery: "🖼 Галерея",
  camera: "📷 Камера",
  uploading: "Загрузка…",
  cuttingOut: "Вырезаем…",
  noCutout: "Без выреза",
  cover: "Обложка",
  noPhotos: "Фото пока нет. Лучше всего — вид спереди-сбоку или сбоку, машина целиком в кадре. Фон удаляется автоматически.",
  setCover: "Сделать обложкой",
  delete: "Удалить",
  tooBig: (names) => `${names}: больше 15 МБ, пропущено`,
  sendToBot: (bot) => <>Или пришлите фото боту {bot} в личные сообщения. Геоданные из фото удаляются.</>,
};

const dicts: Record<Lang, Dict> = { en, ru };
const STORAGE_KEY = "lang";

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "ru") return saved;
  } catch {
    // storage unavailable (private mode etc.)
  }
  const code = telegramLanguage() ?? navigator.language;
  return code?.toLowerCase().startsWith("ru") ? "ru" : "en";
}

type Ctx = { lang: Lang; t: Dict; setLang: (l: Lang) => void };
const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const value = useMemo<Ctx>(
    () => ({
      lang,
      t: dicts[lang],
      setLang: (l) => {
        setLangState(l);
        document.documentElement.lang = l;
        try {
          localStorage.setItem(STORAGE_KEY, l);
        } catch {
          // ignore
        }
      },
    }),
    [lang],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): Ctx {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n outside I18nProvider");
  return ctx;
}

export const LANGS: Lang[] = ["en", "ru"];
export const langName = (l: Lang) => dicts[l].langName;

/** Localised track fields (Russian names come from the backend when available). */
export function trackText(track: Track, lang: Lang) {
  const ru = lang === "ru";
  return {
    name: (ru && track.nameRu) || track.name,
    layout: (ru && track.layoutRu) || track.layout,
    country: (ru && track.countryRu) || track.country,
  };
}
