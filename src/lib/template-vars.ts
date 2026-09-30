import { longDate, money2, numericDate, time12 } from "./format";
import { dueAmount, paidAmount } from "./order-status";
import type { FieldType, Order, TemplateKind, TemplateTrigger } from "./types";

/** Order data a template field can be filled with. */
export const TEMPLATE_VARIABLES: { id: string; label: string; type: FieldType; resolve: (o: Order) => string }[] = [
  { id: "client.name", label: "Cliente · nombre", type: "text", resolve: (o) => o.clientName },
  { id: "client.phone", label: "Cliente · celular", type: "text", resolve: (o) => o.clientPhone },
  { id: "order.folio", label: "Orden · folio", type: "text", resolve: (o) => o.folio },
  { id: "order.issued", label: "Orden · fecha de emisión", type: "date", resolve: (o) => numericDate(o.issuedAt) },
  { id: "service.date", label: "Servicio · fecha", type: "date", resolve: (o) => longDate(o.date) },
  { id: "service.time", label: "Servicio · horario", type: "text", resolve: (o) => `${time12(o.departureTime)} – ${time12(o.returnTime)}` },
  { id: "service.origin", label: "Servicio · salida", type: "text", resolve: (o) => o.origin },
  { id: "service.destination", label: "Servicio · destino", type: "text", resolve: (o) => o.destination },
  { id: "unit.capacity", label: "Unidad · capacidad", type: "text", resolve: (o) => o.units.map((c) => `1 ${c === 45 ? "autobús" : "van"} de ${c} pasajeros`).join(" y ") },
  { id: "pay.total", label: "Pago · total", type: "money", resolve: (o) => money2(o.total) },
  { id: "pay.paid", label: "Pago · anticipo", type: "money", resolve: (o) => money2(paidAmount(o)) },
  { id: "pay.due", label: "Pago · por liquidar", type: "money", resolve: (o) => money2(dueAmount(o)) },
  { id: "sign.client", label: "Firma del cliente", type: "sign", resolve: () => "" },
];

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
