import type { VehicleKind } from "./types";

/** Vehicle sizes MT Colectivo prices for (mirrors the API's default fleet). */
export const CAPACITIES = [6, 14, 20, 45];

export const unitName = (capacity: number) => `${capacity >= 45 ? "Autobús" : "Van"} ${capacity}`;

export const capacityRange = (capacity: number) => {
  const i = CAPACITIES.indexOf(capacity);
  return `${i <= 0 ? 1 : CAPACITIES[i - 1] + 1}–${capacity} pasajeros`;
};

/** Each size has its own illustration: minivan (6), van (14), microbus (20), bus (45). */
export const kindFor = (capacity: number): VehicleKind => (capacity >= 45 ? "bus" : capacity >= 20 ? "microbus" : capacity >= 14 ? "van" : "minivan");

/** The illustration of the biggest unit of an order. */
export const kindForUnits = (units: number[]): VehicleKind => kindFor(Math.max(0, ...units) || 14);

/** The size bucket (6/14/20/45) a vehicle of any capacity belongs to, for the summary cards. */
export const sizeClass = (capacity: number) => CAPACITIES.find((c) => capacity <= c) ?? CAPACITIES[CAPACITIES.length - 1];

export const hasBus = (units: number[]) => units.some((c) => c >= 45);
