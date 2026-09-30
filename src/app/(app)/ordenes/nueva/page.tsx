"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";

import { OrderDocument } from "@/components/orders/order-document";
import { Button } from "@/components/ui/button";
import { ChoiceChips } from "@/components/ui/choice-chips";
import { Counter } from "@/components/ui/counter";
import { ErrorState, PageHeader, Panel, Skeleton } from "@/components/ui/misc";
import { StatusBadge } from "@/components/ui/status-badge";
import { TextField } from "@/components/ui/text-field";
import { VehicleArt } from "@/components/ui/vehicle-art";
import { durationHours, hoursLabel, money } from "@/lib/format";
import { assignUnits, CAPACITIES, capacityRange, quote, suggestedProviderCost, unitName } from "@/lib/pricing";
import { useClients, useCreateOrder, useProviders, useTariffs } from "@/lib/queries";
import type { RouteType, ServiceType, Shift, TourShift } from "@/lib/types";

const today = () => new Date().toISOString().slice(0, 10);

const SERVICES: { id: ServiceType; title: string; sub: string; from: string }[] = [
  { id: "amatitan", title: "Amatitán", sub: "Cantaritos, ida y vuelta de 7 horas", from: "Desde $2,500" },
  { id: "evento", title: "Evento", sub: "Boda, graduación, posada o concierto", from: "Desde $2,500" },
  { id: "turismo", title: "Turismo", sub: "Destino por días: Tapalpa, Vallarta, Guanajuato…", from: "Desde $3,000" },
];

function Step({ n, title, extra, children }: { n: number; title: string; extra?: ReactNode; children: ReactNode }) {
  return (
    <Panel className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="flex size-7 items-center justify-center rounded-full bg-ink text-[13px] font-bold text-surface">{n}</span>
        <h2 className="text-lg font-semibold tracking-[-0.01em]">{title}</h2>
        {extra}
      </div>
      {children}
    </Panel>
  );
}

export default function NewOrderPage() {
  const router = useRouter();
  const tariffs = useTariffs();
  const providers = useProviders();
  const clients = useClients();
  const createOrder = useCreateOrder();

  const [form, setForm] = useState({
    clientName: "",
    clientPhone: "",
    clientEmail: "",
    service: "amatitan" as ServiceType,
    amatitanShift: "pm" as Shift,
    eventDescription: "",
    destination: "Guanajuato",
    days: 1 as 1 | 2 | 3,
    tourShift: "am" as TourShift,
    passengers: "",
    providerId: "prv-mtc",
    date: "",
    route: "round" as RouteType,
    origin: "",
    destinationText: "",
    departureTime: "13:00",
    returnTime: "20:00",
    extraHours: 0,
    extraMoves: 0,
    useDiscount: true,
    deposit: "",
    depositDate: today(),
    providerCost: "",
  });
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));
  const [error, setError] = useState("");

  const passengers = Math.max(0, parseInt(form.passengers, 10) || 0);
  const units = useMemo(() => assignUnits(passengers), [passengers]);
  const service = {
    type: form.service,
    ...(form.service === "amatitan" ? { amatitanShift: form.amatitanShift } : {}),
    ...(form.service === "evento" ? { eventDescription: form.eventDescription.trim() || undefined } : {}),
    ...(form.service === "turismo" ? { destination: form.destination, days: form.days, ...(form.days === 1 ? { tourShift: form.tourShift } : {}) } : {}),
  };
  const q = tariffs.data ? quote(tariffs.data, { service, units, route: form.route, extraHours: form.extraHours, extraMoves: form.extraMoves, useDiscount: form.useDiscount }) : null;
  const deposit = Math.max(0, parseFloat(form.deposit) || 0);
  const total = q && !q.incomplete ? q.total : null;
  const providerOwn = providers.data?.find((p) => p.id === form.providerId)?.own ?? false;
  const providerCost = form.providerCost === "" ? (providerOwn ? 0 : suggestedProviderCost(total ?? 0, units.length)) : parseFloat(form.providerCost) || 0;
  const destination =
    form.destinationText ||
    (form.service === "amatitan" ? "Cantaritos El Güero, Amatitán" : form.service === "turismo" ? `${form.destination}, ${form.days === 1 ? "mismo día" : `${form.days} días`}` : "");
  const mainUnit = units.at(-1) ?? 14;
  const frequent = clients.data?.find((c) => c.name.toLowerCase() === form.clientName.trim().toLowerCase() && c.servicesCount >= 2);

  function submit(asQuote: boolean) {
    if (!q) return;
    if (!form.clientName.trim() || !passengers || !form.date || !form.origin.trim()) {
      setError("Completa nombre del cliente, pasajeros, fecha y dirección de salida para generar la orden.");
      return;
    }
    if (q.incomplete) {
      setError("No hay tarifa para esa unidad en este destino. Cambia el destino o los pasajeros, o cotízalo aparte.");
      return;
    }
    setError("");
    createOrder.mutate(
      {
        clientName: form.clientName,
        clientPhone: form.clientPhone,
        clientEmail: form.clientEmail,
        service,
        date: form.date,
        departureTime: form.departureTime,
        returnTime: form.route === "round" ? form.returnTime : null,
        route: form.route,
        origin: form.origin.trim(),
        destination,
        passengers,
        units,
        providerId: form.providerId,
        lines: q.lines,
        total: q.total,
        deposit: !asQuote && deposit > 0 ? { amount: deposit, date: form.depositDate } : null,
        providerCost,
      },
      { onSuccess: (order) => router.push(`/ordenes/detalle?id=${order.id}`) },
    );
  }

  if (tariffs.isPending || providers.isPending) return <Skeleton rows={10} />;
  if (tariffs.isError || providers.isError) return <ErrorState message="No pudimos cargar las tarifas. Sin ellas no se puede cotizar." onRetry={() => tariffs.refetch()} />;

  const turismo = tariffs.data.turismo;

  return (
    <>
      <PageHeader
        crumb={
          <>
            <Link href="/ordenes" className="hover:text-ink">
              Órdenes
            </Link>{" "}
            / Nueva orden
          </>
        }
        title="Nueva orden"
        actions={
          <>
            <Button variant="secondary" onClick={() => submit(true)} disabled={createOrder.isPending}>
              Guardar como cotización
            </Button>
            <Button onClick={() => submit(false)} disabled={createOrder.isPending}>
              {createOrder.isPending ? "Generando…" : "Generar orden de servicio"}
            </Button>
          </>
        }
      />
      {error || createOrder.isError ? <ErrorState message={error || "No pudimos guardar la orden. Intenta de nuevo."} /> : null}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_560px]">
        <div className="flex min-w-0 flex-col gap-4">
          <Step n={1} title="Cliente" extra={frequent ? <StatusBadge tone="completed">Cliente frecuente · {frequent.servicesCount} servicios</StatusBadge> : null}>
            <div className="grid gap-3 md:grid-cols-3">
              <TextField label="Nombre" icon="idCard" value={form.clientName} onChange={(e) => set("clientName", e.target.value)} list="clientes" autoComplete="off" placeholder="Nombre completo" />
              <TextField label="Celular" icon="phone" type="tel" value={form.clientPhone} onChange={(e) => set("clientPhone", e.target.value)} placeholder="33 0000 0000" />
              <TextField label="Correo" icon="mail" type="email" value={form.clientEmail} onChange={(e) => set("clientEmail", e.target.value)} placeholder="correo@ejemplo.com" />
              <datalist id="clientes">{clients.data?.map((c) => <option key={c.id} value={c.name} />)}</datalist>
            </div>
          </Step>

          <Step n={2} title="Servicio">
            <div role="radiogroup" aria-label="Tipo de servicio" className="grid gap-2.5 md:grid-cols-3">
              {SERVICES.map((s) => {
                const on = form.service === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setForm((f) => ({ ...f, service: s.id, destinationText: "" }))}
                    className={`flex flex-col items-start gap-1.5 rounded-lg border-2 p-4 text-left transition ${on ? "border-ink bg-mint-soft" : "border-transparent bg-card hover:bg-control"}`}
                  >
                    <span className="text-[15px] font-semibold">{s.title}</span>
                    <span className="text-xs leading-snug text-ink-muted">{s.sub}</span>
                    <span className="text-xs font-semibold">{s.from}</span>
                  </button>
                );
              })}
            </div>
            {form.service === "amatitan" ? (
              <div className="flex flex-col gap-2">
                <span className="text-[13px] font-semibold">Horario</span>
                <ChoiceChips
                  label="Horario"
                  value={form.amatitanShift}
                  onChange={(v) => set("amatitanShift", v)}
                  options={[
                    { value: "am", label: "Matutino · 9:00 a. m. – 4:00 p. m." },
                    { value: "pm", label: "Vespertino · 1:00 p. m. – 8:00 p. m." },
                  ]}
                />
              </div>
            ) : null}
            {form.service === "evento" ? (
              <TextField label="Tipo de evento" placeholder="Boda, graduación, posada, concierto…" value={form.eventDescription} onChange={(e) => set("eventDescription", e.target.value)} />
            ) : null}
            {form.service === "turismo" ? (
              <div className="flex flex-col gap-3.5">
                <div className="flex flex-col gap-2">
                  <span className="text-[13px] font-semibold">Destino</span>
                  <ChoiceChips label="Destino" value={form.destination} onChange={(v) => setForm((f) => ({ ...f, destination: v, destinationText: "" }))} options={turismo.map((t) => ({ value: t.destination, label: t.destination }))} />
                </div>
                <div className="flex flex-wrap gap-8">
                  <div className="flex flex-col gap-2">
                    <span className="text-[13px] font-semibold">Días</span>
                    <ChoiceChips label="Días" value={form.days} onChange={(v) => set("days", v)} options={[{ value: 1, label: "Mismo día" }, { value: 2, label: "2 días (S – D)" }, { value: 3, label: "3 días (V – D)" }]} />
                  </div>
                  {form.days === 1 ? (
                    <div className="flex flex-col gap-2">
                      <span className="text-[13px] font-semibold">Horario</span>
                      <ChoiceChips
                        label="Horario de turismo"
                        value={form.tourShift}
                        onChange={(v) => set("tourShift", v)}
                        options={[
                          { value: "am", label: "Matutino" },
                          { value: "pm", label: `Vespertino +${money(tariffs.data.tourShiftSurcharge.pm)}` },
                          { value: "full", label: `Completo +${money(tariffs.data.tourShiftSurcharge.full)}` },
                        ]}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </Step>

          <Step n={3} title="Pasajeros y unidad">
            <div className="grid gap-5 md:grid-cols-[200px_minmax(0,1fr)]">
              <div className="flex flex-col gap-2.5">
                <TextField label="Número de pasajeros" icon="users" type="number" min={1} inputMode="numeric" value={form.passengers} onChange={(e) => set("passengers", e.target.value)} placeholder="12" />
                <span className="text-xs leading-snug text-ink-muted">La unidad se asigna sola: la más chica donde caben todos.</span>
              </div>
              <div aria-live="polite" className="flex items-center gap-5 rounded-lg bg-[linear-gradient(165deg,var(--mint)_0%,var(--mint-soft)_70%,var(--surface)_100%)] px-5 py-4 text-on-mint">
                <VehicleArt kind={units.includes(45) ? "bus" : "van"} width={150} />
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="text-xs font-semibold">Unidad asignada</span>
                  <span className="text-[22px] font-bold tracking-[-0.02em] text-ink">
                    {!units.length ? "Captura los pasajeros" : units.length === 1 ? `${unitName(units[0])} pasajeros` : `${units.length} unidades`}
                  </span>
                  <span className="text-xs leading-snug">
                    {!units.length
                      ? "Te sugerimos la unidad al escribir cuántas personas viajan."
                      : units.length === 1
                        ? `${passengers} pasajeros caben en la ${unitName(units[0])}${units[0] - passengers > 0 ? ` · ${units[0] - passengers} lugares libres` : " · llena"}`
                        : `${units.map(unitName).join(" + ")} para ${passengers} pasajeros`}
                  </span>
                </div>
              </div>
            </div>
            <div aria-label="Escala de capacidades" className="grid grid-cols-2 gap-1.5 md:grid-cols-4">
              {CAPACITIES.map((c) => {
                const on = units.includes(c);
                return (
                  <div key={c} className={`flex flex-col gap-0.5 rounded-md px-3 py-2.5 ${on ? "bg-ink text-surface" : "bg-card text-ink-muted"}`}>
                    <span className="text-[13px] font-bold">{unitName(c)}</span>
                    <span className="text-[11px]">{capacityRange(c)}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-[13px] font-semibold">Proveedor de la unidad</span>
              <ChoiceChips label="Proveedor" value={form.providerId} onChange={(v) => setForm((f) => ({ ...f, providerId: v, providerCost: "" }))} options={providers.data.map((p) => ({ value: p.id, label: p.name }))} />
            </div>
          </Step>

          <Step n={4} title="Fecha y ruta">
            <div className="grid gap-3 md:grid-cols-2">
              <TextField label="Fecha del servicio" type="date" icon="calendar" value={form.date} min={today()} onChange={(e) => set("date", e.target.value)} />
              <div className="flex flex-col gap-1.5">
                <span className="text-[13px] font-semibold">Ruta</span>
                <ChoiceChips label="Ruta" value={form.route} onChange={(v) => set("route", v)} options={[{ value: "round", label: "Ida y vuelta" }, { value: "one-way", label: "Solo ida" }]} />
              </div>
              <TextField label="Dirección de salida" icon="pin" value={form.origin} onChange={(e) => set("origin", e.target.value)} placeholder="Calle, número, colonia, municipio" />
              <TextField label="Destino" icon="route" value={destination} onChange={(e) => set("destinationText", e.target.value)} placeholder="Lugar del evento o destino" />
              <TextField label="Hora de salida" type="time" icon="clock" value={form.departureTime} onChange={(e) => set("departureTime", e.target.value)} />
              {form.route === "round" ? (
                <TextField label="Hora de regreso" type="time" icon="clock" value={form.returnTime} onChange={(e) => set("returnTime", e.target.value)} hint={`Duración: ${hoursLabel(durationHours(form.departureTime, form.returnTime))}`} />
              ) : null}
            </div>
          </Step>

          <Step n={5} title="Precio y pago">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="flex flex-col gap-3.5">
                <div className="flex flex-col gap-3 md:flex-row">
                  <Counter label="Horas extra" hint={`${money(tariffs.data.extras[mainUnit].hour)} c/u por unidad`} value={form.extraHours} onChange={(v) => set("extraHours", v)} />
                  <Counter label="Movimientos extra" hint={`${money(tariffs.data.extras[mainUnit].move)} c/u · más de 5 km a $20/km`} value={form.extraMoves} onChange={(v) => set("extraMoves", v)} />
                </div>
                {q?.canDiscount ? (
                  <label className="flex cursor-pointer items-center gap-2.5 rounded-md bg-card px-3.5 py-3">
                    <input type="checkbox" checked={form.useDiscount} onChange={(e) => set("useDiscount", e.target.checked)} className="size-[18px] accent-ink" />
                    <span className="flex flex-col">
                      <span className="text-[13px] font-semibold">Aplicar precio con descuento recomendado</span>
                      {q.unitPrices.length ? (
                        <span className="text-[11px] text-ink-muted">
                          Tarifa normal {money(q.unitPrices.reduce((s, u) => s + (u.normal ?? 0), 0))} → recomendada {money(q.unitPrices.reduce((s, u) => s + (u.discount ?? 0), 0))}
                        </span>
                      ) : null}
                    </span>
                  </label>
                ) : null}
                <div className="grid gap-3 md:grid-cols-2">
                  <TextField label="Anticipo recibido" type="number" min={0} icon="dollar" value={form.deposit} onChange={(e) => set("deposit", e.target.value)} placeholder="0" />
                  <TextField label="Fecha del anticipo" type="date" icon="calendar" value={form.depositDate} onChange={(e) => set("depositDate", e.target.value)} />
                </div>
              </div>
              <div className="flex flex-col gap-2.5 rounded-lg bg-card p-4 text-[13px] tabular-nums">
                <Row label={units.length > 1 ? `Tarifa (${units.length} unidades)` : "Tarifa base"} value={q?.incomplete ? "Por cotizar" : money(q?.base ?? 0)} />
                {q?.shiftSurcharge ? <Row label="Horario extendido" value={money(q.shiftSurcharge)} /> : null}
                {q?.hoursCost ? <Row label="Horas extra" value={money(q.hoursCost)} /> : null}
                {q?.movesCost ? <Row label="Movimientos extra" value={money(q.movesCost)} /> : null}
                {q?.discount ? <Row label="Descuento" value={money(-q.discount)} /> : null}
                <Row label="Anticipo" value={money(-deposit)} />
                <div className="flex justify-between border-t border-line pt-2.5 text-lg font-bold">
                  <span>Total</span>
                  <span>{total === null ? "Por cotizar" : money(total)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Por liquidar</span>
                  <span>{money(Math.max(0, (total ?? 0) - deposit))}</span>
                </div>
                <div className="mt-1.5 flex flex-col gap-2 rounded-md bg-surface p-3">
                  <span className="text-[11px] font-semibold text-ink-muted">Solo interno · no aparece en la orden</span>
                  <TextField label="Pago al proveedor" type="number" min={0} value={form.providerCost === "" ? String(providerCost) : form.providerCost} onChange={(e) => set("providerCost", e.target.value)} />
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Ganancia MT Colectivo</span>
                    <span className="rounded-full bg-mint px-2.5 py-0.5 font-bold text-on-mint">{money((total ?? 0) - providerCost)}</span>
                  </div>
                </div>
              </div>
            </div>
          </Step>
        </div>

        <aside aria-label="Vista previa de la orden de servicio" className="flex min-w-0 flex-col gap-3 xl:sticky xl:top-24">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold">Orden de servicio · vista previa</span>
            <span className="text-xs text-ink-muted">Se actualiza mientras capturas</span>
          </div>
          <div className="overflow-hidden rounded-lg shadow-float">
            <OrderDocument
              data={{
                folio: "Folio al guardar",
                issuedAt: today(),
                clientName: form.clientName,
                date: form.date,
                origin: form.origin,
                destination,
                departureTime: form.departureTime,
                returnTime: form.route === "round" ? form.returnTime : null,
                route: form.route,
                units,
                lines: q?.lines ?? [],
                total,
                payments: deposit ? [{ amount: deposit, date: form.depositDate }] : [],
                extras: tariffs.data.extras[mainUnit],
              }}
            />
          </div>
        </aside>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 text-ink-secondary">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
