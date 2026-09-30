import { durationHours, hoursLabel, longDate, monthName, money2, moneyInWords, numericDate, time12, weekdayName } from "./format";
import { dueAmount, paidAmount } from "./order-status";
import type { FieldType, Order, TemplateKind, TemplateTrigger } from "./types";

const unitsText = (units: number[]) => {
  const count = new Map<number, number>();
  for (const c of units) count.set(c, (count.get(c) ?? 0) + 1);
  return [...count].map(([capacity, n]) => `${n} ${capacity >= 45 ? (n > 1 ? "autobuses" : "autobús") : n > 1 ? "vans" : "van"} de ${capacity} pasajeros`).join(" y ");
};

const cents = (n: number) => Math.round(n * 100) / 100;
const discountOf = (o: Order) => cents(-o.lines.filter((l) => l.amount < 0).reduce((s, l) => s + l.amount, 0));
const subtotalOf = (o: Order) => cents(o.lines.filter((l) => l.amount > 0).reduce((s, l) => s + l.amount, 0));
const STATUS_LABEL: Record<string, string> = { quote: "Cotización", deposit: "Con anticipo", paid: "Liquidada", done: "Realizada", cancelled: "Cancelada" };
const datePart = (iso: string, at: 0 | 1 | 2) => String(Number(iso.split("-")[at]));
const todayISO = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });

/**
 * Order data a template field can be filled with. The ids are shared with the
 * API (which prints the real PDF); `resolve` only feeds the editor's preview,
 * so keep it in step with packages/core/src/templates.ts in mtcolectivo-infra.
 */
export const TEMPLATE_VARIABLES: { id: string; token: string; label: string; type: FieldType; resolve: (o: Order) => string }[] = [
  { id: "client.name", token: "cliente", label: "Cliente · nombre", type: "text", resolve: (o) => o.clientName },
  { id: "client.phone", token: "celular", label: "Cliente · celular", type: "text", resolve: (o) => o.clientPhone },
  { id: "order.folio", token: "folio", label: "Orden · folio", type: "text", resolve: (o) => o.folio },
  { id: "order.issued", token: "emision", label: "Orden · fecha de emisión", type: "date", resolve: (o) => numericDate(o.issuedAt) },
  { id: "order.notes", token: "notas", label: "Orden · notas", type: "text", resolve: (o) => o.notes ?? "" },
  { id: "order.itinerary", token: "itinerario", label: "Orden · itinerario", type: "text", resolve: (o) => o.itinerary ?? "" },
  { id: "order.passengers", token: "pasajeros", label: "Orden · número de pasajeros", type: "text", resolve: (o) => String(o.passengers) },
  { id: "order.lines", token: "conceptos", label: "Orden · conceptos y precios", type: "lines", resolve: (o) => o.lines.map((l) => l.concept).join("\n") },
  { id: "service.name", token: "servicio", label: "Servicio · nombre", type: "text", resolve: (o) => o.serviceName },
  { id: "service.label", token: "detalle", label: "Servicio · detalle", type: "text", resolve: (o) => [o.serviceName, o.serviceLabel].filter(Boolean).join(" · ") },
  { id: "service.date", token: "fecha", label: "Servicio · fecha", type: "date", resolve: (o) => longDate(o.date) },
  { id: "service.dateShort", token: "fecha_corta", label: "Servicio · fecha (00/00/0000)", type: "date", resolve: (o) => numericDate(o.date) },
  { id: "service.time", token: "horario", label: "Servicio · horario", type: "text", resolve: (o) => `${time12(o.departureTime)} – ${time12(o.returnTime)}` },
  { id: "service.departure", token: "ida", label: "Servicio · hora de salida", type: "text", resolve: (o) => time12(o.departureTime) },
  { id: "service.return", token: "regreso", label: "Servicio · hora de regreso", type: "text", resolve: (o) => (o.route === "round" ? time12(o.returnTime) : "Sin regreso") },
  { id: "service.duration", token: "duracion", label: "Servicio · duración", type: "text", resolve: (o) => (o.route === "round" ? hoursLabel(durationHours(o.departureTime, o.returnTime)) : "—") },
  { id: "service.route", token: "ruta", label: "Servicio · ruta", type: "text", resolve: (o) => (o.route === "round" ? "Ida y vuelta" : "Solo ida") },
  { id: "service.origin", token: "salida", label: "Servicio · salida", type: "text", resolve: (o) => o.origin },
  { id: "service.destination", token: "destino", label: "Servicio · destino", type: "text", resolve: (o) => o.destination },
  { id: "unit.capacity", token: "unidad", label: "Unidad · capacidad", type: "text", resolve: (o) => unitsText(o.units) },
  { id: "pay.total", token: "total", label: "Pago · total", type: "money", resolve: (o) => money2(o.total) },
  { id: "pay.paid", token: "anticipo", label: "Pago · anticipo", type: "money", resolve: (o) => money2(paidAmount(o)) },
  { id: "pay.paidDetail", token: "abonos", label: "Pago · abonos con fecha", type: "text", resolve: (o) => o.payments.map((p) => `Abonado: ${money2(p.amount)} (${numericDate(p.date)})`).join(" · ") },
  { id: "pay.due", token: "pendiente", label: "Pago · por liquidar", type: "money", resolve: (o) => money2(dueAmount(o)) },
  { id: "sign.client", token: "firma", label: "Firma del cliente", type: "sign", resolve: () => "" },
  { id: "client.email", token: "correo", label: "Cliente · correo", type: "text", resolve: (o) => o.clientEmail ?? "" },
  { id: "order.discount", token: "descuento", label: "Orden · descuento", type: "money", resolve: (o) => money2(discountOf(o)) },
  { id: "order.recommended", token: "precio_recomendado", label: "Orden · precio recomendado (si se cambió el precio)", type: "money", resolve: (o) => (o.recommendedTotal !== undefined ? money2(o.recommendedTotal) : "") },
  { id: "order.subtotal", token: "subtotal", label: "Orden · subtotal (antes del descuento)", type: "money", resolve: (o) => money2(subtotalOf(o)) },
  { id: "order.status", token: "estado", label: "Orden · estado", type: "text", resolve: (o) => STATUS_LABEL[o.status] ?? o.status },
  { id: "order.contract", token: "contrato", label: "Orden · contrato", type: "text", resolve: (o) => (o.contractSigned ? "Firmado" : "Pendiente de firma") },
  { id: "order.issuedLong", token: "emision_larga", label: "Orden · fecha de emisión (con día y mes)", type: "date", resolve: (o) => longDate(o.issuedAt) },
  { id: "order.today", token: "hoy", label: "Hoy (fecha en que se genera el PDF)", type: "date", resolve: () => numericDate(todayISO()) },
  { id: "order.linesText", token: "conceptos_texto", label: "Orden · conceptos en texto", type: "text", resolve: (o) => o.lines.map((l) => `${l.qty ? `${l.qty} × ` : ""}${l.concept}: ${money2(l.amount)}`).join("\n") },
  { id: "service.options", token: "opciones", label: "Servicio · opciones elegidas", type: "text", resolve: (o) => o.serviceLabel },
  { id: "service.weekday", token: "dia_semana", label: "Servicio · día de la semana", type: "text", resolve: (o) => weekdayName(o.date) },
  { id: "service.day", token: "dia", label: "Servicio · día del mes", type: "text", resolve: (o) => datePart(o.date, 2) },
  { id: "service.month", token: "mes", label: "Servicio · mes", type: "text", resolve: (o) => monthName(o.date) },
  { id: "service.year", token: "anio", label: "Servicio · año", type: "text", resolve: (o) => datePart(o.date, 0) },
  { id: "unit.vehicles", token: "vehiculos", label: "Unidad · vehículos asignados", type: "text", resolve: (o) => o.vehicles.map((v) => v.code).filter(Boolean).join(", ") },
  { id: "unit.count", token: "num_unidades", label: "Unidad · número de unidades", type: "text", resolve: (o) => String(o.units.length) },
  { id: "unit.seats", token: "lugares", label: "Unidad · lugares totales", type: "text", resolve: (o) => String(o.units.reduce((s, c) => s + c, 0)) },
  { id: "pay.count", token: "num_abonos", label: "Pago · número de abonos", type: "text", resolve: (o) => String(o.payments.length) },
  { id: "pay.first", token: "primer_abono", label: "Pago · monto del primer abono", type: "money", resolve: (o) => (o.payments.length ? money2(o.payments[0].amount) : "") },
  { id: "pay.firstDate", token: "fecha_primer_abono", label: "Pago · fecha del primer abono", type: "date", resolve: (o) => (o.payments.length ? numericDate(o.payments[0].date) : "") },
  { id: "pay.last", token: "ultimo_abono", label: "Pago · monto del último abono", type: "money", resolve: (o) => (o.payments.length ? money2(o.payments[o.payments.length - 1].amount) : "") },
  { id: "pay.lastDate", token: "fecha_ultimo_abono", label: "Pago · fecha del último abono", type: "date", resolve: (o) => (o.payments.length ? numericDate(o.payments[o.payments.length - 1].date) : "") },
  { id: "pay.method", token: "metodo_pago", label: "Pago · método del último abono", type: "text", resolve: (o) => (o.payments.length ? o.payments[o.payments.length - 1].method : "") },
  { id: "pay.percent", token: "porcentaje_pagado", label: "Pago · porcentaje pagado", type: "text", resolve: (o) => (o.total > 0 ? `${Math.round((paidAmount(o) / o.total) * 100)}%` : "0%") },
  { id: "pay.totalWords", token: "total_letra", label: "Pago · total con letra", type: "text", resolve: (o) => moneyInWords(o.total) },
  { id: "pay.dueWords", token: "pendiente_letra", label: "Pago · por liquidar con letra", type: "text", resolve: (o) => moneyInWords(dueAmount(o)) },
];

const TOKEN = /\{([^{}\n]+)\}/g;

/** "Fecha: {fecha}" -> "Fecha: martes 6 de octubre…". Unknown tokens stay as typed. */
export function fillText(order: Order, text: string): string {
  return text.replace(TOKEN, (whole, raw: string) => TEMPLATE_VARIABLES.find((v) => v.token === raw.trim())?.resolve(order) ?? whole);
}

export const variableLabel = (id: string | null) => TEMPLATE_VARIABLES.find((v) => v.id === id)?.label ?? null;

export const TEMPLATE_KINDS: { value: TemplateKind; label: string }[] = [
  { value: "order", label: "Orden de servicio" },
  { value: "contract", label: "Contrato" },
  { value: "receipt", label: "Recibo de pago" },
  { value: "other", label: "Otro" },
];

export const TEMPLATE_TRIGGERS: { value: TemplateTrigger; label: string; sentence: string }[] = [
  { value: "quote", label: "Al crear la cotización", sentence: "al crear cada cotización" },
  { value: "deposit", label: "Al confirmar el anticipo", sentence: "al confirmar cada anticipo" },
  { value: "payment", label: "Con cada abono", sentence: "con cada abono" },
  { value: "manual", label: "Solo manual", sentence: "solo cuando lo pidas" },
];
