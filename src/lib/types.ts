/**
 * Domain types shared by the UI and the API client. They mirror what
 * mtcolectivo-infra returns (packages/core): keep both in sync.
 */

export type VehicleKind = "car" | "suv" | "minivan" | "van" | "microbus" | "midibus" | "bus";
export type RouteType = "round" | "one-way";

/** Order lifecycle: quote → deposit → paid → done. `late` is derived by the API; `cancelled` is manual. */
export type OrderStatus = "quote" | "deposit" | "late" | "paid" | "done" | "cancelled";

/* ---------------------------------------------------------------- clients */

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
  /** Next service if any, otherwise the most recent one. */
  lastService?: { label: string; when: string } | null;
}

export type ClientInput = Pick<Client, "name" | "phone" | "email" | "contractSigned">;

/* ---------------------------------------------------------------- vehicles */

export interface Vehicle {
  id: string;
  code: string;
  /** Top of the passenger range. */
  capacity: number;
  /** Bottom of the passenger range (old units: derived from the standard sizes). */
  minCapacity?: number;
  kind: VehicleKind;
  model: string;
  plates: string;
  driver: string | null;
  active: boolean;
  /** Derived from the orders. */
  servicesThisMonth: number;
  nextService: string | null;
}

/** An account that can sign in (a Cognito user). */
export interface AccountUser {
  email: string;
  status: string;
  enabled: boolean;
  createdAt: string;
}

export type VehicleInput = Pick<Vehicle, "code" | "capacity" | "minCapacity" | "kind" | "model" | "plates" | "driver" | "active">;

/* ---------------------------------------------------------------- services */

export interface VariableOption {
  value: string;
  label: string;
}

export interface Variable {
  key: string;
  label: string;
  options: VariableOption[];
  /** Only asked (and required) when these selections match. */
  showWhen?: Record<string, string>;
}

/** One price: for a vehicle capacity, when every `sel` entry matches the order's choices. */
export interface PriceRow {
  sel: Record<string, string>;
  capacity: number;
  price: number;
}

/** Extra on top of the base price. `amounts` is keyed by capacity, "*" = any / flat. */
export interface Charge {
  id: string;
  label: string;
  /** manual: the operator enters a quantity. conditional: applied when `when` matches. */
  mode: "manual" | "conditional";
  perUnit: boolean;
  amounts: Record<string, number>;
  when?: Record<string, string>;
}

export interface ServiceInput {
  name: string;
  description?: string;
  active: boolean;
  variables: Variable[];
  prices: PriceRow[];
  charges: Charge[];
}

export interface Service extends ServiceInput {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderLine {
  qty: number | null;
  concept: string;
  /** Negative for discounts. */
  amount: number;
}

export interface Quote {
  lines: OrderLine[];
  total: number;
  /** Capacities with no price for the chosen options. */
  unpriced: number[];
  errors: string[];
  ok: boolean;
}

export interface QuoteRequest {
  serviceId: string;
  selections: Record<string, string>;
  passengers?: number;
  units?: number[];
  routeLabel?: string;
  manual?: { chargeId: string; qty: number }[];
  adjustments?: { concept: string; amount: number }[];
}

export interface QuoteResponse {
  units: number[];
  quote: Quote;
}

/* ------------------------------------------------------------------ orders */

export interface Payment {
  id: string;
  amount: number;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  method: string;
}

export interface OrderVehicle {
  capacity: number;
  vehicleId: string | null;
  code: string | null;
}

export interface Order {
  id: string;
  folio: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  serviceId: string;
  serviceName: string;
  selections: Record<string, string>;
  /** Human-readable choices, e.g. "Chapala · Mismo día". */
  serviceLabel: string;
  route: RouteType;
  /** ISO date of the service. */
  date: string;
  /** 24h "HH:MM". */
  departureTime: string;
  returnTime: string | null;
  origin: string;
  destination: string;
  passengers: number;
  units: number[];
  vehicles: OrderVehicle[];
  lines: OrderLine[];
  total: number;
  /** What the price list recommended; present only when the final price was changed by hand. */
  recommendedTotal?: number;
  payments: Payment[];
  status: OrderStatus;
  contractSigned: boolean;
  notes?: string;
  /** Free text for the itinerary page of the order document. */
  itinerary?: string;
  /** Document chosen when the order was created (omitted = the assigned one). */
  templateId?: string;
  /** ISO date the quote was issued. */
  issuedAt: string;
}

/** Create/payment responses also carry the documents generated by template triggers. */
export type OrderWithDocuments = Order & { documents?: GeneratedDocument[] };

export interface NewOrder {
  client: { clientId: string } | { name: string; phone?: string; email?: string };
  serviceId: string;
  selections: Record<string, string>;
  passengers: number;
  units?: number[];
  vehicleIds?: string[];
  route: RouteType;
  date: string;
  departureTime: string;
  returnTime: string | null;
  origin: string;
  destination: string;
  manual?: { chargeId: string; qty: number }[];
  adjustments?: { concept: string; amount: number }[];
  deposit?: { amount: number; date: string; method?: string };
  notes?: string;
  itinerary?: string;
  /** Final price when it differs from the recommended one; the difference becomes an "Ajuste de precio" line. */
  priceOverride?: number;
  /** A template id, null for no document, omitted for the assigned one. */
  templateId?: string | null;
}

export interface OrderPatch {
  date?: string;
  departureTime?: string;
  returnTime?: string | null;
  origin?: string;
  destination?: string;
  notes?: string;
  itinerary?: string;
  contractSigned?: boolean;
  status?: "active" | "done" | "cancelled";
}

export interface MonthSummary {
  /** ISO month, e.g. "2026-09". Orders are grouped by service date. */
  month: string;
  quoted: number;
  /** Payments received during the month. */
  earned: number;
  quotedByService: Record<string, number>;
  receivable: number;
  lateOrders: number;
  upcoming7d: number;
  upcoming: { orderId: string; folio: string; date: string; clientName: string; serviceName: string }[];
}

/* --------------------------------------------------------------- documents */

export type TemplateKind = "order" | "contract" | "receipt" | "other";
export type TemplateTrigger = "quote" | "deposit" | "payment" | "manual";
export type FieldType = "text" | "date" | "money" | "sign" | "check" | "lines";

export interface TemplateField {
  id: string;
  page: number;
  label: string;
  /** Order variable that fills the field, e.g. "client.name"; null = not mapped yet. Used when `text` is empty. */
  variable: string | null;
  type: FieldType;
  /** What the field prints: plain text with {variables}, e.g. "Fecha: {fecha}". Wins over `variable`. */
  text?: string;
  /** Patch color hiding the original text underneath (baked in when the page is flattened). */
  cover?: string;
  /** Exact areas to patch when the original text is several lines that do not fill the box. Defaults to the whole box. */
  coverRects?: { x: number; y: number; w: number; h: number }[];
  /** Gap before the first line, for paragraphs that start after a label. */
  indent?: number;
  /** Text size in editor points, line pitch for multi-line text, weight, alignment and color. */
  fontSize?: number;
  lineHeight?: number;
  bold?: boolean;
  align?: "left" | "center" | "right";
  color?: string;
  /** Position and size in PDF points on a 600×776 page (origin top-left). */
  x: number;
  y: number;
  w: number;
  h: number;
  required: boolean;
}

/** ProseMirror JSON, what the document editor produces. */
export interface PmMark {
  type: string;
  attrs?: Record<string, unknown>;
}
export interface PmNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: PmNode[];
  text?: string;
  marks?: PmMark[];
}
/** Body plus an optional header and footer repeated on every page. */
export interface TemplateContent {
  body: PmNode;
  header?: PmNode;
  footer?: PmNode;
}

/** "pdf": a blank PDF with positioned fields. "document": written in the editor with {variables}. */
export type TemplateMode = "pdf" | "document";

export interface DocumentTemplate {
  id: string;
  name: string;
  kind: TemplateKind;
  trigger: TemplateTrigger;
  mode: TemplateMode;
  fileName: string;
  pages: number;
  fields: TemplateField[];
  /** Pages that print only when the order has that data (token such as "itinerario"). */
  pageRules?: { page: number; onlyIf: string }[];
  /** Only for mode "document". */
  content?: TemplateContent;
  status: "published" | "draft";
  sendByWhatsApp: boolean;
  requestSignature: boolean;
  /** S3 key of the printable PDF; null until one is uploaded. Edited pages are flattened images. */
  fileKey: string | null;
  /** The PDF exactly as uploaded, kept to edit its text again; null when it is the same as fileKey. */
  sourceKey?: string | null;
  updatedAt: string;
}

/** What the editor sends; the API fills in id, fileKey and timestamps. */
export type TemplateInput = Omit<DocumentTemplate, "id" | "fileKey" | "sourceKey" | "updatedAt">;

export interface TemplateVariable {
  id: string;
  /** What is typed in a document: {cliente}. */
  token: string;
  label: string;
  type: FieldType;
}

export interface GeneratedDocument {
  id: string;
  templateId: string;
  templateName: string;
  orderId: string;
  orderFolio: string;
  clientName: string;
  /** ISO datetime. */
  createdAt: string;
  channel: "Descarga";
  fileName: string;
  /** Temporary download link (1 hour). */
  url: string;
}

/** Which template each purpose uses. The order template is generated with every new order. */
export interface Assignments {
  order: string | null;
}

export interface TemplateVariables {
  variables: TemplateVariable[];
  /** Markers that are not order data: {pagina}, {paginas}, {salto}. */
  special: { token: string; label: string }[];
}
