import * as mock from "./mock-data";
import type {
  Client,
  DocumentTemplate,
  GeneratedDocument,
  MonthSummary,
  NewOrder,
  NewVehicle,
  Order,
  Payment,
  Provider,
  Tariffs,
  Vehicle,
} from "./types";

/**
 * API client. Every function maps to one REST endpoint.
 *
 * Set NEXT_PUBLIC_API_URL (e.g. https://api.mtcolectivo.mx) to talk to the
 * real backend. Without it, calls are served from `mock-data.ts` with a short
 * delay, and mutations change an in-memory copy that lives until reload.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    credentials: "include",
  });
  if (!res.ok) throw new ApiError(`${init?.method ?? "GET"} ${path} respondió ${res.status}`, res.status);
  return (await res.json()) as T;
}

/* ------------------------------------------------------------ mock store */

const clone = <T,>(value: T): T => structuredClone(value);
const db = {
  orders: clone(mock.orders),
  clients: clone(mock.clients),
  vehicles: clone(mock.vehicles),
  templates: clone(mock.templates),
};
const wait = <T,>(value: T, ms = 250) => new Promise<T>((resolve) => setTimeout(() => resolve(clone(value)), ms));
const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

function statusAfterPayments(order: Order): Order["status"] {
  const paid = order.payments.reduce((sum, p) => sum + p.amount, 0);
  if (paid >= order.total) return "paid";
  return paid > 0 ? "deposit" : "quote";
}

/* ------------------------------------------------------------ endpoints */

export const api = {
  /** GET /summary?month=YYYY-MM */
  getMonthSummary: (month: string): Promise<MonthSummary> =>
    API_URL ? request(`/summary?month=${month}`) : wait(mock.monthSummary),

  /** GET /orders */
  getOrders: (): Promise<Order[]> => (API_URL ? request("/orders") : wait(db.orders)),

  /** GET /orders/:id */
  getOrder: async (id: string): Promise<Order> => {
    if (API_URL) return request(`/orders/${id}`);
    const order = db.orders.find((o) => o.id === id);
    if (!order) throw new ApiError(`No existe la orden ${id}`, 404);
    return wait(order);
  },

  /** POST /orders */
  createOrder: async (input: NewOrder): Promise<Order> => {
    if (API_URL) return request("/orders", { method: "POST", body: JSON.stringify(input) });
    const provider = mock.providers.find((p) => p.id === input.providerId);
    const next = Math.max(...db.orders.map((o) => Number(o.folio.slice(-4)))) + 1;
    const client = db.clients.find((c) => c.name.toLowerCase() === input.clientName.trim().toLowerCase());
    const order: Order = {
      id: uid("ord"),
      folio: `OS-2026-${String(next).padStart(4, "0")}`,
      clientId: client?.id ?? uid("cli"),
      clientName: input.clientName.trim(),
      clientPhone: input.clientPhone,
      service: input.service,
      date: input.date,
      departureTime: input.departureTime,
      returnTime: input.returnTime,
      route: input.route,
      origin: input.origin,
      destination: input.destination,
      passengers: input.passengers,
      units: input.units,
      providerId: input.providerId,
      providerName: provider?.name ?? "",
      lines: input.lines,
      total: input.total,
      payments: input.deposit ? [{ id: uid("pay"), amount: input.deposit.amount, date: input.deposit.date, method: "Transferencia" }] : [],
      providerCost: input.providerCost,
      status: "quote",
      contractSigned: false,
      issuedAt: new Date().toISOString().slice(0, 10),
    };
    order.status = statusAfterPayments(order);
    db.orders.unshift(order);
    return wait(order);
  },

  /** POST /orders/:id/payments */
  addPayment: async (orderId: string, payment: Omit<Payment, "id">): Promise<Order> => {
    if (API_URL) return request(`/orders/${orderId}/payments`, { method: "POST", body: JSON.stringify(payment) });
    const order = db.orders.find((o) => o.id === orderId);
    if (!order) throw new ApiError(`No existe la orden ${orderId}`, 404);
    order.payments.push({ id: uid("pay"), ...payment });
    order.status = statusAfterPayments(order);
    return wait(order);
  },

  /** GET /clients */
  getClients: (): Promise<Client[]> => (API_URL ? request("/clients") : wait(db.clients)),

  /** GET /providers */
  getProviders: (): Promise<Provider[]> => (API_URL ? request("/providers") : wait(mock.providers)),

  /** GET /tariffs */
  getTariffs: (): Promise<Tariffs> => (API_URL ? request("/tariffs") : wait(mock.tariffs)),

  /** GET /vehicles */
  getVehicles: (): Promise<Vehicle[]> => (API_URL ? request("/vehicles") : wait(db.vehicles)),

  /** POST /vehicles */
  createVehicle: async (input: NewVehicle): Promise<Vehicle> => {
    if (API_URL) return request("/vehicles", { method: "POST", body: JSON.stringify(input) });
    const provider = mock.providers.find((p) => p.id === input.providerId);
    const vehicle: Vehicle = { ...input, id: uid("veh"), providerName: provider?.name ?? "", servicesThisMonth: 0, nextService: null };
    db.vehicles.unshift(vehicle);
    return wait(vehicle);
  },

  /** GET /templates */
  getTemplates: (): Promise<DocumentTemplate[]> => (API_URL ? request("/templates") : wait(db.templates)),

  /** GET /templates/:id */
  getTemplate: async (id: string): Promise<DocumentTemplate> => {
    if (API_URL) return request(`/templates/${id}`);
    const template = db.templates.find((t) => t.id === id);
    if (!template) throw new ApiError(`No existe la plantilla ${id}`, 404);
    return wait(template);
  },

  /**
   * PUT /templates/:id (or POST /templates when new). With a real backend the
   * PDF goes up as multipart/form-data: `file` + `template` (JSON).
   */
  saveTemplate: async (template: DocumentTemplate, options: { isNew: boolean; file?: File }): Promise<DocumentTemplate> => {
    const { isNew, file } = options;
    if (API_URL) {
      const body = new FormData();
      body.set("template", JSON.stringify(template));
      if (file) body.set("file", file);
      const res = await fetch(`${API_URL}/templates${isNew ? "" : `/${template.id}`}`, { method: isNew ? "POST" : "PUT", body, credentials: "include" });
      if (!res.ok) throw new ApiError(`Guardar plantilla respondió ${res.status}`, res.status);
      return (await res.json()) as DocumentTemplate;
    }
    const saved = { ...template, updatedAt: new Date().toISOString().slice(0, 10) };
    const i = db.templates.findIndex((t) => t.id === template.id);
    if (i >= 0) db.templates[i] = saved;
    else db.templates.unshift(saved);
    return wait(saved);
  },

  /** GET /documents?limit=n */
  getGeneratedDocuments: (): Promise<GeneratedDocument[]> =>
    API_URL ? request("/documents?limit=10") : wait(mock.generatedDocuments),
};
