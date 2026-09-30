import type { OrderLine, RouteType, ServiceDetail, Tariffs, UnitCapacity } from "./types";

export const CAPACITIES: UnitCapacity[] = [6, 14, 20, 45];

export const unitName = (c: UnitCapacity) => `${c === 45 ? "Autobús" : "Van"} ${c}`;

export const capacityRange = (c: UnitCapacity) => {
  const i = CAPACITIES.indexOf(c);
  return `${i === 0 ? 1 : CAPACITIES[i - 1] + 1}–${c} pasajeros`;
};

/**
 * Smallest unit where everybody fits. Above 45 passengers, fill buses and
 * cover the remainder with the smallest unit that fits it.
 */
export function assignUnits(passengers: number): UnitCapacity[] {
  if (!(passengers > 0)) return [];
  const units: UnitCapacity[] = [];
  let remaining = passengers;
  while (remaining > 45) {
    units.push(45);
    remaining -= 45;
  }
  units.push(CAPACITIES.find((c) => c >= remaining) as UnitCapacity);
  return units;
}

export const serviceLabel = (s: ServiceDetail) => {
  if (s.type === "amatitan") return `Amatitán, horario ${s.amatitanShift === "am" ? "matutino" : "vespertino"}`;
  if (s.type === "evento") return `Evento${s.eventDescription ? ` · ${s.eventDescription}` : ""}`;
  return `Turismo ${s.destination ?? ""} · ${s.days === 1 ? "mismo día" : `${s.days} días`}`;
};

export const serviceShort = (s: ServiceDetail) =>
  s.type === "amatitan" ? "Amatitán" : s.type === "evento" ? "Evento" : "Turismo";

export interface QuoteInput {
  service: ServiceDetail;
  units: UnitCapacity[];
  route: RouteType;
  extraHours: number;
  extraMoves: number;
  useDiscount: boolean;
}

export interface Quote {
  /** Per-unit list price; null when the tariff does not cover the unit. */
  unitPrices: { capacity: UnitCapacity; normal: number | null; discount: number | null }[];
  base: number;
  shiftSurcharge: number;
  hoursCost: number;
  movesCost: number;
  discount: number;
  total: number;
  /** True when some unit has no tariff (e.g. a 45-seat bus for tourism). */
  incomplete: boolean;
  canDiscount: boolean;
  lines: OrderLine[];
}

/** Prices a service from the tariff tables. Pure: same input, same quote. */
export function quote(tariffs: Tariffs, input: QuoteInput): Quote {
  const { service, units } = input;
  const unitPrices = units.map((capacity) => {
    if (service.type === "amatitan") {
      const t = tariffs.amatitan[service.amatitanShift ?? "am"];
      return { capacity, normal: t.normal[capacity], discount: t.discount[capacity] };
    }
    if (service.type === "evento") {
      return { capacity, normal: tariffs.eventos.normal[capacity], discount: tariffs.eventos.discount[capacity] };
    }
    const rate = tariffs.turismo.find((r) => r.destination === service.destination);
    const price = capacity === 45 || !rate ? null : rate.prices[capacity][(service.days ?? 1) - 1];
    return { capacity, normal: price, discount: price };
  });

  const incomplete = unitPrices.some((u) => u.normal === null);
  const base = unitPrices.reduce((sum, u) => sum + (u.normal ?? 0), 0);
  const sameDayTour = service.type === "turismo" && service.days === 1;
  const shiftSurcharge = sameDayTour ? tariffs.tourShiftSurcharge[service.tourShift ?? "am"] * units.length : 0;
  const hoursCost = units.reduce((sum, c) => sum + tariffs.extras[c].hour * input.extraHours, 0);
  const movesCost = units.reduce((sum, c) => sum + tariffs.extras[c].move * input.extraMoves, 0);
  const canDiscount = service.type !== "turismo";
  const discount = canDiscount && input.useDiscount ? unitPrices.reduce((sum, u) => sum + ((u.normal ?? 0) - (u.discount ?? 0)), 0) : 0;
  const total = base + shiftSurcharge + hoursCost + movesCost - discount;

  const routeLabel = input.route === "round" ? "Ida y vuelta" : "Solo ida";
  const lines: OrderLine[] = unitPrices.map((u) => ({
    qty: 1,
    concept: `${unitName(u.capacity)} pasajeros · ${routeLabel} · ${serviceLabel(service)}`,
    amount: u.normal ?? 0,
  }));
  if (shiftSurcharge) lines.push({ qty: null, concept: service.tourShift === "pm" ? "Horario vespertino (1:00 p. m. – 9:00 p. m.)" : "Horario completo (8:00 a. m. – 9:00 p. m.)", amount: shiftSurcharge });
  if (hoursCost) lines.push({ qty: null, concept: `Horas extra (${input.extraHours})`, amount: hoursCost });
  if (movesCost) lines.push({ qty: null, concept: `Movimientos extra (${input.extraMoves})`, amount: movesCost });
  if (discount) lines.push({ qty: null, concept: "Descuento", amount: -discount });

  return { unitPrices, base, shiftSurcharge, hoursCost, movesCost, discount, total, incomplete, canDiscount, lines };
}

/** Suggested provider cost until the provider's own rate is known. */
export const suggestedProviderCost = (total: number, units: number) => Math.max(0, total - 1000 * Math.max(1, units));
