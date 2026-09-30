"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { MonthPicker } from "@/components/ui/date-picker";
import { FilterTabs } from "@/components/ui/filter-tabs";
import { Icon } from "@/components/ui/icon";
import { MiniBar } from "@/components/ui/meters";
import { EmptyState, ErrorState, PageHeader, Skeleton } from "@/components/ui/misc";
import { StatusBadge } from "@/components/ui/status-badge";
import { TextField } from "@/components/ui/text-field";
import { hasBus, unitName } from "@/lib/fleet";
import { useMobileSearch } from "@/lib/mobile-search";
import { money, monthLabel, shortDate, time12 } from "@/lib/format";
import { dueAmount, ORDER_STATUS, paidAmount } from "@/lib/order-status";
import { useMonthSummary, useOrders } from "@/lib/queries";
import type { OrderStatus } from "@/lib/types";

type Filter = "all" | OrderStatus;

const SEGMENT_COLORS = ["bg-ink", "bg-control-strong", "bg-mint", "bg-mint-deep", "bg-ink-muted"];

export default function OrdersPage() {
  const router = useRouter();
  const searchOpen = useMobileSearch("search-orders");
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const orders = useOrders();
  const summary = useMonthSummary(month);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const list = orders.data ?? [];
  const q = search.trim().toLowerCase();
  const visible = list.filter(
    (o) =>
      (filter === "all" || o.status === filter) &&
      (!q || [o.folio, o.clientName, o.destination, o.serviceName, o.serviceLabel].some((s) => s.toLowerCase().includes(q))),
  );

  const count = (s: OrderStatus) => list.filter((o) => o.status === s).length;
  const tabs = [
    { id: "all" as const, label: "Todas", count: list.length },
    { id: "quote" as const, label: "Cotizaciones", count: count("quote") },
    { id: "deposit" as const, label: "Con anticipo", count: count("deposit") },
    { id: "late" as const, label: "Pago vencido", count: count("late") },
    { id: "paid" as const, label: "Liquidadas", count: count("paid") },
    { id: "done" as const, label: "Realizadas", count: count("done") },
    { id: "cancelled" as const, label: "Canceladas", count: count("cancelled") },
  ];

  const s = summary.data;
  const services = s ? Object.entries(s.quotedByService).sort((a, b) => b[1] - a[1]) : [];
  const nextUp = s?.upcoming[0];

  return (
    <>
      <PageHeader
        title="Órdenes"
        subtitle={
          <>
            <span className="max-lg:hidden">Cotizaciones y órdenes de servicio · {monthLabel(month)}</span>
            <span className="lg:hidden">{monthLabel(month)}</span>
          </>
        }
        actions={
          <>
            <MonthPicker label="Mes" hideLabel className="w-[190px] max-lg:hidden" value={month} onChange={setMonth} />
            <TextField id="search-orders" label="Buscar" className={`w-[280px] max-lg:w-full [&>label]:sr-only ${searchOpen ? "" : "max-lg:hidden"}`} icon="search" placeholder="Buscar folio, cliente o destino" value={search} onChange={(e) => setSearch(e.target.value)} />
            <Link href="/ordenes/nueva" className="inline-flex h-11 items-center gap-2 rounded-md bg-ink px-[18px] text-sm font-semibold text-surface hover:bg-ink-secondary max-lg:hidden">
              <Icon name="plus" size={16} strokeWidth={2} />
              Nueva orden
            </Link>
          </>
        }
      />

      <section aria-label="Resumen del mes" className="grid grid-cols-2 gap-3 max-lg:-mx-5 max-lg:flex max-lg:snap-x max-lg:overflow-x-auto max-lg:px-5 max-lg:[&>*]:min-w-[240px] max-lg:[&>*]:shrink-0 max-lg:[&>*]:snap-start max-lg:[&>*]:rounded-3xl xl:grid-cols-4">
        <div className="flex flex-col gap-2.5 rounded-[20px] bg-surface px-5 py-[18px] shadow-row max-lg:hidden">
          <span className="text-xs font-semibold text-ink-muted">Cotizado en {monthLabel(month).split(" ")[0]}</span>
          <span className="text-[28px] font-bold tabular-nums tracking-[-0.02em]">{s ? money(s.quoted) : "—"}</span>
          {s && s.quoted > 0 ? (
            <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-sm" aria-hidden="true">
              {services.map(([name, total], i) => (
                <span key={name} className={SEGMENT_COLORS[i % SEGMENT_COLORS.length]} style={{ width: `${(total / s.quoted) * 100}%` }} />
              ))}
            </div>
          ) : null}
          <span className="text-[11px] text-ink-muted">
            {s ? (services.length ? services.map(([name, total]) => `${name} ${money(total)}`).join(" · ") : "Sin servicios este mes") : "Cargando…"}
          </span>
        </div>
        <div className="flex flex-col gap-2.5 rounded-[20px] bg-mint px-5 py-[18px] text-on-mint">
          <span className="text-xs font-semibold">Cobrado en el mes</span>
          <span className="text-[28px] font-bold tabular-nums tracking-[-0.02em]">{s ? money(s.earned) : "—"}</span>
          <span className="text-[11px]">Anticipos y abonos recibidos en {monthLabel(month).split(" ")[0]}</span>
        </div>
        <div className="flex flex-col gap-2.5 rounded-[20px] bg-surface px-5 py-[18px] shadow-row">
          <span className="text-xs font-semibold text-ink-muted">Por cobrar a clientes</span>
          <span className="text-[28px] font-bold tabular-nums tracking-[-0.02em]">{s ? money(s.receivable) : "—"}</span>
          {s?.lateOrders ? <span className="text-[11px] font-semibold text-danger">{s.lateOrders === 1 ? "1 orden con pago vencido" : `${s.lateOrders} órdenes con pago vencido`}</span> : null}
        </div>
        <div className="flex flex-col gap-2.5 rounded-[20px] bg-surface px-5 py-[18px] shadow-row">
          <span className="text-xs font-semibold text-ink-muted">Servicios en los próximos 7 días</span>
          <span className="text-[28px] font-bold tabular-nums tracking-[-0.02em]">{s ? s.upcoming7d : "—"}</span>
          <span className="truncate text-[11px] text-ink-muted">{nextUp ? `Sigue: ${nextUp.clientName} · ${shortDate(nextUp.date)}` : s ? "Sin servicios próximos" : ""}</span>
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
        <EmptyState title={list.length ? "No hay órdenes con ese filtro" : "Todavía no hay órdenes"} body={list.length ? "Cambia la etapa o la búsqueda." : "Crea la primera con “Nueva orden”."} />
      ) : (
        <>
        <div className="anim-list flex flex-col gap-3 lg:hidden">
          {visible.map((o) => {
            const status = ORDER_STATUS[o.status];
            return (
              <Link key={o.id} href={`/ordenes/detalle?id=${o.id}`} className="flex flex-col gap-3.5 rounded-3xl bg-surface p-[18px] shadow-row">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-bold tabular-nums text-ink-muted">{o.folio}</span>
                  <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[19px] font-bold tracking-[-0.02em]">{o.clientName}</span>
                  <span className="text-sm text-ink-secondary">
                    {o.serviceName} · {o.serviceLabel}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 text-[13px] text-ink-secondary">
                  <span>
                    {shortDate(o.date)} · {time12(o.departureTime)}
                  </span>
                  <span className="inline-flex h-[26px] items-center gap-1.5 whitespace-nowrap rounded-full bg-card px-2.5 text-xs font-semibold text-ink">
                    <Icon name={hasBus(o.units) ? "bus" : "van"} size={14} />
                    {o.units.map(unitName).join(" + ")}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <MiniBar ratio={o.total ? paidAmount(o) / o.total : 0} />
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-ink-muted">Pagado {money(paidAmount(o))}</span>
                    <span className="text-xl font-bold tracking-[-0.02em] tabular-nums">{money(o.total)}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
        <div className="overflow-x-auto rounded-xl bg-surface px-2 py-1 shadow-row max-lg:hidden">
          <table className="w-full min-w-[1000px] border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-muted">
                {["Folio", "Cliente", "Servicio", "Fecha", "Unidad", "Total", "Pagado", "Estado"].map((h) => (
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
                  <tr
                    key={o.id}
                    // The whole row opens the order; the folio link keeps working for keyboards and middle-click.
                    onClick={(e) => !(e.target as HTMLElement).closest("a, button") && router.push(`/ordenes/detalle?id=${o.id}`)}
                    className="cursor-pointer border-t border-line align-middle hover:bg-canvas/60"
                  >
                    <td className="whitespace-nowrap px-3.5 py-2.5">
                      <Link href={`/ordenes/detalle?id=${o.id}`} className="font-semibold tabular-nums underline-offset-2 hover:underline">
                        {o.folio}
                      </Link>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <div className="font-semibold">{o.clientName}</div>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <div className="font-medium">{o.serviceName}</div>
                      <div className="text-[11px] text-ink-muted">{o.serviceLabel}</div>
                    </td>
                    <td className="whitespace-nowrap px-3.5 py-2.5 text-ink-secondary">
                      {shortDate(o.date)} · {time12(o.departureTime)}
                    </td>
                    <td className="px-3.5 py-2.5">
                      <span className="inline-flex h-7 items-center gap-2 whitespace-nowrap rounded-full bg-card pl-2.5 pr-3 text-xs font-semibold">
                        <Icon name={hasBus(o.units) ? "bus" : "van"} size={15} />
                        {o.units.map(unitName).join(" + ")}
                      </span>
                      <div className="mt-0.5 text-[11px] text-ink-muted">
                        {o.passengers} pasajeros{o.vehicles.some((v) => v.code) ? ` · ${o.vehicles.map((v) => v.code ?? "sin asignar").join(", ")}` : ""}
                      </div>
                    </td>
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
        </>
      )}

      <Link href="/ordenes/nueva" className="fixed bottom-24 right-5 z-30 flex h-14 items-center gap-2.5 rounded-full bg-ink pl-[18px] pr-[22px] text-base font-bold text-surface shadow-float lg:hidden">
        <Icon name="plus" size={22} strokeWidth={2.4} />
        Nueva orden
      </Link>
    </>
  );
}
