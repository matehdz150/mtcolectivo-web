/**
 * Domain types shared by the UI and the API client.
 * These are the contracts the backend is expected to return.
 */

export type ServiceType = "amatitan" | "evento" | "turismo";
export type UnitCapacity = 6 | 14 | 20 | 45;
export type VehicleKind = "van" | "bus" | "car" | "truck";
export type Shift = "am" | "pm";
export type TourShift = "am" | "pm" | "full";
export type RouteType = "round" | "one-way";

/** Order lifecycle: quote → deposit → paid → done (late = deposit past due). */
export type OrderStatus = "quote" | "deposit" | "late" | "paid" | "done";

export interface Provider {
  id: string;
  name: string;
  /** True for MT Colectivo's own fleet. */
  own: boolean;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  contractSigned: boolean;
  servicesCount: number;
  totalContracted: number;
  balanceDue: number;
  balanceLate: boolean;
  /** Last or next service, already summarized by the backend. */
  lastService: { label: string; when: string } | null;
}

export interface ServiceDetail {
  type: ServiceType;
  amatitanShift?: Shift;
  eventDescription?: string;
  destination?: string;
  days?: 1 | 2 | 3;
  tourShift?: TourShift;
}

export interface Payment {
  id: string;
  amount: number;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  method: string;
}

export interface OrderLine {
  qty: number | null;
  concept: string;
  /** Negative for discounts. */
  amount: number;
}

export interface Order {
  id: string;
  folio: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  service: ServiceDetail;
  /** ISO date of the service. */
  date: string;
  /** 24h "HH:MM". */
  departureTime: string;
  returnTime: string | null;
  route: RouteType;
  origin: string;
  destination: string;
  passengers: number;
  units: UnitCapacity[];
  providerId: string;
  providerName: string;
  lines: OrderLine[];
  total: number;
  payments: Payment[];
  /** Internal: what MT Colectivo pays the provider. */
  providerCost: number;
  status: OrderStatus;
  contractSigned: boolean;
  /** ISO date the quote was issued. */
  issuedAt: string;
}

export type CapacityPrices = Record<UnitCapacity, number>;

export interface TourismRate {
  destination: string;
  /** Price per unit for 1 day, 2 days (Sat–Sun) and 3 days (Fri–Sun); null = not offered. */
  prices: Record<6 | 14 | 20, [number | null, number | null, number | null]>;
}

export interface Tariffs {
  year: number;
  amatitan: Record<Shift, { normal: CapacityPrices; discount: CapacityPrices }>;
  eventos: { normal: CapacityPrices; discount: CapacityPrices };
  turismo: TourismRate[];
  extras: Record<UnitCapacity, { hour: number; move: number }>;
  /** Extra charged per unit for same-day tourism outside the morning window. */
  tourShiftSurcharge: Record<TourShift, number>;
}

export interface Vehicle {
  id: string;
  code: string;
  capacity: UnitCapacity;
  kind: VehicleKind;
  providerId: string;
  providerName: string;
  model: string;
  plates: string;
  driver: string | null;
  servicesThisMonth: number;
  /** What the provider charges per service; 0 for own units. */
  costPerService: number;
  nextService: string | null;
}

export type NewVehicle = Omit<Vehicle, "id" | "servicesThisMonth" | "nextService" | "providerName">;

export type TemplateKind = "order" | "contract" | "receipt" | "other";
export type TemplateTrigger = "quote" | "deposit" | "payment" | "manual";
export type FieldType = "text" | "date" | "money" | "sign" | "check";

export interface TemplateField {
  id: string;
  page: number;
  label: string;
  /** Order variable that fills the field, e.g. "client.name"; null = not mapped yet. */
  variable: string | null;
  type: FieldType;
  /** Position and size in PDF points on a 600×776 page. */
  x: number;
  y: number;
  w: number;
  h: number;
  required: boolean;
}

export interface DocumentTemplate {
  id: string;
  name: string;
  kind: TemplateKind;
  trigger: TemplateTrigger;
  fileName: string;
  pages: number;
  fields: TemplateField[];
  status: "published" | "draft";
  sendByWhatsApp: boolean;
  requestSignature: boolean;
  updatedAt: string;
}

export interface GeneratedDocument {
  id: string;
  templateName: string;
  orderId: string;
  orderFolio: string;
  clientName: string;
  /** ISO datetime. */
  createdAt: string;
  channel: "WhatsApp" | "Correo" | "Descarga";
}

export interface MonthSummary {
  /** ISO month, e.g. "2026-09". */
  month: string;
  quoted: number;
  earned: number;
  quotedByType: Record<ServiceType, number>;
  receivable: number;
  lateOrders: number;
  upcoming7d: number;
  upcomingDetail: string;
}

export interface NewOrder {
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  service: ServiceDetail;
  date: string;
  departureTime: string;
  returnTime: string | null;
  route: RouteType;
  origin: string;
  destination: string;
  passengers: number;
  units: UnitCapacity[];
  providerId: string;
  lines: OrderLine[];
  total: number;
  deposit: { amount: number; date: string } | null;
  providerCost: number;
}
