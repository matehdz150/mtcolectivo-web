"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";

import { api } from "./api";
import type { ClientInput, NewOrder, OrderPatch, Payment, QuoteRequest, ServiceInput, TemplateInput, VehicleInput } from "./types";

/** Query keys in one place so mutations can invalidate precisely. */
export const keys = {
  summary: (month: string) => ["summary", month] as const,
  orders: ["orders"] as const,
  order: (id: string) => ["orders", id] as const,
  clients: ["clients"] as const,
  users: ["users"] as const,
  vehicles: ["vehicles"] as const,
  services: ["services"] as const,
  templates: ["templates"] as const,
  template: (id: string) => ["templates", id] as const,
  templateVariables: ["template-variables"] as const,
  assignments: ["assignments"] as const,
  documents: ["documents"] as const,
  orderDocuments: (orderId: string) => ["documents", "order", orderId] as const,
};

/** An order or payment changes what several screens show: refresh them all. */
function refreshOrderData(qc: QueryClient) {
  for (const key of [keys.orders, keys.clients, keys.vehicles, ["summary"], keys.documents]) qc.invalidateQueries({ queryKey: key });
}

/* ----------------------------------------------------------------- queries */

export const useMonthSummary = (month: string) => useQuery({ queryKey: keys.summary(month), queryFn: () => api.getMonthSummary(month) });
export const useOrders = () => useQuery({ queryKey: keys.orders, queryFn: api.getOrders });
export const useOrder = (id: string | null) => useQuery({ queryKey: keys.order(id ?? ""), queryFn: () => api.getOrder(id as string), enabled: !!id });
export const useClients = () => useQuery({ queryKey: keys.clients, queryFn: api.getClients });
export const useVehicles = () => useQuery({ queryKey: keys.vehicles, queryFn: api.getVehicles });
export const useUsers = () => useQuery({ queryKey: keys.users, queryFn: api.getUsers });
export const useServices = () => useQuery({ queryKey: keys.services, queryFn: api.getServices });
export const useTemplates = () => useQuery({ queryKey: keys.templates, queryFn: api.getTemplates });
export const useTemplate = (id: string | null) => useQuery({ queryKey: keys.template(id ?? ""), queryFn: () => api.getTemplate(id as string), enabled: !!id });
export const useTemplateVariables = () => useQuery({ queryKey: keys.templateVariables, queryFn: api.getTemplateVariables, staleTime: Infinity });
export const useAssignments = () => useQuery({ queryKey: keys.assignments, queryFn: api.getAssignments });
export const useGeneratedDocuments = () => useQuery({ queryKey: keys.documents, queryFn: () => api.getGeneratedDocuments(10) });
export const useOrderDocuments = (orderId: string | null) =>
  useQuery({ queryKey: keys.orderDocuments(orderId ?? ""), queryFn: () => api.getOrderDocuments(orderId as string), enabled: !!orderId });

/** Live price from the API. Keeps the previous answer on screen while the next one loads. */
export const useQuote = (request: QuoteRequest | null) =>
  useQuery({
    queryKey: ["quote", request],
    queryFn: () => api.quote(request as QuoteRequest),
    enabled: request !== null,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    retry: false,
  });

/* --------------------------------------------------------------- mutations */

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: NewOrder) => api.createOrder(input),
    onSuccess: (order) => {
      qc.setQueryData(keys.order(order.id), order);
      refreshOrderData(qc);
    },
  });
}

export function useUpdateOrder(orderId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: OrderPatch) => api.updateOrder(orderId, patch),
    onSuccess: (order) => {
      qc.setQueryData(keys.order(order.id), order);
      refreshOrderData(qc);
    },
  });
}

export function useAddPayment(orderId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payment: Omit<Payment, "id">) => api.addPayment(orderId, payment),
    onSuccess: (order) => {
      qc.setQueryData(keys.order(order.id), order);
      qc.invalidateQueries({ queryKey: keys.orderDocuments(orderId) });
      refreshOrderData(qc);
    },
  });
}

export function useRemovePayment(orderId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (paymentId: string) => api.removePayment(orderId, paymentId),
    onSuccess: (order) => {
      qc.setQueryData(keys.order(order.id), order);
      refreshOrderData(qc);
    },
  });
}

export function useGenerateDocument(orderId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (templateId?: string) => api.generateDocument(orderId, templateId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.orderDocuments(orderId) });
      qc.invalidateQueries({ queryKey: keys.documents });
    },
  });
}

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (input: Partial<ClientInput> & { name: string }) => api.createClient(input), onSuccess: () => qc.invalidateQueries({ queryKey: keys.clients }) });
}

export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<ClientInput> }) => api.updateClient(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.clients }),
  });
}

export function useDeleteClient() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => api.deleteClient(id), onSuccess: () => qc.invalidateQueries({ queryKey: keys.clients }) });
}

export function useCreateVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<VehicleInput> & Pick<VehicleInput, "code" | "capacity" | "kind">) => api.createVehicle(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.vehicles }),
  });
}

export function useUpdateVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<VehicleInput> }) => api.updateVehicle(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.vehicles }),
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (input: { email: string; password?: string }) => api.createUser(input), onSuccess: () => qc.invalidateQueries({ queryKey: keys.users }) });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (email: string) => api.deleteUser(email), onSuccess: () => qc.invalidateQueries({ queryKey: keys.users }) });
}

export function useDeleteVehicle() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => api.deleteVehicle(id), onSuccess: () => qc.invalidateQueries({ queryKey: keys.vehicles }) });
}

export function useCreateService() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (input: ServiceInput) => api.createService(input), onSuccess: () => qc.invalidateQueries({ queryKey: keys.services }) });
}

export function useSaveService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ServiceInput }) => api.saveService(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.services });
      qc.invalidateQueries({ queryKey: ["quote"] });
    },
  });
}

export function useDuplicateService() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => api.duplicateService(id), onSuccess: () => qc.invalidateQueries({ queryKey: keys.services }) });
}

export function useDeleteService() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => api.deleteService(id), onSuccess: () => qc.invalidateQueries({ queryKey: keys.services }) });
}

export function useSaveTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ input, id, file, source, clearSource }: { input: TemplateInput; id?: string; file?: Blob; source?: Blob; clearSource?: boolean }) => api.saveTemplate(input, { id, file, source, clearSource }),
    onSuccess: (template) => {
      qc.setQueryData(keys.template(template.id), template);
      qc.invalidateQueries({ queryKey: keys.templates });
    },
  });
}

export function useSetAssignments() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (order: string | null) => api.setAssignments({ order }), onSuccess: () => qc.invalidateQueries({ queryKey: keys.assignments }) });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => api.deleteTemplate(id), onSuccess: () => qc.invalidateQueries({ queryKey: keys.templates }) });
}

/** Temporary link to the base PDF of a template (for the editor's canvas). */
export const useTemplateFileUrl = (id: string | null, enabled: boolean) =>
  useQuery({ queryKey: [...keys.templates, id, "file"], queryFn: () => api.getTemplateFileUrl(id as string), enabled: !!id && enabled, staleTime: 30 * 60_000 });

/** Temporary link to the PDF as uploaded, so its text can be picked and edited. */
export const useTemplateSourceUrl = (id: string | null, enabled: boolean) =>
  useQuery({ queryKey: [...keys.templates, id, "source"], queryFn: () => api.getTemplateSourceUrl(id as string), enabled: !!id && enabled, staleTime: 30 * 60_000 });
