import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { useMyProfile } from "./api/client";
import type { Car } from "./api/types";
import { BottomBar, type BarItem } from "./components/BottomBar";
import { MusicPlayer } from "./components/MusicPlayer";
import { GaragesScreen } from "./screens/GaragesScreen";
import { LapFormScreen } from "./screens/LapFormScreen";
import { AdminScreen } from "./screens/AdminScreen";
import { CarFormScreen } from "./screens/CarFormScreen";
import { LeaderboardScreen } from "./screens/LeaderboardScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { useI18n } from "./i18n";
import { bindBackButton } from "./telegram";

type Tab = "profile" | "leaderboard" | "drivers" | "admin";

/** Screens pushed on top of a tab; Telegram's back button pops them. */
type Overlay = { kind: "car"; car: Car | null } | { kind: "user"; userId: number; carId?: number } | { kind: "lap"; trackId?: number };

export default function App() {
  const [tab, setTab] = useState<Tab>("profile");
  const [stack, setStack] = useState<Overlay[]>([]);
  const me = useMyProfile();
  const { t } = useI18n();

  const push = (o: Overlay) => setStack((s) => [...s, o]);
  const pop = () => setStack((s) => s.slice(0, -1));
  const top = stack.at(-1);
  const openUser = (userId: number, carId?: number) =>
    userId === me.data?.user.id ? setTab("profile") : push({ kind: "user", userId, carId });

  useEffect(() => bindBackButton(top ? pop : null), [top]);

  const tabs: BarItem<Tab>[] = [
    { id: "profile", label: t.tabs.garage },
    { id: "leaderboard", label: t.tabs.leaderboard },
    { id: "drivers", label: t.tabs.drivers },
    ...(me.data?.isAdmin ? [{ id: "admin" as Tab, label: t.tabs.admin }] : []),
  ];

  const screenKey = top ? `${top.kind}-${stack.length}` : tab;
  useEffect(() => {
    // Block body: newer browsers return a Promise from scrollTo, which React would treat as a cleanup.
    window.scrollTo(0, 0);
  }, [screenKey]);

  return (
    <div className="min-h-screen">
      <div className="alley-bg" aria-hidden />
      <main className="relative z-10 mx-auto max-w-xl px-3 pb-36 pt-3">
        {!top && <img src="/brand/wordmark.png" alt="Petrolheads" className="mx-auto mb-2 h-9 drop-shadow-[0_0_8px_rgb(255_90_135/0.45)]" />}
        <AnimatePresence mode="wait">
          <motion.div
            key={screenKey}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {top?.kind === "car" ? (
              <CarFormScreen
                car={top.car}
                onDone={pop}
                onCreated={(car) => setStack((s) => [...s.slice(0, -1), { kind: "car", car }])}
              />
            ) : top?.kind === "user" ? (
              <ProfileScreen userId={top.userId} initialCarId={top.carId} onEditCar={(car) => push({ kind: "car", car })} />
            ) : top?.kind === "lap" ? (
              <LapFormScreen initialTrackId={top.trackId} onDone={pop} onAddCar={() => push({ kind: "car", car: null })} />
            ) : tab === "profile" ? (
              <ProfileScreen onEditCar={(car) => push({ kind: "car", car })} />
            ) : tab === "leaderboard" ? (
              <LeaderboardScreen onOpenUser={openUser} onAddLap={(trackId) => push({ kind: "lap", trackId })} />
            ) : tab === "drivers" ? (
              <GaragesScreen meId={me.data?.user.id} onOpenUser={openUser} />
            ) : (
              <AdminScreen />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <MusicPlayer />
      <BottomBar items={tabs} active={tab} onChange={setTab} onBack={top ? pop : undefined} />
    </div>
  );
}
