import {
  siAcura,
  siAudi,
  siBmw,
  siChevrolet,
  siChrysler,
  siCitroen,
  siDacia,
  siFiat,
  siFord,
  siHonda,
  siHyundai,
  siInfiniti,
  siJeep,
  siKia,
  siLada,
  siMazda,
  siMini,
  siMitsubishi,
  siNissan,
  siOpel,
  siPorsche,
  siRenault,
  siSeat,
  siSkoda,
  siSubaru,
  siSuzuki,
  siTesla,
  siToyota,
  siVolkswagen,
  siVolvo,
  type SimpleIcon,
} from "simple-icons";

/**
 * Monochrome make logos from Simple Icons (CC0 icon data; the marks belong to their owners),
 * used to label which make a car is. Limited to makes club members drive (catalog makes and their
 * twins plus common European ones) to keep the bundle small; makes without an icon there
 * (e.g. Mercedes-Benz, Lexus, GAZ, UAZ, Chinese brands) just show their name.
 */
const LOGOS: Record<string, SimpleIcon> = {
  acura: siAcura,
  audi: siAudi,
  bmw: siBmw,
  chevrolet: siChevrolet,
  chrysler: siChrysler,
  citroen: siCitroen,
  dacia: siDacia,
  fiat: siFiat,
  ford: siFord,
  honda: siHonda,
  hyundai: siHyundai,
  infiniti: siInfiniti,
  jeep: siJeep,
  kia: siKia,
  lada: siLada,
  vaz: siLada,
  ваз: siLada,
  лада: siLada,
  mazda: siMazda,
  mini: siMini,
  mitsubishi: siMitsubishi,
  nissan: siNissan,
  opel: siOpel,
  porsche: siPorsche,
  renault: siRenault,
  seat: siSeat,
  skoda: siSkoda,
  škoda: siSkoda,
  subaru: siSubaru,
  suzuki: siSuzuki,
  tesla: siTesla,
  toyota: siToyota,
  volkswagen: siVolkswagen,
  vw: siVolkswagen,
  volvo: siVolvo,
};

/** Logo for a free-text make ("toyota", "ВАЗ", "VW", "Citroën"), if we have one. */
export function brandLogo(make: string): SimpleIcon | null {
  const key = make.trim().toLowerCase().replace(/ë/g, "e");
  return LOGOS[key] ?? null;
}
