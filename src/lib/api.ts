import { getIdToken, signOut } from "./auth";
import type {
  Assignments,
  Client,
  ClientInput,
  DocumentTemplate,
  GeneratedDocument,
  MonthSummary,
  NewOrder,
  Order,
  OrderPatch,
  OrderWithDocuments,
  Payment,
  QuoteRequest,
  QuoteResponse,
  Service,
  ServiceInput,
  TemplateContent,
  TemplateInput,
  TemplateVariables,
  Vehicle,
  VehicleInput,
  AccountUser,
} from "./types";

/**
 * API client. Every function maps to one REST endpoint of mtcolectivo-infra.
 * NEXT_PUBLIC_API_URL points at the API Gateway URL; requests carry the
 * Cognito id token.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** Validation problems returned by the API, when any. */
    readonly details?: string[],
  ) {
    super(message);
  }
}

async function send(path: string, init: RequestInit, token: string | null): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers },
  });
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!API_URL) throw new ApiError("Falta NEXT_PUBLIC_API_URL: la app no sabe a qué servidor conectarse.", 0);
  let res = await send(path, init, await getIdToken());
  if (res.status === 401) {
    // The token may have just expired: try once with a fresh one before giving up.
    const fresh = await getIdToken(true);
    if (fresh) res = await send(path, init, fresh);
    if (res.status === 401) {
      signOut();
      throw new ApiError("Tu sesión terminó. Inicia sesión de nuevo.", 401);
    }
  }
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const details = Array.isArray(body?.details) ? body.details.map(String) : undefined;
    throw new ApiError(body?.error ?? `${init.method ?? "GET"} ${path} respondió ${res.status}`, res.status, details);
  }
  return body as T;
}

const json = (method: string, body?: unknown): RequestInit => ({ method, body: body === undefined ? undefined : JSON.stringify(body) });

export const api = {
  /* summary */
  getMonthSummary: (month: string) => request<MonthSummary>(`/summary?month=${month}`),

  /* orders */
  getOrders: () => request<Order[]>("/orders"),
  getOrder: (id: string) => request<Order>(`/orders/${id}`),
  createOrder: (input: NewOrder) => request<OrderWithDocuments>("/orders", json("POST", input)),
  updateOrder: (id: string, patch: OrderPatch) => request<Order>(`/orders/${id}`, json("PATCH", patch)),
  addPayment: (orderId: string, payment: Omit<Payment, "id">) => request<OrderWithDocuments>(`/orders/${orderId}/payments`, json("POST", payment)),
  removePayment: (orderId: string, paymentId: string) => request<Order>(`/orders/${orderId}/payments/${paymentId}`, json("DELETE")),

  /* clients */
  getClients: () => request<Client[]>("/clients"),
  createClient: (input: Partial<ClientInput> & { name: string }) => request<Client>("/clients", json("POST", input)),
  updateClient: (id: string, patch: Partial<ClientInput>) => request<Client>(`/clients/${id}`, json("PATCH", patch)),
  deleteClient: (id: string) => request<void>(`/clients/${id}`, json("DELETE")),

  /* vehicles */
  getVehicles: () => request<Vehicle[]>("/vehicles"),
  createVehicle: (input: Partial<VehicleInput> & Pick<VehicleInput, "code" | "capacity" | "kind">) => request<Vehicle>("/vehicles", json("POST", input)),
  updateVehicle: (id: string, patch: Partial<VehicleInput>) => request<Vehicle>(`/vehicles/${id}`, json("PATCH", patch)),
  deleteVehicle: (id: string) => request<void>(`/vehicles/${id}`, json("DELETE")),

  /* accounts that can sign in */
  getUsers: () => request<AccountUser[]>("/users"),
  createUser: (input: { email: string; password?: string }) => request<{ email: string; temporaryPassword?: string }>("/users", json("POST", input)),
  deleteUser: (email: string) => request<void>(`/users?email=${encodeURIComponent(email)}`, json("DELETE")),

  /* services and prices */
  getServices: () => request<Service[]>("/services"),
  getService: (id: string) => request<Service>(`/services/${id}`),
  createService: (input: ServiceInput) => request<Service>("/services", json("POST", input)),
  saveService: (id: string, input: ServiceInput) => request<Service>(`/services/${id}`, json("PUT", input)),
  duplicateService: (id: string) => request<Service>(`/services/${id}/duplicate`, json("POST")),
  deleteService: (id: string) => request<void>(`/services/${id}`, json("DELETE")),
  /** Price preview with the same engine that prices the order. */
  quote: (input: QuoteRequest) => request<QuoteResponse>("/quote", json("POST", input)),

  /* document templates */
  getTemplateVariables: () => request<TemplateVariables>("/template-variables"),
  getAssignments: () => request<Assignments>("/settings/assignments"),
  setAssignments: (input: Assignments) => request<Assignments>("/settings/assignments", json("PUT", input)),
  /** Renders an unsaved document with a real order (or a sample) and returns the PDF to show. */
  previewDocument: async (content: TemplateContent, orderId?: string): Promise<Blob> => {
    const { pdf } = await request<{ pdf: string }>("/templates/preview", json("POST", { content, orderId }));
    const bytes = Uint8Array.from(atob(pdf), (c) => c.charCodeAt(0));
    return new Blob([bytes], { type: "application/pdf" });
  },
  getTemplates: () => request<DocumentTemplate[]>("/templates"),
  getTemplate: (id: string) => request<DocumentTemplate>(`/templates/${id}`),
  /** Link to view the base PDF of a template. */
  getTemplateFileUrl: (id: string) => request<{ url: string }>(`/templates/${id}/file`),
  /** Link to the PDF as uploaded (its text is still editable). */
  getTemplateSourceUrl: (id: string) => request<{ url: string }>(`/templates/${id}/source`),

  /**
   * Creates or updates a template. When a new PDF is given it is uploaded
   * straight to S3 through a presigned URL returned by the API.
   */
  saveTemplate: async (input: TemplateInput, options: { id?: string; file?: Blob; source?: Blob; clearSource?: boolean }): Promise<DocumentTemplate> => {
    const { id, file, source, clearSource } = options;
    const body = { ...input, newFile: file ? true : undefined, newSource: file && source ? true : undefined, clearSource: file && !source && clearSource ? true : undefined };
    const saved = await request<DocumentTemplate & { uploadUrl?: string; sourceUploadUrl?: string }>(id ? `/templates/${id}` : "/templates", json(id ? "PUT" : "POST", body));
    const put = async (url: string | undefined, blob: Blob | undefined) => {
      if (!url || !blob) return;
      const up = await fetch(url, { method: "PUT", headers: { "Content-Type": "application/pdf" }, body: blob });
      if (!up.ok) throw new ApiError("No pudimos subir el PDF. Intenta de nuevo.", up.status);
    };
    await put(saved.uploadUrl, file);
    await put(saved.sourceUploadUrl, source);
    const template: DocumentTemplate & { uploadUrl?: string; sourceUploadUrl?: string } = { ...saved };
    delete template.uploadUrl;
    delete template.sourceUploadUrl;
    return template;
  },
  deleteTemplate: (id: string) => request<void>(`/templates/${id}`, json("DELETE")),

  /* generated documents */
  getGeneratedDocuments: (limit = 10) => request<GeneratedDocument[]>(`/documents?limit=${limit}`),
  getOrderDocuments: (orderId: string) => request<GeneratedDocument[]>(`/orders/${orderId}/documents`),
  /** Without a templateId the order template assigned in Documentos is used. */
  generateDocument: (orderId: string, templateId?: string) => request<GeneratedDocument>(`/orders/${orderId}/documents`, json("POST", { templateId })),
};
