import type { BadgeTone } from "@/components/ui/status-badge";

import type { Order, OrderStatus } from "./types";

export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: BadgeTone }> = {
  quote: { label: "Cotización", tone: "pending" },
  deposit: { label: "Con anticipo", tone: "ongoing" },
  late: { label: "Pago vencido", tone: "delayed" },
  paid: { label: "Liquidada", tone: "completed" },
  done: { label: "Realizada", tone: "completed" },
  cancelled: { label: "Cancelada", tone: "pending" },
};

export const paidAmount = (o: Pick<Order, "payments">) => o.payments.reduce((sum, p) => sum + p.amount, 0);
export const dueAmount = (o: Pick<Order, "payments" | "total">) => Math.max(0, Math.round((o.total - paidAmount(o)) * 100) / 100);
