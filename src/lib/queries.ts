"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "./api";
import type { DocumentTemplate, NewOrder, NewVehicle, Payment } from "./types";

/** Query keys in one place so mutations can invalidate precisely. */
export const keys = {
  summary: (month: string) => ["summary", month] as const,
  orders: ["orders"] as const,
  order: (id: string) => ["orders", id] as const,
  clients: ["clients"] as const,
  providers: ["providers"] as const,
  tariffs: ["tariffs"] as const,
  vehicles: ["vehicles"] as const,
  templates: ["templates"] as const,
  template: (id: string) => ["templates", id] as const,
  documents: ["documents"] as const,
};

export const useMonthSummary = (month: string) => useQuery({ queryKey: keys.summary(month), queryFn: () => api.getMonthSummary(month) });
export const useOrders = () => useQuery({ queryKey: keys.orders, queryFn: api.getOrders });
export const useOrder = (id: string | null) =>
  useQuery({ queryKey: keys.order(id ?? ""), queryFn: () => api.getOrder(id as string), enabled: !!id });
export const useClients = () => useQuery({ queryKey: keys.clients, queryFn: api.getClients });
export const useProviders = () => useQuery({ queryKey: keys.providers, queryFn: api.getProviders, staleTime: Infinity });
export const useTariffs = () => useQuery({ queryKey: keys.tariffs, queryFn: api.getTariffs, staleTime: Infinity });
export const useVehicles = () => useQuery({ queryKey: keys.vehicles, queryFn: api.getVehicles });
export const useTemplates = () => useQuery({ queryKey: keys.templates, queryFn: api.getTemplates });
export const useTemplate = (id: string | null) =>
  useQuery({ queryKey: keys.template(id ?? ""), queryFn: () => api.getTemplate(id as string), enabled: !!id });
export const useGeneratedDocuments = () => useQuery({ queryKey: keys.documents, queryFn: api.getGeneratedDocuments });

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: NewOrder) => api.createOrder(input),
    onSuccess: (order) => {
      qc.setQueryData(keys.order(order.id), order);
      qc.invalidateQueries({ queryKey: keys.orders });
      qc.invalidateQueries({ queryKey: keys.clients });
    },
  });
}

export function useAddPayment(orderId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payment: Omit<Payment, "id">) => api.addPayment(orderId, payment),
    onSuccess: (order) => {
      qc.setQueryData(keys.order(order.id), order);
      qc.invalidateQueries({ queryKey: keys.orders });
    },
  });
}

export function useCreateVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: NewVehicle) => api.createVehicle(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.vehicles }),
  });
}

export function useSaveTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ template, isNew, file }: { template: DocumentTemplate; isNew: boolean; file?: File }) =>
      api.saveTemplate(template, { isNew, file }),
    onSuccess: (template) => {
      qc.setQueryData(keys.template(template.id), template);
      qc.invalidateQueries({ queryKey: keys.templates });
    },
  });
}
