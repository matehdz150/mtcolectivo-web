"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";

import { OrderDocument } from "@/components/orders/order-document";
import { DatePicker } from "@/components/ui/date-picker";
import { Icon } from "@/components/ui/icon";
import { OrderPreview, useOrderDocument } from "@/components/orders/order-preview";
import { Button } from "@/components/ui/button";
import { TickMeter } from "@/components/ui/meters";
import { ErrorState, PageHeader, Panel, Skeleton, Tag } from "@/components/ui/misc";
import { StatusBadge } from "@/components/ui/status-badge";
import { TextField } from "@/components/ui/text-field";
import { VehicleArt } from "@/components/ui/vehicle-art";
import { ApiError } from "@/lib/api";
import { kindForUnits, unitName } from "@/lib/fleet";
import { useAnimatedClose } from "@/lib/use-animated-close";
import { durationHours, longDate, money, numericDate, startDownload, time12 } from "@/lib/format";
import { dueAmount, ORDER_STATUS, paidAmount } from "@/lib/order-status";
import { useAddPayment, useOrder, useRemovePayment, useServices, useUpdateOrder } from "@/lib/queries";
import { manualCharges } from "@/lib/service-helpers";
import type { Order } from "@/lib/types";

// Static export: the order id travels as ?id= instead of a dynamic segment.
export default function OrderDetailPage() {
  return (
    <Suspense fallback={<Skeleton rows={8} />}>
      <OrderDetail />
    </Suspense>
  );
}

const errorText = (err: unknown, fallback: string) => (err instanceof ApiError ? [err.message, ...(err.details ?? [])].join(" ") : fallback);

function OrderDetail() {
  const id = useSearchParams().get("id");
  const order = useOrder(id);
  const services = useServices();
  /** Phone: the document opens full screen instead of sitting beside the order. */
  const [previewWidth, setPreviewWidth] = useState<number | null>(null);
  const [closingPreview, closePreview] = useAnimatedClose(() => setPreviewWidth(null));

  if (!id) return <ErrorState message="Falta el folio de la orden en la dirección." />;
  if (order.isPending) return <Skeleton rows={8} />;
  if (order.isError) return <ErrorState message="No encontramos esa orden." onRetry={() => order.refetch()} />;

  const o = order.data;
  const status = ORDER_STATUS[o.status];
  const service = services.data?.find((s) => s.id === o.serviceId);

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
        subtitle={`${o.folio} · ${o.serviceName}${o.serviceLabel ? ` · ${o.serviceLabel}` : ""} · ${longDate(o.date)}`}
        actions={
          <>
            <DownloadButton order={o} />
            <Button variant="secondary" icon="file" className="lg:hidden max-lg:w-full" onClick={() => setPreviewWidth(Math.min(560, window.innerWidth - 40))}>
              Ver documento
            </Button>
          </>
        }
      />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_560px]">
        <div className="flex min-w-0 flex-col gap-4">
          <Panel className="grid items-center gap-6 md:grid-cols-[200px_minmax(0,1fr)]">
            <div className="flex flex-col items-start gap-3">
              <VehicleArt kind={kindForUnits(o.units)} width={170} />
              <div className="text-xl font-bold tracking-[-0.02em]">{o.units.map((c) => `${unitName(c)} pasajeros`).join(" + ")}</div>
              <div className="flex flex-wrap gap-1.5">
                {o.vehicles.map((v, i) => (
                  <Tag key={i} size="sm">
                    {v.code ?? "Sin asignar"}
                  </Tag>
                ))}
              </div>
            </div>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3.5 text-sm sm:grid-cols-2">
              <Fact label="Servicio" value={[o.serviceName, o.serviceLabel].filter(Boolean).join(" · ")} />
              <Fact label="Fecha" value={longDate(o.date)} />
              <Fact label="Salida" value={o.origin} />
              <Fact label="Destino" value={o.destination} />
              <Fact
                label="Horario"
                value={o.route === "round" ? `${time12(o.departureTime)} – ${time12(o.returnTime)} · ${durationHours(o.departureTime, o.returnTime)} h` : `${time12(o.departureTime)} · solo ida`}
              />
              <Fact label="Pasajeros" value={`${o.passengers} de ${o.units.reduce((a, c) => a + c, 0)} lugares`} />
              <Fact label="Contacto" value={o.clientPhone || "—"} />
              {o.notes ? <Fact label="Notas" value={o.notes} /> : null}
            </dl>
          </Panel>

          <Itinerary order={o} />
          <Payments order={o} />
        </div>

        <aside aria-label="Orden de servicio" className="flex min-w-0 flex-col gap-3 max-lg:hidden xl:sticky xl:top-24">
          <span className="text-[13px] font-semibold">Vista de la orden de servicio</span>
          <div className="overflow-hidden rounded-lg shadow-float">
            {/* The document this order was made with (its own choice, else the default), drawn from the order's current data. */}
            <OrderPreview
              draft={o}
              choice={o.templateId ?? ""}
              fallback={
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
                extraCharges: manualCharges(service, o.units),
                itinerary: o.itinerary,
              }}
            />
              }
            />
          </div>
        </aside>
      </div>

      {previewWidth ? (
        <div role="dialog" aria-label="Vista previa del documento" className={`anim-full fixed inset-0 z-50 flex flex-col bg-[#1c1c1a] lg:hidden ${closingPreview ? "is-closing" : ""}`}>
          <div className="flex shrink-0 items-center justify-between gap-3 px-5 pb-3 pt-5 text-surface">
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-[17px] font-bold">{o.folio}</span>
              <span className="text-[13px] text-ink-faint">Así se imprime</span>
            </div>
            <button type="button" aria-label="Cerrar vista previa" onClick={closePreview} className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/15">
              <Icon name="x" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 pt-2">
            <OrderPreview draft={o} choice={o.templateId ?? ""} width={previewWidth} fallback={<p className="rounded-lg bg-surface p-4 text-sm">Todavía no hay un documento publicado para esta orden.</p>} />
          </div>
          <div className="shrink-0 px-5 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-3 [&>div]:items-stretch [&_button]:w-full">
            <DownloadButton order={o} />
          </div>
        </div>
      ) : null}
    </>
  );
}

/**
 * Downloads the PDF of the order: the same one shown on the right (its document,
 * current data), built on the spot, so it always includes the latest payments and itinerary.
 */
function DownloadButton({ order: o }: { order: Order }) {
  const { template, blob, loading, problem } = useOrderDocument(o, o.templateId ?? "");

  function download() {
    if (!blob || !template) return;
    const url = URL.createObjectURL(blob);
    startDownload(url, `${o.folio} - ${template.name}.pdf`);
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  return (
    <div className="flex flex-col items-end gap-1 max-lg:w-full max-lg:items-stretch">
      <Button icon="file" className="max-lg:w-full" onClick={download} disabled={!blob}>
        Descargar PDF
      </Button>
      {!blob && !problem ? <span className="text-xs text-ink-muted">{loading ? "Preparando el PDF…" : "Publica y asigna un documento en Documentos."}</span> : null}
      {problem ? <span className="text-xs font-medium text-danger">{problem}</span> : null}
    </div>
  );
}

function Payments({ order: o }: { order: Order }) {
  const addPayment = useAddPayment(o.id);
  const removePayment = useRemovePayment(o.id);
  const [open, setOpen] = useState(false);
  const due = dueAmount(o);
  const paid = paidAmount(o);
  const canPay = o.status !== "cancelled";
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
        <div className="flex items-center gap-3 max-lg:w-full max-lg:flex-wrap max-lg:justify-between">
          <span className="text-[13px] text-ink-muted">
            Total de la orden <b className="tabular-nums text-ink">{money(o.total)}</b>
            {o.recommendedTotal !== undefined ? <span title="Precio que sugería la lista de precios"> · recomendado {money(o.recommendedTotal)}</span> : null}
          </span>
          {due > 0 && canPay ? (
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
              <th className="py-2 font-semibold max-lg:hidden">Método</th>
              <th className="py-2 text-right font-semibold">Monto</th>
              <th className="w-10 py-2" />
            </tr>
          </thead>
          <tbody>
            {o.payments.map((p, i) => (
              <tr key={p.id} className="border-t border-line">
                <td className="py-2.5 font-semibold">
                  {i === 0 ? "Anticipo" : `Abono ${i + 1}`}
                  <span className="block text-xs font-normal text-ink-secondary lg:hidden">{p.method}</span>
                </td>
                <td className="py-2.5 text-ink-secondary">{numericDate(p.date)}</td>
                <td className="py-2.5 text-ink-secondary max-lg:hidden">{p.method}</td>
                <td className="py-2.5 text-right font-semibold tabular-nums">{money(p.amount)}</td>
                <td className="py-2.5 text-right">
                  <button
                    type="button"
                    aria-label={`Quitar el pago de ${money(p.amount)}`}
                    disabled={removePayment.isPending}
                    onClick={() => window.confirm(`¿Quitar el pago de ${money(p.amount)}?`) && removePayment.mutate(p.id)}
                    className="size-7 rounded-md text-ink-muted hover:bg-control hover:text-ink disabled:opacity-40"
                  >
                    ×
                  </button>
                </td>
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
          <DatePicker label="Fecha" value={draft.date} onChange={(v) => setDraft({ ...draft, date: v })} />
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
      {addPayment.isError || removePayment.isError ? <ErrorState message={errorText(addPayment.error ?? removePayment.error, "No pudimos actualizar los pagos. Intenta de nuevo.")} /> : null}
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

/** The itinerary prints as an extra page of the order document; regenerate the PDF after changing it. */
function Itinerary({ order: o }: { order: Order }) {
  const update = useUpdateOrder(o.id);
  const [text, setText] = useState(o.itinerary ?? "");
  const dirty = text.trim() !== (o.itinerary ?? "").trim();

  return (
    <Panel className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">Itinerario</h2>
        <span className="text-xs text-ink-muted">Opcional · agrega una página a la orden de servicio</span>
      </div>
      <textarea
        aria-label="Itinerario"
        rows={5}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={"Día 1\n- Salida a las 10:00 hrs.\n- Llegada al hotel a las 18:00 hrs."}
        className="rounded-md bg-card p-3.5 text-sm outline-none placeholder:text-ink-faint focus:shadow-[inset_0_0_0_2px_var(--ink)]"
      />
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-ink-muted">{dirty ? "Al guardar, la vista y el PDF se actualizan." : update.isSuccess ? "Guardado." : ""}</span>
        <Button size="sm" icon="check" disabled={!dirty || update.isPending} onClick={() => update.mutate({ itinerary: text.trim() })}>
          {update.isPending ? "Guardando…" : "Guardar itinerario"}
        </Button>
      </div>
      {update.isError ? <ErrorState message={errorText(update.error, "No pudimos guardar el itinerario.")} /> : null}
    </Panel>
  );
}
