"use client";

import Link from "next/link";
import { useState } from "react";

import { FilterTabs } from "@/components/ui/filter-tabs";
import { Icon } from "@/components/ui/icon";
import { MiniBar } from "@/components/ui/meters";
import { EmptyState, ErrorState, PageHeader, Skeleton } from "@/components/ui/misc";
import { StatusBadge } from "@/components/ui/status-badge";
import { TextField } from "@/components/ui/text-field";
import { money, monthLabel, shortDate, time12 } from "@/lib/format";
import { dueAmount, ORDER_STATUS, paidAmount } from "@/lib/order-status";
import { serviceLabel, serviceShort, unitName } from "@/lib/pricing";
import { useMonthSummary, useOrders } from "@/lib/queries";
import type { OrderStatus } from "@/lib/types";

// TODO: mes activo desde un selector; por ahora el mes de los datos de ejemplo.
const MONTH = "2026-09";

type Filter = "all" | OrderStatus;

export default function OrdersPage() {
  const orders = useOrders();
  const summary = useMonthSummary(MONTH);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const list = orders.data ?? [];
  const q = search.trim().toLowerCase();
  const visible = list.filter(
    (o) =>
      (filter === "all" || o.status === filter) &&
      (!q || [o.folio, o.clientName, o.destination, serviceLabel(o.service)].some((s) => s.toLowerCase().includes(q))),
  );

  const count = (s: OrderStatus) => list.filter((o) => o.status === s).length;
  const tabs = [
    { id: "all" as const, label: "Todas", count: list.length },
    { id: "quote" as const, label: "Cotizaciones", count: count("quote") },
    { id: "deposit" as const, label: "Con anticipo", count: count("deposit") },
    { id: "late" as const, label: "Pago vencido", count: count("late") },
    { id: "paid" as const, label: "Liquidadas", count: count("paid") },
    { id: "done" as const, label: "Realizadas", count: count("done") },
  ];

  const s = summary.data;
  const typeTotal = s ? s.quotedByType.amatitan + s.quotedByType.evento + s.quotedByType.turismo : 0;

  return (
    <>
      <PageHeader
        title="Órdenes"
        subtitle={`Cotizaciones y órdenes de servicio · ${monthLabel(MONTH)}`}
        actions={
          <>
            <TextField label="Buscar" className="w-[280px] [&>label]:sr-only" icon="search" placeholder="Buscar folio, cliente o destino" value={search} onChange={(e) => setSearch(e.target.value)} />
            <Link href="/ordenes/nueva" className="inline-flex h-11 items-center gap-2 rounded-md bg-ink px-[18px] text-sm font-semibold text-surface hover:bg-ink-secondary">
              <Icon name="plus" size={16} strokeWidth={2} />
              Nueva orden
            </Link>
          </>
        }
      />

      <section aria-label="Resumen del mes" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className="flex flex-col gap-2.5 rounded-[20px] bg-surface px-5 py-[18px] shadow-row">
          <span className="text-xs font-semibold text-ink-muted">Cotizado en {monthLabel(MONTH).split(" ")[0]}</span>
          <span className="text-[28px] font-bold tabular-nums tracking-[-0.02em]">{s ? money(s.quoted) : "—"}</span>
          {s && typeTotal > 0 ? (
            <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-sm" aria-hidden="true">
              <span className="bg-ink" style={{ width: `${(s.quotedByType.amatitan / typeTotal) * 100}%` }} />
              <span className="bg-control-strong" style={{ width: `${(s.quotedByType.evento / typeTotal) * 100}%` }} />
              <span className="bg-mint" style={{ width: `${(s.quotedByType.turismo / typeTotal) * 100}%` }} />
            </div>
          ) : null}
          <span className="text-[11px] text-ink-muted">
            {s ? `Amatitán ${money(s.quotedByType.amatitan)} · Especiales ${money(s.quotedByType.evento)} · Turismo ${money(s.quotedByType.turismo)}` : "Cargando…"}
          </span>
        </div>
        <div className="flex flex-col gap-2.5 rounded-[20px] bg-mint px-5 py-[18px] text-on-mint">
          <span className="text-xs font-semibold">Ganancia del mes</span>
          <span className="text-[28px] font-bold tabular-nums tracking-[-0.02em]">{s ? money(s.earned) : "—"}</span>
          <span className="text-[11px]">{s && s.quoted ? `${Math.round((s.earned / s.quoted) * 100)}% de lo cotizado, después de pagar a proveedores` : ""}</span>
        </div>
        <div className="flex flex-col gap-2.5 rounded-[20px] bg-surface px-5 py-[18px] shadow-row">
          <span className="text-xs font-semibold text-ink-muted">Por cobrar a clientes</span>
          <span className="text-[28px] font-bold tabular-nums tracking-[-0.02em]">{s ? money(s.receivable) : "—"}</span>
          {s?.lateOrders ? <span className="text-[11px] font-semibold text-danger">{s.lateOrders === 1 ? "1 orden con pago vencido" : `${s.lateOrders} órdenes con pago vencido`}</span> : null}
        </div>
        <div className="flex flex-col gap-2.5 rounded-[20px] bg-surface px-5 py-[18px] shadow-row">
          <span className="text-xs font-semibold text-ink-muted">Servicios en los próximos 7 días</span>
          <span className="text-[28px] font-bold tabular-nums tracking-[-0.02em]">{s ? s.upcoming7d : "—"}</span>
          <span className="text-[11px] text-ink-muted">{s?.upcomingDetail}</span>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <FilterTabs label="Filtrar por etapa" tabs={tabs} value={filter} onChange={setFilter} />
        <span className="text-[13px] text-ink-muted">
          Mostrando {visible.length} de {list.length} órdenes
        </span>
      </div>

      {orders.isPending ? (
        <Skeleton rows={8} />
      ) : orders.isError ? (
        <ErrorState message="No pudimos cargar las órdenes." onRetry={() => orders.refetch()} />
      ) : visible.length === 0 ? (
        <EmptyState title="No hay órdenes con ese filtro" body="Cambia la etapa o la búsqueda." />
      ) : (
        <div className="overflow-x-auto rounded-xl bg-surface px-2 py-1 shadow-row">
          <table className="w-full min-w-[1100px] border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-muted">
                {["Folio", "Cliente", "Servicio", "Fecha", "Unidad", "Proveedor", "Total", "Pagado", "Estado"].map((h) => (
                  <th key={h} className={`px-3.5 py-3 font-semibold ${h === "Total" ? "text-right" : ""}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((o) => {
                const status = ORDER_STATUS[o.status];
                return (
                  <tr key={o.id} className="border-t border-line align-middle hover:bg-canvas/60">
                    <td className="whitespace-nowrap px-3.5 py-2.5">
                      <Link href={`/ordenes/detalle?id=${o.id}`} className="font-semibold tabular-nums underline-offset-2 hover:underline">
                        {o.folio.replace("OS-2026-", "OS-")}
                      </Link>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <div className="font-semibold">{o.clientName}</div>
                      <div className="text-[11px] text-ink-muted">{o.contractSigned ? "Contrato firmado" : "Sin contrato"}</div>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <div className="font-medium">{serviceShort(o.service)}</div>
                      <div className="text-[11px] text-ink-muted">{o.service.type === "amatitan" ? `Cantaritos · ${o.service.amatitanShift === "am" ? "matutino" : "vespertino"}` : o.service.type === "evento" ? o.service.eventDescription : `${o.service.destination} · ${o.service.days === 1 ? "mismo día" : `${o.service.days} días`}`}</div>
                    </td>
                    <td className="whitespace-nowrap px-3.5 py-2.5 text-ink-secondary">
                      {shortDate(o.date)} · {time12(o.departureTime)}
                    </td>
                    <td className="px-3.5 py-2.5">
                      <span className="inline-flex h-7 items-center gap-2 whitespace-nowrap rounded-full bg-card pl-2.5 pr-3 text-xs font-semibold">
                        <Icon name={o.units.includes(45) ? "bus" : "van"} size={15} />
                        {o.units.map(unitName).join(" + ")}
                      </span>
                      <div className="mt-0.5 text-[11px] text-ink-muted">{o.passengers} pasajeros</div>
                    </td>
                    <td className="whitespace-nowrap px-3.5 py-2.5 text-ink-secondary">{o.providerName}</td>
                    <td className="px-3.5 py-2.5 text-right font-bold tabular-nums">{money(o.total)}</td>
                    <td className="px-3.5 py-2.5" title={`Pagado ${money(paidAmount(o))} · por liquidar ${money(dueAmount(o))}`}>
                      <MiniBar ratio={o.total ? paidAmount(o) / o.total : 0} />
                    </td>
                    <td className="px-3.5 py-2.5">
                      <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
