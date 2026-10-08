import { useState } from "react";
import { useDeleteCar, useSaveCar, useUploadPhotos } from "../api/client";
import type { Car, CarInput, CatalogCar, Drivetrain } from "../api/types";
import { CarAutofill } from "../components/CarAutofill";
import { ColorPicker } from "../components/ColorPicker";
import { MakeModelPicker } from "../components/MakeModelPicker";
import { PendingPhotos } from "../components/PendingPhotos";
import { PhotoManager } from "../components/PhotoManager";
import { ErrorBox, Field, Panel, PillButton, ScreenHeader, SectionTitle } from "../components/ui";
import { useI18n } from "../i18n";
import { haptic } from "../telegram";

const numOrNull = (s: string) => (s.trim() === "" ? null : Number(s));

type Props = {
  car: Car | null;
  onDone: () => void;
  /** Called after a new car is created, so the screen can switch to editing it (and adding photos). */
  onCreated: (car: Car) => void;
};

export function CarFormScreen({ car, onDone, onCreated }: Props) {
  const { t } = useI18n();
  const [form, setForm] = useState({
    make: car?.make ?? "",
    model: car?.model ?? "",
    year: car?.year?.toString() ?? "",
    color: car?.color ?? "",
    hp: car?.hp?.toString() ?? "",
    torqueNm: car?.torqueNm?.toString() ?? "",
    weightKg: car?.weightKg?.toString() ?? "",
    drivetrain: (car?.drivetrain ?? "") as Drivetrain | "",
    mods: car?.mods.join("\n") ?? "",
    isMain: car?.isMain ?? false,
    sold: car?.soldAt != null,
    soldYear: car?.soldAt?.slice(0, 4) ?? "",
  });
  const thisYear = String(new Date().getFullYear());
  const wasSold = car?.soldAt != null;
  /** Production years of the picked catalog car, shown as the year placeholder. */
  const [yearHint, setYearHint] = useState("");
  const save = useSaveCar();
  const upload = useUploadPhotos();
  /** Photos chosen while adding a new car, uploaded once it's created. */
  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const del = useDeleteCar();
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value });

  const autofill = (c: CatalogCar) => {
    setForm((form) => ({
      ...form,
      make: c.make,
      model: c.model,
      // A model spans many years; leave the exact year to the owner.
      year: form.year,
      hp: String(c.hp),
      torqueNm: String(c.torqueNm),
      weightKg: String(c.weightKg),
      drivetrain: c.drivetrain,
    }));
    setYearHint(`${c.from}–${c.to ?? ""}`);
  };

  const submit = (overrides: Partial<CarInput> = {}) => {
    const input: CarInput & { id?: number } = {
      id: car?.id,
      make: form.make,
      model: form.model,
      year: numOrNull(form.year),
      color: form.color || null,
      hp: numOrNull(form.hp),
      torqueNm: numOrNull(form.torqueNm),
      weightKg: numOrNull(form.weightKg),
      drivetrain: form.drivetrain || null,
      mods: form.mods.split("\n").map((m) => m.trim()).filter(Boolean),
      isMain: form.isMain && !form.sold,
      sold: form.sold,
      soldYear: form.sold ? numOrNull(form.soldYear) : null,
      ...overrides,
    };
    save.mutate(input, {
      onSuccess: async (saved) => {
        haptic.success();
        if (car) return onDone();
        if (newPhotos.length) {
          // The car exists either way; a failed upload can be retried from its photo strip.
          await upload.mutateAsync({ carId: saved.id, files: newPhotos }).catch(() => haptic.error());
        }
        onCreated(saved);
      },
      onError: () => haptic.error(),
    });
  };

  return (
    <div className="space-y-2">
      <ScreenHeader title={car ? t.tuneCar : t.newCar} />
      {car && (
        <>
          <PhotoManager carId={car.id} />
          <SectionTitle>{t.specs}</SectionTitle>
        </>
      )}
      <Panel innerClassName="space-y-3 p-4">
        {!car && <CarAutofill onPick={autofill} />}
        <MakeModelPicker
          make={form.make}
          model={form.model}
          onChange={(make, model) => setForm((f) => ({ ...f, make, model }))}
          onPickCatalog={autofill}
        />
        <div className="grid grid-cols-2 gap-3">
          <Field label={t.year}>
            <input className="field" inputMode="numeric" placeholder={yearHint} value={form.year} onChange={set("year")} />
          </Field>
          <Field label={t.power}>
            <input className="field" inputMode="numeric" value={form.hp} onChange={set("hp")} />
          </Field>
          <Field label={t.torque}>
            <input className="field" inputMode="numeric" value={form.torqueNm} onChange={set("torqueNm")} />
          </Field>
          <Field label={t.weight}>
            <input className="field" inputMode="numeric" value={form.weightKg} onChange={set("weightKg")} />
          </Field>
          <Field label={t.drivetrain}>
            <select className="field" value={form.drivetrain} onChange={set("drivetrain")}>
              <option value="">—</option>
              {(["FWD", "RWD", "AWD"] as const).map((d) => (
                <option key={d} value={d}>
                  {t.drive[d]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label={t.color}>
          <ColorPicker value={form.color} onChange={(color) => setForm({ ...form, color })} />
        </Field>
        {!car && <PendingPhotos files={newPhotos} onChange={setNewPhotos} />}
        <Field label={t.mods}>
          <textarea className="field" rows={4} placeholder={"HKS turbo kit\nCoilovers\nVolk TE37"} value={form.mods} onChange={set("mods")} />
        </Field>
        {!form.sold && (
          <label className="flex items-center gap-2 text-sm italic">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[#b9f05f]"
              checked={form.isMain}
              onChange={(e) => setForm({ ...form, isMain: e.target.checked })}
            />
            {t.mainRide}
          </label>
        )}
        {!car && (
          <label className="flex items-center gap-2 text-sm italic">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[#b9f05f]"
              checked={form.sold}
              onChange={(e) => setForm({ ...form, sold: e.target.checked, soldYear: form.soldYear || thisYear })}
            />
            {t.formerCarCheckbox}
          </label>
        )}
        {form.sold && (
          <div className="grid grid-cols-2 items-end gap-3">
            <Field label={t.soldYear}>
              <input
                className="field"
                inputMode="numeric"
                maxLength={4}
                placeholder={thisYear}
                value={form.soldYear}
                onChange={(e) => setForm({ ...form, soldYear: e.target.value.replace(/\D/g, "") })}
              />
            </Field>
            {car && !wasSold && <p className="pb-1 text-xs italic text-steel">{t.soldNote}</p>}
          </div>
        )}
        {(save.isError || del.isError) && <ErrorBox error={save.error ?? del.error} />}
        <div className="flex flex-wrap justify-end gap-3 pt-1">
          {car && (
            <PillButton
              variant="danger"
              disabled={del.isPending}
              onClick={() => {
                if (confirm(t.confirmDelete(`${car.make} ${car.model}`))) del.mutate(car.id, { onSuccess: onDone });
              }}
            >
              {t.deleteCar}
            </PillButton>
          )}
          {car && !form.sold && (
            <PillButton onClick={() => setForm({ ...form, sold: true, isMain: false, soldYear: thisYear })}>
              {t.markSold}
            </PillButton>
          )}
          {car && wasSold && (
            <PillButton disabled={save.isPending} onClick={() => submit({ sold: false, soldYear: null })}>
              {t.returnToGarage}
            </PillButton>
          )}
          <PillButton disabled={save.isPending || upload.isPending || !form.make || !form.model} onClick={() => submit()}>
            {upload.isPending ? t.uploading : car ? t.save : t.addToGarage}
          </PillButton>
        </div>
      </Panel>
    </div>
  );
}
