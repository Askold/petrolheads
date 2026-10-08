import { motion } from "motion/react";
import { useState } from "react";
import { useDrivers, useFeed } from "../api/client";
import type { Car, Driver, FeedCar } from "../api/types";
import { CarDetailsSheet } from "../components/CarDetailsSheet";
import { type CarFilter, MakeModelFilter, matchesFilter, NO_FILTER } from "../components/MakeModelFilter";
import { Silhouette } from "../components/GarageStage";
import { ErrorBox, Loader, ScreenHeader, Switcher } from "../components/ui";
import { carTitle, coverPhoto, displayName } from "../format";
import { useI18n } from "../i18n";

type View = "cars" | "drivers";
type CarSort = "rating" | "likes" | "power" | "newest" | "name";
type DriverSort = "rep" | "likes" | "name";

const CAR_SORTS: CarSort[] = ["rating", "likes", "power", "newest", "name"];
const DRIVER_SORTS: DriverSort[] = ["rep", "likes", "name"];

const carSorters: Record<CarSort, (a: FeedCar, b: FeedCar) => number> = {
  rating: (a, b) => b.car.rating - a.car.rating || b.car.likes - a.car.likes,
  likes: (a, b) => b.car.likes - a.car.likes || b.car.id - a.car.id,
  power: (a, b) => (b.car.hp ?? -1) - (a.car.hp ?? -1),
  newest: (a, b) => b.car.id - a.car.id,
  name: (a, b) => carTitle(a.car).localeCompare(carTitle(b.car)),
};

const driverSorters: Record<DriverSort, (a: Driver, b: Driver) => number> = {
  rep: (a, b) => b.user.rep - a.user.rep,
  likes: (a, b) => b.likes - a.likes || b.user.rep - a.user.rep,
  name: (a, b) => displayName(a.user).localeCompare(displayName(b.user)),
};

const cycle = <T,>(list: T[], value: T, d: number) => list[(list.indexOf(value) + d + list.length) % list.length];

/** Cutout on a mini turntable glow, or the raw cover photo, or the make initial. */
function CarImage({ car, fallback }: { car: Car | null; fallback: string }) {
  const cover = car ? coverPhoto(car) : null;
  if (cover?.cutoutStatus === "done" && cover.cutoutUrl) {
    return (
      <div className="relative flex h-full items-end justify-center">
        <div className="absolute bottom-1 h-4 w-4/5 rounded-[50%] bg-black/80 blur-sm" />
        <img src={cover.cutoutUrl} alt="" loading="lazy" className="relative max-h-full max-w-full object-contain" />
      </div>
    );
  }
  if (cover) return <img src={cover.url} alt="" loading="lazy" className="h-full w-full object-cover" />;
  if (car) {
    return (
      <div className="flex h-full items-end justify-center px-2 pb-1">
        <Silhouette />
      </div>
    );
  }
  return <span className="title-lime flex h-full items-center justify-center text-3xl">{fallback}</span>;
}

export function GaragesScreen({
  meId,
  onOpenUser,
}: {
  meId?: number;
  onOpenUser: (userId: number, carId?: number) => void;
}) {
  const { t, lang } = useI18n();
  const [view, setView] = useState<View>("cars");
  const [carSort, setCarSort] = useState<CarSort>("rating");
  const [driverSort, setDriverSort] = useState<DriverSort>("rep");
  const [details, setDetails] = useState<FeedCar | null>(null);
  const [filter, setFilter] = useState<CarFilter>(NO_FILTER);
  const feed = useFeed();
  const drivers = useDrivers();

  // Keep the open sheet in sync with refetched data (e.g. after liking).
  const detailsCar = details ? (feed.data?.find((f) => f.car.id === details.car.id) ?? details) : null;

  const toggleView = () => setView((v) => (v === "cars" ? "drivers" : "cars"));
  const sortLabel = view === "cars" ? t.sort[carSort] : t.sort[driverSort];
  const stepSort = (d: number) =>
    view === "cars" ? setCarSort((s) => cycle(CAR_SORTS, s, d)) : setDriverSort((s) => cycle(DRIVER_SORTS, s, d));

  return (
    <div className="space-y-2">
      <ScreenHeader title={t.garages}>
        <div className="mt-2 flex flex-col items-center gap-1.5">
          <Switcher
            label={<span className="inline-block w-32">{view === "cars" ? t.viewCars : t.viewDrivers}</span>}
            onPrev={toggleView}
            onNext={toggleView}
          />
          <div className="frost flex w-full items-center justify-between px-2 py-1">
            <span className="font-display text-base font-semibold not-italic text-[#2c2c30]/85">{t.sortBy}</span>
            <Switcher
              label={<span className="inline-block w-32 !text-[#1c1c20]" style={{ textShadow: "none" }}>{sortLabel}</span>}
              onPrev={() => stepSort(-1)}
              onNext={() => stepSort(1)}
            />
          </div>
          <div className="w-full">
            <MakeModelFilter
              cars={view === "cars" ? (feed.data ?? []).map((f) => f.car) : (drivers.data ?? []).flatMap((d) => (d.mainCar ? [d.mainCar] : []))}
              value={filter}
              onChange={setFilter}
            />
          </div>
        </div>
      </ScreenHeader>

      {view === "cars" ? (
        feed.isPending ? (
          <Loader />
        ) : feed.isError ? (
          <ErrorBox error={feed.error} />
        ) : feed.data.length === 0 ? (
          <div className="strip px-4 py-6 text-center text-sm italic text-steel">{t.noDrivers}</div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {feed.data.every((f) => !matchesFilter(f.car, filter)) && (
              <div className="strip col-span-2 px-4 py-6 text-center text-sm italic text-steel">{t.nothingMatches}</div>
            )}
            {feed.data.filter((f) => matchesFilter(f.car, filter)).sort(carSorters[carSort]).map((f, i) => (
              <motion.button
                key={f.car.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i, 8) * 0.03 }}
                onClick={() => setDetails(f)}
                className={`strip overflow-hidden text-left ${f.owner.id === meId ? "lime-frame" : "border-2 border-transparent"}`}
              >
                <div className="stage-light h-24 bg-gradient-to-b from-white/[0.02] to-white/[0.07] px-1 pt-1">
                  <CarImage car={f.car} fallback={f.car.make[0]} />
                </div>
                <div className="px-2 pb-2 pt-1">
                  <div className="truncate text-xs text-steel">{f.car.make}</div>
                  <div className="label-white truncate text-lg normal-case leading-tight">{f.car.model}</div>
                  <div className="mt-0.5 flex items-center justify-between gap-1 text-xs">
                    <span className="truncate italic text-steel">{displayName(f.owner)}</span>
                    <span className={`shrink-0 ${f.car.likedByMe ? "text-neon-pink" : "text-white/80"}`}>
                      {f.car.likedByMe ? "♥" : "♡"} {f.car.likes}
                    </span>
                  </div>
                  {carSort === "rating" && <div className="title-lime text-sm">{f.car.rating.toFixed(2)} ★</div>}
                  {carSort === "power" && f.car.hp != null && (
                    <div className="title-lime text-sm">
                      {f.car.hp} {lang === "ru" ? "л.с." : "hp"}
                    </div>
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        )
      ) : drivers.isPending ? (
        <Loader />
      ) : drivers.isError ? (
        <ErrorBox error={drivers.error} />
      ) : (
        <div className="strip space-y-1 p-1.5">
          {drivers.data.every((d) => !matchesFilter(d.mainCar, filter)) && (
            <div className="px-4 py-6 text-center text-sm italic text-steel">{t.nothingMatches}</div>
          )}
          {drivers.data.filter((d) => matchesFilter(d.mainCar, filter)).sort(driverSorters[driverSort]).map((d, i) => (
            <motion.button
              key={d.user.id}
              layout
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(i, 10) * 0.03 }}
              onClick={() => onOpenUser(d.user.id)}
              className={`flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left ${
                d.user.id === meId ? "lime-frame bg-black/40" : "border-2 border-transparent bg-white/[0.04]"
              }`}
            >
              <div className="h-14 w-24 shrink-0 overflow-hidden rounded-md bg-gradient-to-b from-white/[0.03] to-white/[0.08]">
                <CarImage car={d.mainCar} fallback={displayName(d.user)[0]} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="label-white truncate text-xl normal-case leading-tight">
                  {displayName(d.user)}
                  {d.user.crew && <span className="ml-1.5 text-sm text-steel">[{d.user.crew}]</span>}
                </div>
                <div className="truncate text-xs text-steel">
                  {d.mainCar ? carTitle(d.mainCar) : t.noCarYet}
                  {d.carCount > 1 && ` · ${t.carsCount(d.carCount)}`}
                </div>
              </div>
              <div className="shrink-0 text-right">
                {driverSort === "likes" ? (
                  <>
                    <div className="text-xl leading-none text-neon-pink">♥ {d.likes}</div>
                    <div className="text-[11px] italic text-steel">{t.likesCount(d.likes).replace(/^\d+\s*/, "")}</div>
                  </>
                ) : (
                  <>
                    <div className="title-lime text-xl leading-none">{d.user.rep.toLocaleString(lang)}</div>
                    <div className="text-[11px] italic text-steel">{t.rep}</div>
                  </>
                )}
              </div>
            </motion.button>
          ))}
        </div>
      )}

      <CarDetailsSheet
        car={detailsCar?.car ?? null}
        own={detailsCar?.owner.id === meId}
        onClose={() => setDetails(null)}
        onOpenGarage={
          detailsCar
            ? () => {
                const { owner, car } = detailsCar;
                setDetails(null);
                onOpenUser(owner.id, car.id);
              }
            : undefined
        }
      />
    </div>
  );
}
