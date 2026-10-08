import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { useMyProfile, useProfile, useUpdateProfile } from "../api/client";
import type { Car, Profile } from "../api/types";
import { CarDetailsSheet } from "../components/CarDetailsSheet";
import { GarageStage } from "../components/GarageStage";
import {
  CircleArrow,
  Dots,
  EmptyEmblem,
  ErrorBox,
  Field,
  Loader,
  Panel,
  PillButton,
  ScreenHeader,
  SectionTitle,
  StatusBadge,
  Switcher,
} from "../components/ui";
import { displayName, formatLap } from "../format";
import { LANGS, langName, trackText, useI18n } from "../i18n";
import { haptic } from "../telegram";

type Props = {
  userId?: number;
  /** Car to show first (e.g. when opened from the club grid). */
  initialCarId?: number;
  onEditCar: (car: Car | null) => void;
};

export function ProfileScreen({ userId, initialCarId, onEditCar }: Props) {
  const mine = useMyProfile();
  const other = useProfile(userId);
  const query = userId == null ? mine : other;
  const { t } = useI18n();

  if (query.isPending) return <Loader label={t.loadingGarage} />;
  if (query.isError) return <ErrorBox error={query.error} />;
  return <ProfileView profile={query.data} initialCarId={initialCarId} onEditCar={onEditCar} />;
}

/** Frosted band: make tile in a lime frame next to a big faded make/model watermark. */
function CarSelector({ car, onPrev, onNext }: { car: Car; onPrev: () => void; onNext: () => void }) {
  return (
    <div className="frost mt-2.5 flex items-center gap-2 px-2 py-2">
      <CircleArrow dir="left" onClick={onPrev} />
      <AnimatePresence mode="wait">
        <motion.div
          key={car.id}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.18 }}
          className="flex min-w-0 flex-1 items-center gap-3"
        >
          <div className="lime-frame flex h-[58px] w-[78px] shrink-0 items-center justify-center bg-[#2a2a2d]/90 px-1">
            <span className="truncate font-display text-xl font-semibold uppercase not-italic tracking-wide text-white/90">
              {car.make}
            </span>
          </div>
          <div className="min-w-0 leading-none">
            <div className="truncate font-display text-xl font-semibold not-italic text-[#2c2c30]/80">{car.make}</div>
            <div className="line-clamp-2 font-display text-[26px] font-bold uppercase not-italic leading-[0.95] tracking-tight text-[#2c2c30]/85">
              {car.model}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
      <CircleArrow dir="right" onClick={onNext} />
    </div>
  );
}

function ProfileView({
  profile,
  initialCarId,
  onEditCar,
}: {
  profile: Profile;
  initialCarId?: number;
  onEditCar: Props["onEditCar"];
}) {
  const { user, cars, personalBests, isMe } = profile;
  const { t, lang, setLang } = useI18n();
  const current = cars.filter((c) => c.soldAt == null);
  const former = cars.filter((c) => c.soldAt != null);
  /** Header switcher toggles between the current garage and previously owned cars. */
  const [view, setView] = useState<"current" | "former">("current");
  const list = view === "current" ? current : former;
  const [index, setIndex] = useState(() => {
    const wanted = current.findIndex((c) => c.id === initialCarId);
    return wanted >= 0 ? wanted : Math.max(0, current.findIndex((c) => c.isMain));
  });
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const car: Car | undefined = list[Math.min(index, list.length - 1)];
  const step = (d: number) => list.length > 1 && setIndex((i) => (i + d + list.length) % list.length);
  const toggleView = () => {
    setView((v) => (v === "current" ? "former" : "current"));
    setIndex(0);
  };
  const viewLabel = view === "former" ? t.formerCars : isMe ? t.myCars : t.cars;

  return (
    <div className="space-y-2">
      <ScreenHeader
        title={isMe ? t.myGarage : t.someonesGarage(displayName(user))}
        progress={list.length > 1 ? index / (list.length - 1) : list.length ? 0.5 : undefined}
      >
        {/* Own row: on a phone the title and the switcher don't fit side by side. */}
        <div className="mt-2 flex justify-center">
          {former.length > 0 ? (
            <Switcher label={<span className="inline-block w-36">{viewLabel}</span>} onPrev={toggleView} onNext={toggleView} />
          ) : (
            <span className="label-white text-lg normal-case">{viewLabel}</span>
          )}
        </div>
        {car && <CarSelector car={car} onPrev={() => step(-1)} onNext={() => step(1)} />}
      </ScreenHeader>

      {car ? (
        <>
          <GarageStage
            car={car}
            own={isMe}
            onPrev={() => step(-1)}
            onNext={() => step(1)}
            onTap={() => setDetailsOpen(true)}
          />
          {list.length > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Dots count={list.length} active={index} />
              <span className="text-[11px] italic text-steel">{t.swipeHint}</span>
            </div>
          )}
          <p className="text-center text-[11px] italic text-steel">{t.tapForDetails}</p>
          <CarDetailsSheet car={detailsOpen ? car : null} own={isMe} onClose={() => setDetailsOpen(false)} />
        </>
      ) : (
        <div className="strip flex flex-col items-center gap-3 px-4 py-8 text-center">
          <EmptyEmblem />
          <span className="title-lime text-2xl">
            {view === "former" ? t.emptyFormer : isMe ? t.emptyGarageMine : t.noCars}
          </span>
          {isMe && view === "current" && <PillButton onClick={() => onEditCar(null)}>{t.addCar}</PillButton>}
        </div>
      )}

      {/* Driver bar, like the player name box at the bottom-left of the menus */}
      <div className="strip flex items-stretch">
        <div className="flex min-w-0 flex-1 items-center gap-3 border-r border-white/15 px-3 py-2.5">
          {user.photoUrl && <img src={user.photoUrl} alt="" className="h-11 w-11 shrink-0 rounded-md object-cover" />}
          <div className="min-w-0">
            <div className="label-white truncate text-2xl normal-case leading-none">{displayName(user)}</div>
            <div className="truncate text-sm italic text-steel">
              {user.crew ? `${user.crew} · ` : ""}
              <span className="text-lime">
                {user.rep.toLocaleString(lang)} {t.rep}
              </span>
            </div>
          </div>
        </div>
        {isMe && (
          <div className="flex flex-col justify-center gap-2 px-3 py-2.5">
            {car && <PillButton className="py-1 text-base" onClick={() => onEditCar(car)}>{t.editCar}</PillButton>}
            <PillButton className="py-1 text-base" onClick={() => onEditCar(null)}>{t.addCar}</PillButton>
          </div>
        )}
      </div>

      {editing ? (
        <EditProfile profile={profile} onDone={() => setEditing(false)} />
      ) : (
        (user.bio || isMe) && (
          <button
            disabled={!isMe}
            onClick={() => (haptic.select(), setEditing(true))}
            className="strip block w-full px-3 py-2 text-left text-sm italic text-white/80"
          >
            {user.bio ?? <span className="text-steel">{t.bioPrompt}</span>}
          </button>
        )
      )}

      <SectionTitle>{t.bestLaps}</SectionTitle>
      {personalBests.length === 0 ? (
        <div className="strip px-3 py-3 text-sm italic text-steel">{t.noLaps}</div>
      ) : (
        <div className="strip divide-y divide-white/10">
          {personalBests.map((pb) => (
            <div key={pb.track.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
              <div className="min-w-0">
                <div className="label-white truncate text-xl normal-case leading-tight">{trackText(pb.track, lang).name}</div>
                <div className="truncate text-xs text-steel">
                  {trackText(pb.track, lang).layout && `${trackText(pb.track, lang).layout} · `}
                  {pb.car.make} {pb.car.model}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="title-lime text-2xl tabular-nums leading-none">{formatLap(pb.lap.timeMs)}</span>
                {pb.lap.status !== "verified" && <StatusBadge status={pb.lap.status} />}
              </div>
            </div>
          ))}
        </div>
      )}

      {isMe && (
        <div className="strip mt-5 flex items-center justify-between px-3 py-2">
          <span className="title-lime text-xl">{t.language}</span>
          <Switcher
            label={langName(lang)}
            onPrev={() => setLang(LANGS[(LANGS.indexOf(lang) + LANGS.length - 1) % LANGS.length])}
            onNext={() => setLang(LANGS[(LANGS.indexOf(lang) + 1) % LANGS.length])}
          />
        </div>
      )}
    </div>
  );
}

function EditProfile({ profile, onDone }: { profile: Profile; onDone: () => void }) {
  const [nickname, setNickname] = useState(profile.user.nickname ?? "");
  const [crew, setCrew] = useState(profile.user.crew ?? "");
  const [bio, setBio] = useState(profile.user.bio ?? "");
  const update = useUpdateProfile();
  const { t } = useI18n();

  return (
    <Panel innerClassName="space-y-3 p-3">
      <Field label={t.streetName}>
        <input className="field" maxLength={32} value={nickname} onChange={(e) => setNickname(e.target.value)} />
      </Field>
      <Field label={t.crew}>
        <input className="field" maxLength={32} value={crew} onChange={(e) => setCrew(e.target.value)} />
      </Field>
      <Field label={t.bio}>
        <textarea className="field" rows={3} maxLength={280} value={bio} onChange={(e) => setBio(e.target.value)} />
      </Field>
      {update.isError && <ErrorBox error={update.error} />}
      <div className="flex justify-end gap-3">
        <PillButton onClick={onDone}>{t.back}</PillButton>
        <PillButton
          disabled={update.isPending}
          onClick={() =>
            update.mutate(
              { nickname: nickname || null, crew: crew || null, bio: bio || null },
              { onSuccess: () => (haptic.success(), onDone()) },
            )
          }
        >
          {t.save}
        </PillButton>
      </div>
    </Panel>
  );
}
