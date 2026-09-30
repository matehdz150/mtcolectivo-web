import { describeSelections, resolveFields, skippedPages, statusFromPayments, todayInMexico, type Order as CoreOrder } from "@/shared/core";

import type { DocumentTemplate, NewOrder, Order, Quote, Service } from "./types";

/**
 * The order as it will be saved, built from what is typed in the form. Mirrors
 * assembleOrder in the API; nothing here is persisted (no folio, no vehicles).
 * Timestamps and ids are fixed so the same form always gives the same object.
 */
export function draftOrder(input: NewOrder, ctx: { service: Service; units: number[]; quote: Quote; recommended: number; client: { id: string; name: string; phone: string; email: string } }): Order {
  const { service, units, quote, client, recommended } = ctx;
  const order: CoreOrder = {
    id: "preview",
    folio: `OS-${todayInMexico().slice(0, 4)}-····`,
    clientId: client.id,
    clientName: client.name,
    clientPhone: client.phone,
    clientEmail: client.email || undefined,
    serviceId: service.id,
    serviceName: service.name,
    selections: input.selections,
    serviceLabel: describeSelections(service, input.selections),
    route: input.route,
    date: input.date,
    departureTime: input.departureTime,
    returnTime: input.returnTime,
    origin: input.origin,
    destination: input.destination,
    passengers: input.passengers,
    units,
    vehicles: [],
    lines: quote.lines,
    total: quote.total,
    recommendedTotal: recommended !== quote.total ? recommended : undefined,
    payments: input.deposit ? [{ id: "preview", amount: input.deposit.amount, date: input.deposit.date, method: input.deposit.method ?? "Transferencia" }] : [],
    status: "quote",
    contractSigned: false,
    notes: input.notes,
    itinerary: input.itinerary,
    issuedAt: todayInMexico(),
    createdAt: "",
    updatedAt: "",
  };
  order.status = statusFromPayments(order);
  return order as unknown as Order;
}

/**
 * Draws the order with a document in the browser, with the same code the API
 * uses for the real PDF (src/shared is copied from mtcolectivo-infra).
 * `base` is the blank PDF of a template made from a PDF.
 */
export async function renderOrderPdf(template: DocumentTemplate, order: Order, base?: Uint8Array): Promise<Blob> {
  const core = order as unknown as CoreOrder;
  let bytes: Uint8Array;

  if (template.mode === "document") {
    if (!template.content) throw new Error("El documento está vacío.");
    // pdfmake and its fonts are heavy: they load the first time a document is previewed.
    const { renderDocument } = await import("@/shared/pdf/document");
    bytes = await renderDocument(template.content as never, core);
  } else {
    if (!base) throw new Error("Falta el PDF base de la plantilla.");
    const { renderPdf } = await import("@/shared/pdf/render");
    bytes = await renderPdf(base, resolveFields(core, template.fields as never), skippedPages(core, template.pageRules));
  }
  return new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
}
