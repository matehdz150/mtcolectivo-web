"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { OrderDocument } from "@/components/orders/order-document";
import { ClientPicker } from "@/components/orders/client-picker";
import { DatePicker } from "@/components/ui/date-picker";
import { MobileOrderFlow, type MobileFlowProps } from "@/components/orders/mobile-flow";
import { OrderPreview } from "@/components/orders/order-preview";
import { draftOrder } from "@/lib/local-render";
import { Button } from "@/components/ui/button";
import { ChoiceChips } from "@/components/ui/choice-chips";
import { Counter } from "@/components/ui/counter";
import { ErrorState, PageHeader, Panel, Skeleton } from "@/components/ui/misc";
import { StatusBadge } from "@/components/ui/status-badge";
import { TextField } from "@/components/ui/text-field";
import { VehicleArt } from "@/components/ui/vehicle-art";
import { ApiError } from "@/lib/api";
import { kindForUnits, unitName } from "@/lib/fleet";
import { vehicleRange } from "@/shared/core";
import { VEHICLE_ART_WIDTH } from "@/components/ui/vehicle-art";
import { durationHours, hoursLabel, money } from "@/lib/format";
import { useAssignments, useClients, useCreateOrder, useQuote, useServices, useTemplates, useVehicles } from "@/lib/queries";
import { activeVariables, chargeAmountFor, defaultSelections, manualCharges, startingPrice } from "@/lib/service-helpers";
import type { NewOrder, RouteType } from "@/lib/types";

const today = () => new Date().toISOString().slice(0, 10);

function useDebounced<T>(value: T, ms = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

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
  const services = useServices();
  const clients = useClients();
  const vehicles = useVehicles();
  const createOrder = useCreateOrder();
  const templates = useTemplates();
  const assignments = useAssignments();

  const [form, setForm] = useState({
    clientName: "",
    clientPhone: "",
    clientEmail: "",
    serviceId: "",
    passengers: "",
    date: "",
    route: "round" as RouteType,
    origin: "",
    destination: "",
    departureTime: "13:00",
    returnTime: "20:00",
    discount: "",
    deposit: "",
    depositDate: today(),
    depositMethod: "Transferencia",
    notes: "",
    itinerary: "",
    /** "" = the assigned document, "none" = no document, otherwise a template id. */
    templateId: "",
  });
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [manual, setManual] = useState<Record<string, number>>({});
  const [error, setError] = useState("");
  /** A price typed by hand. It only counts while the recommended price it was typed against is still the same. */
  const [override, setOverride] = useState<{ value: string; base: number } | null>(null);
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));

  const activeServices = useMemo(() => (services.data ?? []).filter((s) => s.active), [services.data]);
  const service = activeServices.find((s) => s.id === form.serviceId) ?? activeServices[0];


  // Every applicable variable always has a valid option: start from the first ones.
  const effective = useMemo(() => (service ? defaultSelections(service, selections) : {}), [service, selections]);

  const pick = (serviceId: string) => {
    setForm((f) => ({ ...f, serviceId }));
    setSelections({});
    setManual({});
  };
  const choose = (key: string, value: string) => setSelections({ ...effective, [key]: value });

  const passengers = Math.max(0, parseInt(useDebounced(form.passengers), 10) || 0);
  const discount = Math.max(0, parseFloat(form.discount) || 0);
  const deposit = Math.max(0, parseFloat(form.deposit) || 0);
  const routeLabel = form.route === "round" ? "Ida y vuelta" : "Solo ida";
  const manualKey = JSON.stringify(Object.entries(manual).filter(([, qty]) => qty > 0).map(([chargeId, qty]) => ({ chargeId, qty })));
  const manualList: { chargeId: string; qty: number }[] = JSON.parse(manualKey);
  const adjustments = discount ? [{ concept: "Descuento", amount: -discount }] : [];

  // react-query compares the key by value, so a fresh object each render does not refetch.
  const quoteRequest = service && passengers > 0 ? { serviceId: service.id, selections: effective, passengers, routeLabel, manual: manualList, adjustments } : null;
  const priced = useQuote(quoteRequest);
  const units = priced.data?.units ?? [];
  const q = priced.data?.quote;
  // The price list recommends; what is typed in "Precio final" wins, and the difference is an "Ajuste de precio" line.
  const recommended = q?.ok ? q.total : null;
  const typed = override && override.base === recommended ? parseFloat(override.value) : NaN;
  const finalTotal = recommended === null ? null : Number.isFinite(typed) && typed >= 0 ? Math.round(typed * 100) / 100 : recommended;
  const adjustment = recommended !== null && finalTotal !== null ? Math.round((finalTotal - recommended) * 100) / 100 : 0;
  const lines = q ? [...q.lines, ...(adjustment ? [{ qty: null, concept: "Ajuste de precio", amount: adjustment }] : [])] : [];
  const total = finalTotal;

  const existing = clients.data?.find((c) => c.name.trim().toLowerCase() === form.clientName.trim().toLowerCase());
  const frequent = existing && existing.servicesCount >= 2 ? existing : null;
  const suggestedDestination = service?.variables.find((v) => v.key === "destino")?.options.find((o) => o.value === effective.destino)?.label ?? "";
  const destination = form.destination || suggestedDestination;
  // The options are the vehicles registered in Transportes, grouped by range; each unit of the order is served by the smallest one that fits.
  const fleetSorted = [...(vehicles.data ?? [])].sort((a, b) => a.capacity - b.capacity);
  const categories = fleetSorted.filter((v, i) => fleetSorted.findIndex((w) => w.capacity === v.capacity && vehicleRange(w).join() === vehicleRange(v).join()) === i);
  const servedBy = (c: number) => fleetSorted.find((v) => v.capacity >= c);
  const assignedKind = units.length ? (servedBy(Math.max(...units))?.kind ?? kindForUnits(units)) : kindForUnits(units);
  const missingUnits = units.filter((c) => !servedBy(c));
  const extraCharges = manualCharges(service, units.length ? units : [14]);

  /** The order as the API expects it. The preview fills in placeholders so it can be drawn before everything is typed. */
  function orderInput(forPreview: boolean, asQuote = false): NewOrder {
    return {
      client: existing ? { clientId: existing.id } : { name: form.clientName.trim() || (forPreview ? "(nombre del cliente)" : ""), phone: form.clientPhone, email: form.clientEmail },
      serviceId: (service as NonNullable<typeof service>).id,
      selections: effective,
      passengers,
      route: form.route,
      date: form.date || (forPreview ? today() : ""),
      departureTime: form.departureTime,
      returnTime: form.route === "round" ? form.returnTime : null,
      origin: form.origin.trim() || (forPreview ? "(dirección de salida)" : ""),
      destination: destination.trim() || (forPreview ? "(destino)" : ""),
      manual: manualList,
      adjustments,
      deposit: !asQuote && deposit > 0 ? { amount: deposit, date: form.depositDate, method: form.depositMethod || "Transferencia" } : undefined,
      notes: form.notes.trim() || undefined,
      itinerary: form.itinerary.trim() || undefined,
      priceOverride: adjustment ? (finalTotal ?? undefined) : undefined,
      templateId: form.templateId === "none" ? null : form.templateId || undefined,
    };
  }

  // The preview is drawn here, live, with the chosen document. It needs a valid price to have something to print.
  // Drawn from the first moment with the chosen (or default) document; whatever is still missing shows as placeholders.
  const pricedOk = !!q?.ok && finalTotal !== null && deposit <= finalTotal;
  const draftQuote = pricedOk ? { ...(q as NonNullable<typeof q>), lines, total: finalTotal as number } : { ...(q as NonNullable<typeof q>), lines: [], total: 0 };
  const draft = service
    ? draftOrder(orderInput(true, !pricedOk), {
        service,
        units,
        recommended: pricedOk ? (q as NonNullable<typeof q>).total : 0,
        quote: draftQuote,
        client: existing
          ? { id: existing.id, name: existing.name, phone: existing.phone, email: existing.email }
          : { id: "preview", name: form.clientName.trim() || "(nombre del cliente)", phone: form.clientPhone, email: form.clientEmail },
      })
    : null;

  function submit(asQuote: boolean) {
    if (!service || !q) return;
    if (!form.clientName.trim() || !passengers || !form.date || !form.origin.trim() || !destination.trim()) {
      setError("Completa nombre del cliente, pasajeros, fecha, dirección de salida y destino para generar la orden.");
      return;
    }
    if (!q.ok) {
      setError(q.errors[0] ?? "No se pudo calcular el precio.");
      return;
    }
    if (finalTotal !== null && deposit > finalTotal) {
      setError("El anticipo es mayor al total de la orden.");
      return;
    }
    setError("");
    const input = orderInput(false, asQuote);
    createOrder.mutate(input, { onSuccess: (order) => router.push(`/ordenes/detalle?id=${order.id}`) });
  }

  if (services.isPending) return <Skeleton rows={10} />;
  if (services.isError) return <ErrorState message="No pudimos cargar los servicios y precios. Sin ellos no se puede cotizar." onRetry={() => services.refetch()} />;
  if (!service) {
    return (
      <>
        <PageHeader title="Nueva orden" />
        <ErrorState message="Todavía no hay servicios activos. Da de alta uno en la pantalla de Precios." />
        <Link href="/precios" className="text-sm font-semibold underline">
          Ir a Precios
        </Link>
      </>
    );
  }

  const apiError = createOrder.error instanceof ApiError ? createOrder.error : null;
  const variables = activeVariables(service.variables, effective);

  return (
    <>
      <MobileOrderFlow
        form={form}
        set={set as MobileFlowProps["set"]}
        clients={clients.data ?? []}
        existing={!!existing}
        services={activeServices}
        service={service}
        onPickService={pick}
        variables={variables}
        effective={effective}
        choose={choose}
        units={units}
        assignedKind={assignedKind}
        missingUnits={missingUnits}
        q={q}
        recommended={recommended}
        total={total}
        adjustment={adjustment}
        override={override}
        setOverride={setOverride}
        deposit={deposit}
        manual={manual}
        setManual={(id, qty) => setManual((m) => ({ ...m, [id]: qty }))}
        chargeHint={(id) => {
          const c = service.charges.find((x) => x.id === id);
          return c && units.length ? `${money(chargeAmountFor(c, units))} c/u` : "Captura los pasajeros";
        }}
        destination={destination}
        templates={templates.data ?? []}
        defaultTemplateId={assignments.data?.order ?? undefined}
        draft={draft}
        submit={submit}
        pending={createOrder.isPending}
        error={error || (createOrder.isError ? [apiError?.message ?? "No pudimos guardar la orden. Intenta de nuevo.", ...(apiError?.details ?? [])].join(" ") : "")}
        setError={setError}
        onExit={() => router.push("/ordenes")}
      />
      <div className="flex flex-col gap-6 max-lg:hidden">
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
            <Button variant="secondary" onClick={() => submit(true)} disabled={createOrder.isPending || !q?.ok}>
              Guardar como cotización
            </Button>
            <Button onClick={() => submit(false)} disabled={createOrder.isPending || !q?.ok}>
              {createOrder.isPending ? "Generando…" : "Generar orden de servicio"}
            </Button>
          </>
        }
      />
      {error ? <ErrorState message={error} /> : null}
      {createOrder.isError ? <ErrorState message={[apiError?.message ?? "No pudimos guardar la orden. Intenta de nuevo.", ...(apiError?.details ?? [])].join(" ")} /> : null}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_560px]">
        <div className="flex min-w-0 flex-col gap-4">
          <Step n={1} title="Cliente" extra={frequent ? <StatusBadge tone="completed">Cliente frecuente · {frequent.servicesCount} servicios</StatusBadge> : existing ? <StatusBadge tone="pending">Cliente registrado</StatusBadge> : null}>
            <div className="grid gap-3 md:grid-cols-3">
              <ClientPicker
                value={form.clientName}
                options={clients.data ?? []}
                onChange={(name) => {
                  const match = clients.data?.find((c) => c.name.trim().toLowerCase() === name.trim().toLowerCase());
                  setForm((f) => ({ ...f, clientName: name, ...(match ? { clientPhone: match.phone, clientEmail: match.email } : {}) }));
                }}
                onPick={(id) => {
                  const c = clients.data?.find((x) => x.id === id);
                  if (c) setForm((f) => ({ ...f, clientName: c.name, clientPhone: c.phone, clientEmail: c.email }));
                }}
                hint={existing ? undefined : form.clientName.trim() ? "Cliente nuevo: se dará de alta con esta orden." : "Elige un cliente de la lista o escribe uno nuevo."}
              />
              <TextField label="Celular" icon="phone" type="tel" value={form.clientPhone} onChange={(e) => set("clientPhone", e.target.value)} placeholder="33 0000 0000" disabled={!!existing} />
              <TextField label="Correo" icon="mail" type="email" value={form.clientEmail} onChange={(e) => set("clientEmail", e.target.value)} placeholder="correo@ejemplo.com" disabled={!!existing} />
            </div>
          </Step>

          <Step n={2} title="Servicio">
            <div role="radiogroup" aria-label="Tipo de servicio" className="grid gap-2.5 md:grid-cols-3">
              {activeServices.map((s) => {
                const on = service.id === s.id;
                const from = startingPrice(s);
                return (
                  <button
                    key={s.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => pick(s.id)}
                    className={`flex flex-col items-start gap-1.5 rounded-lg border-2 p-4 text-left transition ${on ? "border-ink bg-mint-soft" : "border-transparent bg-card hover:bg-control"}`}
                  >
                    <span className="text-[15px] font-semibold">{s.name}</span>
                    {s.description ? <span className="line-clamp-2 text-xs leading-snug text-ink-muted">{s.description}</span> : null}
                    {from !== null ? <span className="text-xs font-semibold">Desde {money(from)}</span> : null}
                  </button>
                );
              })}
            </div>
            {variables.map((v) => (
              <div key={v.key} className="flex flex-col gap-2">
                <span className="text-[13px] font-semibold">{v.label}</span>
                <ChoiceChips label={v.label} value={effective[v.key] ?? ""} onChange={(val) => choose(v.key, val)} options={v.options.map((o) => ({ value: o.value, label: o.label }))} />
              </div>
            ))}
          </Step>

          <Step n={3} title="Pasajeros y unidad">
            <div className="grid gap-5 md:grid-cols-[200px_minmax(0,1fr)]">
              <div className="flex flex-col gap-2.5">
                <TextField label="Número de pasajeros" icon="users" type="number" min={1} inputMode="numeric" value={form.passengers} onChange={(e) => set("passengers", e.target.value)} placeholder="12" />
                <span className="text-xs leading-snug text-ink-muted">La unidad se asigna sola: la más chica donde caben todos.</span>
              </div>
              <div aria-live="polite" className="flex items-center gap-5 rounded-lg bg-[linear-gradient(165deg,var(--mint)_0%,var(--mint-soft)_70%,var(--surface)_100%)] px-5 py-4 text-on-mint">
                <VehicleArt kind={assignedKind} width={Math.round(140 * VEHICLE_ART_WIDTH[assignedKind])} />
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
            {categories.length ? (
              <div aria-label="Unidades registradas en Transportes" className="grid grid-cols-2 gap-1.5 md:grid-cols-4">
                {categories.map((v) => {
                  const on = units.some((c) => servedBy(c)?.capacity === v.capacity);
                  return (
                    <div key={v.id} className={`flex flex-col gap-0.5 rounded-md px-3 py-2.5 ${on ? "bg-ink text-surface" : "bg-card text-ink-muted"}`}>
                      <span className="text-[13px] font-bold">{unitName(v.capacity)}</span>
                      <span className="text-[11px]">{vehicleRange(v).join("–")} pasajeros</span>
                    </div>
                  );
                })}
              </div>
            ) : vehicles.isSuccess ? (
              <p role="status" className="text-xs font-medium text-danger">
                Todavía no hay unidades registradas. Agrégalas en Transportes para que aparezcan aquí.
              </p>
            ) : null}
            {missingUnits.length ? (
              <p role="status" className="text-xs font-medium text-danger">
                Todavía no hay una unidad {[...new Set(missingUnits)].map(unitName).join(", ")} en Transportes: la orden se crea sin vehículo asignado.
              </p>
            ) : null}
          </Step>

          <Step n={4} title="Fecha y ruta">
            <div className="grid gap-3 md:grid-cols-2">
              <DatePicker label="Fecha del servicio" value={form.date} min={today()} onChange={(v) => set("date", v)} />
              <div className="flex flex-col gap-1.5">
                <span className="text-[13px] font-semibold">Ruta</span>
                <ChoiceChips label="Ruta" value={form.route} onChange={(v) => set("route", v)} options={[{ value: "round", label: "Ida y vuelta" }, { value: "one-way", label: "Solo ida" }]} />
              </div>
              <TextField label="Dirección de salida" icon="pin" value={form.origin} onChange={(e) => set("origin", e.target.value)} placeholder="Calle, número, colonia, municipio" />
              <TextField label="Destino" icon="route" value={destination} onChange={(e) => set("destination", e.target.value)} placeholder="Lugar del evento o destino" />
              <TextField label="Hora de salida" type="time" icon="clock" value={form.departureTime} onChange={(e) => set("departureTime", e.target.value)} />
              {form.route === "round" ? (
                <TextField label="Hora de regreso" type="time" icon="clock" value={form.returnTime} onChange={(e) => set("returnTime", e.target.value)} hint={`Duración: ${hoursLabel(durationHours(form.departureTime, form.returnTime))}`} />
              ) : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="itinerary" className="text-[13px] font-semibold">
                Itinerario (opcional)
              </label>
              <textarea
                id="itinerary"
                rows={4}
                value={form.itinerary}
                onChange={(e) => set("itinerary", e.target.value)}
                placeholder={"Día 1\n- Salida a las 10:00 hrs.\n- Llegada al hotel a las 18:00 hrs."}
                className="rounded-md bg-surface p-3.5 text-sm shadow-[inset_0_0_0_1px_var(--line)] outline-none placeholder:text-ink-faint focus:shadow-[inset_0_0_0_2px_var(--ink)]"
              />
              <span className="text-xs text-ink-muted">Si lo llenas, la orden de servicio agrega una página con el itinerario.</span>
            </div>
          </Step>

          <Step n={5} title="Precio y pago">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="flex flex-col gap-3.5">
                {service.charges.some((c) => c.mode === "manual") ? (
                  <div className="flex flex-col gap-3 md:flex-row md:flex-wrap">
                    {service.charges
                      .filter((c) => c.mode === "manual")
                      .map((c) => (
                        <Counter
                          key={c.id}
                          label={c.label}
                          hint={units.length ? `${money(chargeAmountFor(c, units))} c/u` : "Captura los pasajeros"}
                          value={manual[c.id] ?? 0}
                          onChange={(v) => setManual((m) => ({ ...m, [c.id]: v }))}
                        />
                      ))}
                  </div>
                ) : null}
                <TextField label="Descuento (opcional)" type="number" min={0} icon="dollar" value={form.discount} onChange={(e) => set("discount", e.target.value)} placeholder="0" hint="Se resta del total y aparece como una línea en la orden." />
                <div className="flex flex-col gap-2 rounded-lg bg-card p-3.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[13px] font-semibold">Precio recomendado</span>
                    <b className="tabular-nums">{recommended === null ? "—" : money(recommended)}</b>
                  </div>
                  <TextField
                    label="Precio final"
                    type="number"
                    min={0}
                    icon="dollar"
                    disabled={recommended === null}
                    value={override && override.base === recommended ? override.value : recommended === null ? "" : String(recommended)}
                    onChange={(e) => recommended !== null && setOverride({ value: e.target.value, base: recommended })}
                    hint={adjustment ? `${adjustment > 0 ? "+" : "−"}${money(Math.abs(adjustment))} sobre el recomendado: aparece como una línea "Ajuste de precio" en la orden.` : "Sale de la lista de precios. Escribe otro monto si acordaste un precio distinto."}
                  />
                  {adjustment ? (
                    <Button size="sm" variant="soft" className="self-start" onClick={() => setOverride(null)}>
                      Usar el recomendado
                    </Button>
                  ) : null}
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <TextField label="Anticipo recibido" type="number" min={0} icon="dollar" value={form.deposit} onChange={(e) => set("deposit", e.target.value)} placeholder="0" />
                  <DatePicker label="Fecha del anticipo" value={form.depositDate} onChange={(v) => set("depositDate", v)} />
                  <TextField label="Método" value={form.depositMethod} onChange={(e) => set("depositMethod", e.target.value)} />
                </div>
                <TextField label="Notas (opcional)" value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Aparecen en la orden de servicio" />
              </div>
              <div className="flex flex-col gap-2.5 rounded-lg bg-card p-4 text-[13px] tabular-nums" aria-live="polite">
                {lines.length ? (
                  lines.map((l, i) => (
                    <Row key={i} label={l.qty && l.qty > 1 ? `${l.qty} × ${l.concept}` : l.concept} value={money(l.amount)} />
                  ))
                ) : (
                  <span className="text-ink-muted">{passengers ? (priced.isFetching ? "Calculando…" : "Sin precio para estas opciones") : "Captura los pasajeros para ver el precio."}</span>
                )}
                {q && !q.ok ? (
                  <p role="alert" className="text-xs font-medium text-danger">
                    {q.errors.join(" ")}
                  </p>
                ) : null}
                {deposit ? <Row label="Anticipo" value={money(-deposit)} /> : null}
                <div className="flex justify-between border-t border-line pt-2.5 text-lg font-bold">
                  <span>Total</span>
                  <span>{total === null ? "Por cotizar" : money(total)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Por liquidar</span>
                  <span>{money(Math.max(0, (total ?? 0) - deposit))}</span>
                </div>
              </div>
            </div>
          </Step>

          <Step n={6} title="Documento">
            {(() => {
              const options = (templates.data ?? []).filter((t) => t.kind === "order" && t.status === "published");
              const assigned = options.find((t) => t.id === assignments.data?.order);
              return (
                <div className="flex flex-col gap-2">
                  <label htmlFor="document" className="text-[13px] font-semibold">
                    Documento que se genera con esta orden
                  </label>
                  <select
                    id="document"
                    value={form.templateId}
                    onChange={(e) => set("templateId", e.target.value)}
                    className="h-11 rounded-md bg-surface px-3 text-sm shadow-[inset_0_0_0_1px_var(--line)] outline-none focus:shadow-[inset_0_0_0_2px_var(--ink)]"
                  >
                    <option value="">{assigned ? `El predeterminado: ${assigned.name}` : "El predeterminado (ninguno asignado todavía)"}</option>
                    {options.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                        {t.mode === "document" ? " · documento" : " · PDF"}
                      </option>
                    ))}
                    <option value="none">Sin documento (solo guardar la orden)</option>
                  </select>
                  <span className="text-xs text-ink-muted">Se arma al guardar la orden con los datos que captures aquí. Desde el detalle de la orden puedes regenerarlo o usar otro documento.</span>
                </div>
              );
            })()}
          </Step>
        </div>

        <aside aria-label="Vista previa de la orden de servicio" className="flex min-w-0 flex-col gap-3 xl:sticky xl:top-24">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold">Orden de servicio · vista previa</span>
            <span className="text-xs text-ink-muted">En vivo, con el documento elegido</span>
          </div>
          <div className="overflow-hidden rounded-lg shadow-float">
            <OrderPreview
              draft={draft}
              choice={form.templateId}
              fallback={
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
                lines,
                total,
                payments: deposit ? [{ amount: deposit, date: form.depositDate }] : [],
                extraCharges,
                itinerary: form.itinerary.trim() || undefined,
              }}
            />
              }
            />
          </div>
        </aside>
      </div>

      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 text-ink-secondary">
      <span className="min-w-0 break-words">{label}</span>
      <span className="shrink-0 font-semibold text-ink">{value}</span>
    </div>
  );
}
