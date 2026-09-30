"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";

import { OrderDocument } from "@/components/orders/order-document";
import { Button } from "@/components/ui/button";
import { TickMeter } from "@/components/ui/meters";
import { ErrorState, PageHeader, Panel, Skeleton, Tag } from "@/components/ui/misc";
import { StatusBadge } from "@/components/ui/status-badge";
import { TextField } from "@/components/ui/text-field";
import { VehicleArt } from "@/components/ui/vehicle-art";
import { durationHours, longDate, money, numericDate, shortDate, time12 } from "@/lib/format";
import { dueAmount, ORDER_STATUS, paidAmount } from "@/lib/order-status";
import { serviceLabel, unitName } from "@/lib/pricing";
import { useAddPayment, useOrder, useTariffs } from "@/lib/queries";
import type { Order } from "@/lib/types";

// Static export: the order id travels as ?id= instead of a dynamic segment.
export default function OrderDetailPage() {
  return (
    <Suspense fallback={<Skeleton rows={8} />}>
      <OrderDetail />
    </Suspense>
  );
}

function OrderDetail() {
  const id = useSearchParams().get("id");
  const order = useOrder(id);
  const tariffs = useTariffs();

  if (!id) return <ErrorState message="Falta el folio de la orden en la dirección." />;
  if (order.isPending) return <Skeleton rows={8} />;
  if (order.isError) return <ErrorState message="No encontramos esa orden." onRetry={() => order.refetch()} />;

  const o = order.data;
  const status = ORDER_STATUS[o.status];
  const mainUnit = o.units.at(-1) ?? 14;

  return (
    <>
      <PageHeader
        crumb={
          <>
            <Link href="/ordenes" className="hover:text-ink">
              Órdenes
            </Link>{" "}
            / {o.folio}
          </>
        }
        title={
          <span className="flex flex-wrap items-center gap-3.5">
            {o.clientName}
            <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
          </span>
        }
        subtitle={`${o.folio} · ${serviceLabel(o.service)} · ${longDate(o.date)}`}
        actions={
          <>
            {/* TODO: el backend genera el PDF y lo envía. */}
            <Button variant="secondary" icon="file">
              Descargar PDF
            </Button>
            <Button variant="secondary" icon="phone">
              Enviar por WhatsApp
            </Button>
          </>
        }
      />

      <Progress order={o} />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_560px]">
        <div className="flex min-w-0 flex-col gap-4">
          <Panel className="grid items-center gap-6 md:grid-cols-[200px_minmax(0,1fr)]">
            <div className="flex flex-col items-start gap-3">
              <VehicleArt kind={o.units.includes(45) ? "bus" : "van"} width={170} />
              <div className="text-xl font-bold tracking-[-0.02em]">{o.units.map((c) => `${unitName(c)} pasajeros`).join(" + ")}</div>
              <Tag size="sm">{o.providerName}</Tag>
            </div>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3.5 text-sm sm:grid-cols-2">
              <Fact label="Servicio" value={serviceLabel(o.service)} />
              <Fact label="Fecha" value={longDate(o.date)} />
              <Fact label="Salida" value={o.origin} />
              <Fact label="Destino" value={o.destination} />
              <Fact
                label="Horario"
                value={o.route === "round" ? `${time12(o.departureTime)} – ${time12(o.returnTime)} · ${durationHours(o.departureTime, o.returnTime)} h` : `${time12(o.departureTime)} · solo ida`}
              />
              <Fact label="Pasajeros" value={`${o.passengers} de ${o.units.reduce((a, c) => a + c, 0)} lugares`} />
              <Fact label="Contacto" value={o.clientPhone || "—"} />
              <Fact label="Contrato" value={o.contractSigned ? "Firmado" : "Pendiente de firma"} />
            </dl>
          </Panel>

          <Payments order={o} />

          <Panel className="grid gap-4 md:grid-cols-3">
            <div className="flex items-baseline justify-between md:col-span-3">
              <h2 className="text-lg font-semibold">Proveedor</h2>
              <span className="text-xs font-semibold text-ink-muted">Solo interno</span>
            </div>
            <Stat label={`Pago a ${o.providerName}`} value={money(o.providerCost)} />
            <Stat label="Tipo de unidad" value={o.units.map(unitName).join(" + ")} />
            <div className="flex flex-col gap-1 rounded-[14px] bg-mint p-3.5 text-on-mint">
              <span className="text-xs">Ganancia MT Colectivo</span>
              <span className="text-xl font-bold tabular-nums">{money(o.total - o.providerCost)}</span>
            </div>
          </Panel>
        </div>

        <aside aria-label="Orden de servicio" className="flex min-w-0 flex-col gap-3 xl:sticky xl:top-24">
          <span className="text-[13px] font-semibold">Orden de servicio enviada</span>
          <div className="overflow-hidden rounded-lg shadow-float">
            <OrderDocument
              data={{
                folio: o.folio,
                issuedAt: o.issuedAt,
                clientName: o.clientName,
                date: o.date,
                origin: o.origin,
                destination: o.destination,
                departureTime: o.departureTime,
                returnTime: o.returnTime,
                route: o.route,
                units: o.units,
                lines: o.lines,
                total: o.total,
                payments: o.payments,
                extras: tariffs.data?.extras[mainUnit] ?? { hour: 500, move: 1000 },
              }}
            />
          </div>
        </aside>
      </div>
    </>
  );
}

function Progress({ order: o }: { order: Order }) {
  const paid = paidAmount(o);
  const due = dueAmount(o);
  const firstPayment = o.payments[0];
  const steps = [
    { label: "Cotización enviada", meta: shortDate(o.issuedAt), state: "done" },
    { label: "Contrato firmado", meta: o.contractSigned ? "Firmado" : "Pendiente", state: o.contractSigned ? "done" : "now" },
    { label: "Anticipo", meta: firstPayment ? `${money(firstPayment.amount)} · ${shortDate(firstPayment.date)}` : "Sin pagos", state: firstPayment ? "done" : o.contractSigned ? "now" : "next" },
    { label: "Liquidación", meta: due === 0 ? "Liquidada" : `Faltan ${money(due)}`, state: due === 0 ? "done" : firstPayment ? "now" : "next" },
    { label: "Servicio", meta: `${shortDate(o.date)} · ${time12(o.departureTime)}`, state: o.status === "done" ? "done" : due === 0 && paid > 0 ? "now" : "next" },
  ] as const;
  return (
    <ol aria-label="Avance de la orden" className="grid gap-2 md:grid-cols-5">
      {steps.map((s, i) => {
        const done = s.state === "done";
        const now = s.state === "now";
        return (
          <li key={s.label} aria-current={now ? "step" : undefined} className={`flex items-center gap-3 rounded-lg px-4 py-3.5 ${now ? "bg-ink text-surface" : done ? "bg-surface shadow-row" : "bg-card text-ink-muted"}`}>
            <span className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${done ? "bg-mint text-on-mint" : now ? "bg-surface text-ink" : "bg-control text-ink"}`}>{done ? "✓" : i + 1}</span>
            <span className="flex min-w-0 flex-col">
              <span className="text-[13px] font-semibold">{s.label}</span>
              <span className="truncate text-xs opacity-75">{s.meta}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function Payments({ order: o }: { order: Order }) {
  const addPayment = useAddPayment(o.id);
  const [open, setOpen] = useState(false);
  const due = dueAmount(o);
  const paid = paidAmount(o);
  const [draft, setDraft] = useState({ amount: "", date: new Date().toISOString().slice(0, 10), method: "Transferencia" });

  function submit(e: FormEvent) {
    e.preventDefault();
    const amount = parseFloat(draft.amount);
    if (!(amount > 0)) return;
    addPayment.mutate({ amount: Math.min(amount, due), date: draft.date, method: draft.method || "Transferencia" }, { onSuccess: () => setOpen(false) });
  }

  return (
    <Panel className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Pagos del cliente</h2>
        <div className="flex items-center gap-3">
          <span className="text-[13px] text-ink-muted">
            Total de la orden <b className="tabular-nums text-ink">{money(o.total)}</b>
          </span>
          {due > 0 ? (
            <Button
              size="sm"
              icon="plus"
              onClick={() => {
                setDraft((d) => ({ ...d, amount: String(due) }));
                setOpen(true);
              }}
            >
              Registrar pago
            </Button>
          ) : null}
        </div>
      </div>
      <TickMeter value={paid} max={o.total} startLabel={`${money(paid)} pagado`} endLabel={`${money(due)} por liquidar`} label="Pagado de la orden" />
      {o.payments.length ? (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs text-ink-muted">
              <th className="py-2 font-semibold">Abono</th>
              <th className="py-2 font-semibold">Fecha</th>
              <th className="py-2 font-semibold">Método</th>
              <th className="py-2 text-right font-semibold">Monto</th>
            </tr>
          </thead>
          <tbody>
            {o.payments.map((p, i) => (
              <tr key={p.id} className="border-t border-line">
                <td className="py-2.5 font-semibold">{i === 0 ? "Anticipo" : `Abono ${i + 1}`}</td>
                <td className="py-2.5 text-ink-secondary">{numericDate(p.date)}</td>
                <td className="py-2.5 text-ink-secondary">{p.method}</td>
                <td className="py-2.5 text-right font-semibold tabular-nums">{money(p.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-sm text-ink-muted">Aún no hay pagos registrados.</p>
      )}
      {open ? (
        <form onSubmit={submit} className="grid items-end gap-3 rounded-lg bg-card p-4 md:grid-cols-[repeat(3,minmax(0,1fr))_auto]">
          <TextField label="Monto" type="number" min={1} max={due} icon="dollar" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} />
          <TextField label="Fecha" type="date" icon="calendar" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
          <TextField label="Método" value={draft.method} onChange={(e) => setDraft({ ...draft, method: e.target.value })} />
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" icon="check" disabled={addPayment.isPending}>
              {addPayment.isPending ? "Guardando…" : "Guardar abono"}
            </Button>
          </div>
        </form>
      ) : null}
      {addPayment.isError ? <ErrorState message="No pudimos registrar el pago. Intenta de nuevo." /> : null}
    </Panel>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-[14px] bg-card p-3.5">
      <span className="text-xs text-ink-muted">{label}</span>
      <span className="text-xl font-bold tabular-nums">{value}</span>
    </div>
  );
}
