"use client";

import { useState, type ReactNode } from "react";

import { OrderPreview } from "@/components/orders/order-preview";
import { DatePicker } from "@/components/ui/date-picker";
import { Counter } from "@/components/ui/counter";
import { VEHICLE_ART_WIDTH, VehicleArt } from "@/components/ui/vehicle-art";
import { unitName } from "@/lib/fleet";
import { useAnimatedClose } from "@/lib/use-animated-close";
import { money, shortDate, time12 } from "@/lib/format";
import { startingPrice } from "@/lib/service-helpers";
import type { Client, DocumentTemplate, Order, Quote, RouteType, Service, VehicleKind } from "@/lib/types";

export interface OrderFormState {
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  passengers: string;
  date: string;
  route: RouteType;
  origin: string;
  destination: string;
  departureTime: string;
  returnTime: string;
  discount: string;
  deposit: string;
  depositDate: string;
  depositMethod: string;
  templateId: string;
}

export interface MobileFlowProps {
  form: OrderFormState;
  set: <K extends keyof OrderFormState>(key: K, value: OrderFormState[K]) => void;
  clients: Client[];
  existing: boolean;
  services: Service[];
  service: Service;
  onPickService: (id: string) => void;
  variables: { key: string; label: string; options: { value: string; label: string }[] }[];
  effective: Record<string, string>;
  choose: (key: string, value: string) => void;
  units: number[];
  assignedKind: VehicleKind;
  missingUnits: number[];
  q: Quote | undefined;
  recommended: number | null;
  total: number | null;
  adjustment: number;
  override: { value: string; base: number } | null;
  setOverride: (o: { value: string; base: number } | null) => void;
  deposit: number;
  manual: Record<string, number>;
  setManual: (charge: string, qty: number) => void;
  chargeHint: (chargeId: string) => string;
  destination: string;
  templates: DocumentTemplate[];
  defaultTemplateId: string | undefined;
  draft: Order | null;
  submit: (asQuote: boolean) => void;
  pending: boolean;
  error: string;
  setError: (message: string) => void;
  onExit: () => void;
}

const STEPS = ["Cliente", "Servicio", "Pasajeros y unidad", "Fecha y ruta", "Precio y anticipo", "Revisa y genera"];
const METHODS = ["Efectivo", "Transferencia", "Tarjeta"];
const QUICK = [4, 10, 18, 40];
const today = () => new Date().toISOString().slice(0, 10);

const field = "h-14 w-full rounded-2xl bg-surface px-4 text-[17px] shadow-[inset_0_0_0_1px_var(--line)] outline-none focus:shadow-[inset_0_0_0_2px_var(--ink)]";

function Title({ children }: { children: ReactNode }) {
  return <h1 className="text-[34px] font-bold leading-[1.05] tracking-[-0.03em]">{children}</h1>;
}

function Label({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-2 text-sm font-semibold">
      {label}
      {children}
    </label>
  );
}

function Icon({ d, size = 20, width = 2.2 }: { d: string; size?: number; width?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

/**
 * The phone version of "Nueva orden": one decision per screen, a progress bar, one big
 * button at the bottom and, at the end, a full-screen preview of the document.
 */
export function MobileOrderFlow(p: MobileFlowProps) {
  const { form, set } = p;
  const [step, setStep] = useState(1);
  const [previewWidth, setPreviewWidth] = useState<number | null>(null);
  const [closingPreview, closePreview] = useAnimatedClose(() => setPreviewWidth(null));

  const pax = Math.max(0, parseInt(form.passengers, 10) || 0);
  const name = form.clientName.trim();
  const query = name.toLowerCase();
  const matches = p.clients.filter((c) => !query || c.name.toLowerCase().includes(query)).slice(0, 6);
  const exact = p.clients.some((c) => c.name.trim().toLowerCase() === query);
  const unitLabel = !p.units.length ? "—" : p.units.length === 1 ? unitName(p.units[0]) : `${p.units.length} unidades`;
  const free = p.units.length === 1 ? p.units[0] - pax : 0;
  const priceShown = p.override && p.override.base === p.recommended ? p.override.value : p.recommended === null ? "" : String(p.recommended);

  const go = (n: number) => {
    setStep(n);
    p.setError("");
  };

  function next() {
    const missing =
      step === 1 && !name
        ? "Escribe o elige el cliente para continuar."
        : step === 3 && !pax
          ? "Captura cuántos pasajeros viajan."
          : step === 4 && (!form.date || !form.origin.trim() || !p.destination.trim())
            ? "Completa la fecha, la dirección de salida y el destino."
            : step === 5 && !p.q?.ok
              ? ((p.q && !p.q.ok ? p.q.errors[0] : undefined) ?? "Todavía no hay un precio para estas opciones.")
              : step === 5 && p.total !== null && p.deposit > p.total
                ? "El anticipo es mayor al total de la orden."
                : "";
    p.setError(missing);
    if (!missing) setStep(step + 1);
  }

  const options = p.templates.filter((t) => t.kind === "order" && t.status === "published");
  const defaultDoc = options.find((t) => t.id === p.defaultTemplateId);
  const docs = [
    { id: "", name: defaultDoc ? defaultDoc.name : "Predeterminado", tag: "Predeterminado" },
    ...options.filter((t) => t.id !== p.defaultTemplateId).map((t) => ({ id: t.id, name: t.name, tag: "" })),
    { id: "none", name: "Sin documento", tag: "" },
  ];
  const docName = docs.find((d) => d.id === form.templateId)?.name ?? "Documento";

  const summary = [
    { to: 1, k: "Cliente", v: name || "—" },
    { to: 2, k: "Servicio", v: `${p.service.name}${p.destination ? ` · ${p.destination}` : ""}` },
    { to: 3, k: "Pasajeros y unidad", v: `${pax || "—"} pasajeros${p.units.length ? ` · ${p.units.map(unitName).join(" + ")}` : ""}` },
    { to: 4, k: "Fecha y ruta", v: `${form.date ? shortDate(form.date) : "—"} · ${time12(form.departureTime)} · ${form.route === "round" ? "Redondo" : "Sencillo"}` },
    { to: 5, k: "Anticipo", v: p.deposit ? `${money(p.deposit)} · ${form.depositMethod}` : "Sin anticipo" },
  ];

  const showHint = step >= 3 && step <= 5;
  const primary = step < 6 ? "Continuar" : p.pending ? "Generando…" : "Generar orden";

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-canvas text-ink lg:hidden">
      <div className="flex shrink-0 items-center gap-3.5 px-5 pt-5">
        <button type="button" aria-label="Volver" onClick={() => (step > 1 ? go(step - 1) : p.onExit())} className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-surface shadow-row">
          <Icon d="M15 5l-7 7 7 7" />
        </button>
        <div className="grid flex-1 grid-cols-6 gap-1.5" role="progressbar" aria-label="Progreso de la orden" aria-valuemin={1} aria-valuemax={6} aria-valuenow={step}>
          {STEPS.map((s, i) => (
            <span key={s} className={`h-[5px] rounded-full ${i < step ? "bg-ink" : "bg-control-strong"}`} />
          ))}
        </div>
        <span className="w-10 text-right text-[13px] font-semibold text-ink-muted">{step}/6</span>
      </div>

      <div key={step} className="anim-step flex min-h-0 flex-1 flex-col gap-[22px] overflow-y-auto px-5 pb-6 pt-7">
        {step === 1 ? (
          <>
            <Title>¿Quién viaja?</Title>
            <label className="flex h-[60px] items-center gap-3 rounded-[18px] bg-surface px-[18px] shadow-[inset_0_0_0_2px_var(--ink)]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <span className="sr-only">Nombre del cliente</span>
              <input
                value={form.clientName}
                onChange={(e) => set("clientName", e.target.value)}
                placeholder="Nombre del cliente"
                autoComplete="off"
                className="min-w-0 flex-1 bg-transparent text-lg font-medium outline-none placeholder:text-ink-faint"
              />
            </label>
            <div className="flex flex-col gap-2">
              {matches.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    set("clientName", c.name);
                    set("clientPhone", c.phone);
                    set("clientEmail", c.email);
                    go(2);
                  }}
                  className="flex min-h-16 items-center gap-3.5 rounded-[18px] bg-surface px-4 py-2.5 text-left shadow-row"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-mint-soft text-[15px] font-bold text-mint-deep">
                    {c.name
                      .split(" ")
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-base font-semibold">{c.name}</span>
                    <span className="text-[13px] text-ink-muted">
                      {c.phone} · {c.servicesCount} {c.servicesCount === 1 ? "servicio" : "servicios"}
                    </span>
                  </span>
                </button>
              ))}
              {name && !exact ? (
                <button type="button" onClick={() => go(2)} className="flex min-h-16 items-center gap-3.5 rounded-[18px] border-2 border-dashed border-control-strong px-4 py-2.5 text-left">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink text-surface">
                    <Icon d="M12 5v14M5 12h14" size={18} width={2.4} />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-base font-semibold">Crear “{name}”</span>
                    <span className="text-[13px] text-ink-muted">Cliente nuevo, se da de alta con la orden</span>
                  </span>
                </button>
              ) : null}
            </div>
            {name && !p.existing ? (
              <Label label="Celular">
                <input type="tel" inputMode="tel" value={form.clientPhone} onChange={(e) => set("clientPhone", e.target.value)} placeholder="33 0000 0000" className={field} />
              </Label>
            ) : null}
          </>
        ) : null}

        {step === 2 ? (
          <>
            <Title>¿Qué servicio?</Title>
            <div role="radiogroup" aria-label="Servicio" className="flex flex-col gap-2.5">
              {p.services.map((s) => {
                const on = s.id === p.service.id;
                const from = startingPrice(s);
                return (
                  <button
                    key={s.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => p.onPickService(s.id)}
                    className={`flex min-h-[76px] items-center gap-3.5 rounded-[20px] border-2 px-[18px] py-3.5 text-left ${on ? "border-ink bg-mint-soft" : "border-transparent bg-surface shadow-row"}`}
                  >
                    <span className="flex flex-1 flex-col gap-0.5">
                      <span className="text-lg font-bold tracking-[-0.01em]">{s.name}</span>
                      {s.description ? <span className="line-clamp-2 text-[13px] text-ink-secondary">{s.description}</span> : null}
                      {from !== null ? <span className="text-[13px] font-semibold">Desde {money(from)}</span> : null}
                    </span>
                    <span className={`flex size-[26px] shrink-0 items-center justify-center rounded-full text-surface ${on ? "bg-ink" : "bg-control-strong"}`}>
                      {on ? <Icon d="M5 12.5l4.5 4.5L19 7.5" size={14} width={3.2} /> : null}
                    </span>
                  </button>
                );
              })}
            </div>
            {p.variables.map((v) => (
              <div key={v.key} className="flex flex-col gap-2.5">
                <span className="text-sm font-semibold">{v.label}</span>
                <div className="flex flex-wrap gap-2">
                  {v.options.map((o) => {
                    const on = (p.effective[v.key] ?? "") === o.value;
                    return (
                      <button key={o.value} type="button" aria-pressed={on} onClick={() => p.choose(v.key, o.value)} className={`h-12 rounded-full px-5 text-[15px] font-semibold ${on ? "bg-ink text-surface" : "bg-surface text-ink shadow-row"}`}>
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </>
        ) : null}

        {step === 3 ? (
          <>
            <Title>¿Cuántos pasajeros?</Title>
            <div className="flex items-center justify-between gap-3 rounded-[28px] bg-surface p-[18px] shadow-row">
              <button type="button" aria-label="Uno menos" onClick={() => set("passengers", String(Math.max(1, pax - 1)))} className="flex size-16 items-center justify-center rounded-[20px] bg-card">
                <Icon d="M5 12h14" size={24} width={2.4} />
              </button>
              <div className="flex flex-col items-center">
                <input
                  aria-label="Número de pasajeros"
                  type="number"
                  min={1}
                  inputMode="numeric"
                  value={form.passengers}
                  onChange={(e) => set("passengers", e.target.value)}
                  placeholder="0"
                  className="w-28 bg-transparent text-center text-[64px] font-bold leading-none tracking-[-0.04em] outline-none placeholder:text-control-strong"
                />
                <span className="text-[13px] text-ink-muted">pasajeros</span>
              </div>
              <button type="button" aria-label="Uno más" onClick={() => set("passengers", String(pax + 1))} className="flex size-16 items-center justify-center rounded-[20px] bg-ink text-surface">
                <Icon d="M12 5v14M5 12h14" size={24} width={2.4} />
              </button>
            </div>
            <div className="flex gap-2">
              {QUICK.map((n) => (
                <button key={n} type="button" onClick={() => set("passengers", String(n))} className={`h-12 flex-1 rounded-[14px] text-[15px] font-semibold ${pax === n ? "bg-ink text-surface" : "bg-control"}`}>
                  {n}
                </button>
              ))}
            </div>
            <div aria-live="polite" className="flex flex-col gap-1.5 rounded-[28px] bg-mint-soft px-5 pb-5 pt-[18px]">
              <span className="text-[13px] font-semibold text-mint-deep">Unidad asignada</span>
              <div className="flex h-[120px] items-center justify-center">
                <VehicleArt kind={p.assignedKind} width={Math.round(140 * VEHICLE_ART_WIDTH[p.assignedKind])} />
              </div>
              <span className="text-2xl font-bold tracking-[-0.02em]">{p.units.length ? unitLabel : "Captura los pasajeros"}</span>
              <span className="text-sm text-ink-secondary">
                {!p.units.length
                  ? "Te sugerimos la unidad al escribir cuántas personas viajan."
                  : p.units.length === 1
                    ? `${pax} pasajeros${free > 0 ? ` · ${free} lugares libres` : " · llena"}`
                    : `${p.units.map(unitName).join(" + ")} para ${pax} pasajeros`}
              </span>
            </div>
            {p.missingUnits.length ? (
              <p role="status" className="text-xs font-medium text-danger">
                Todavía no hay una unidad {[...new Set(p.missingUnits)].map(unitName).join(", ")} en Transportes: la orden se crea sin vehículo asignado.
              </p>
            ) : null}
          </>
        ) : null}

        {step === 4 ? (
          <>
            <Title>¿Cuándo y por dónde?</Title>
            <div className="grid grid-cols-2 gap-3">
              <DatePicker label="Fecha" size="lg" icon={false} placeholder="Elige" min={today()} value={form.date} onChange={(v) => set("date", v)} />
              <Label label="Hora de salida">
                <input type="time" value={form.departureTime} onChange={(e) => set("departureTime", e.target.value)} className={field} />
              </Label>
            </div>
            <div role="group" aria-label="Tipo de ruta" className="grid grid-cols-2 gap-1.5 rounded-[18px] bg-control p-[5px]">
              {(
                [
                  ["one-way", "Sencillo"],
                  ["round", "Redondo"],
                ] as const
              ).map(([id, label]) => (
                <button key={id} type="button" aria-pressed={form.route === id} onClick={() => set("route", id)} className={`h-12 rounded-[14px] text-[15px] font-semibold ${form.route === id ? "bg-surface shadow-row" : ""}`}>
                  {label}
                </button>
              ))}
            </div>
            {form.route === "round" ? (
              <Label label="Hora de regreso">
                <input type="time" value={form.returnTime} onChange={(e) => set("returnTime", e.target.value)} className={field} />
              </Label>
            ) : null}
            <Label label="Dirección de salida">
              <input value={form.origin} onChange={(e) => set("origin", e.target.value)} placeholder="Calle, número, colonia" className={field} />
            </Label>
            <Label label="Destino">
              <input value={p.destination} onChange={(e) => set("destination", e.target.value)} placeholder="A dónde van" className={field} />
            </Label>
          </>
        ) : null}

        {step === 5 ? (
          <>
            <Title>Precio y anticipo</Title>
            <div className="flex flex-col gap-3.5 rounded-[28px] bg-surface px-5 py-[22px] shadow-row">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-semibold text-ink-muted">Precio recomendado</span>
                <span className="text-base font-semibold text-ink-muted">{p.recommended === null ? "—" : money(p.recommended)}</span>
              </div>
              <label className="flex flex-col gap-2 text-sm font-semibold">
                Precio final
                <span className="flex h-[72px] items-center gap-1.5 rounded-[20px] bg-surface px-[18px] shadow-[inset_0_0_0_2px_var(--ink)]">
                  <span className="text-[28px] font-bold text-ink-muted">$</span>
                  <input
                    type="number"
                    min={0}
                    inputMode="decimal"
                    disabled={p.recommended === null}
                    value={priceShown}
                    onChange={(e) => p.recommended !== null && p.setOverride({ value: e.target.value, base: p.recommended })}
                    className="min-w-0 flex-1 bg-transparent text-[34px] font-bold tracking-[-0.02em] outline-none"
                  />
                </span>
              </label>
              {p.adjustment ? (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[13px] font-semibold text-mint-deep">
                    {p.adjustment > 0 ? `Ajuste de ${money(p.adjustment)} sobre lo recomendado` : `Descuento de ${money(-p.adjustment)}`}
                  </span>
                  <button type="button" onClick={() => p.setOverride(null)} className="text-[13px] font-semibold underline">
                    Usar el recomendado
                  </button>
                </div>
              ) : null}
              {p.q && !p.q.ok ? (
                <p role="alert" className="text-xs font-medium text-danger">
                  {p.q.errors.join(" ")}
                </p>
              ) : null}
            </div>
            {p.service.charges.some((c) => c.mode === "manual") ? (
              <div className="flex flex-col gap-2">
                {p.service.charges
                  .filter((c) => c.mode === "manual")
                  .map((c) => (
                    <Counter key={c.id} label={c.label} hint={p.chargeHint(c.id)} value={p.manual[c.id] ?? 0} onChange={(v) => p.setManual(c.id, v)} />
                  ))}
              </div>
            ) : null}
            <div className="flex flex-col gap-2.5">
              <span className="text-sm font-semibold">
                Anticipo <span className="font-normal text-ink-muted">(opcional)</span>
              </span>
              <span className="flex h-[60px] items-center gap-1.5 rounded-[18px] bg-surface px-[18px] shadow-[inset_0_0_0_1px_var(--line)]">
                <span className="text-xl font-semibold text-ink-muted">$</span>
                <input type="number" min={0} inputMode="decimal" aria-label="Anticipo" value={form.deposit} onChange={(e) => set("deposit", e.target.value)} placeholder="0" className="min-w-0 flex-1 bg-transparent text-[22px] font-semibold outline-none placeholder:text-ink-faint" />
              </span>
              <div className="flex gap-2">
                {METHODS.map((m) => (
                  <button key={m} type="button" aria-pressed={form.depositMethod === m} onClick={() => set("depositMethod", m)} className={`h-12 flex-1 rounded-[14px] text-sm font-semibold ${form.depositMethod === m ? "bg-ink text-surface" : "bg-control"}`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : null}

        {step === 6 ? (
          <>
            <Title>Revisa y genera</Title>
            <div className="overflow-hidden rounded-[28px] bg-surface shadow-row">
              {summary.map((r, i) => (
                <button key={r.to} type="button" aria-label={`Editar ${r.k}`} onClick={() => go(r.to)} className={`flex min-h-16 w-full items-center justify-between gap-3 px-5 py-3 text-left ${i ? "border-t border-line" : ""}`}>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-xs font-semibold text-ink-muted">{r.k}</span>
                    <span className="truncate text-base font-semibold">{r.v}</span>
                  </span>
                  <Icon d="M9 5l7 7-7 7" size={18} />
                </button>
              ))}
              <div className="flex items-baseline justify-between bg-ink px-5 py-4 text-surface">
                <span className="text-sm font-semibold">Total</span>
                <span className="text-[26px] font-bold tracking-[-0.02em] tabular-nums">{p.total === null ? "Por cotizar" : money(p.total)}</span>
              </div>
            </div>
            <div className="flex flex-col gap-2.5">
              <span className="text-sm font-semibold">Documento</span>
              <div role="radiogroup" aria-label="Documento" className="flex flex-col gap-2">
                {docs.map((d) => {
                  const on = form.templateId === d.id;
                  return (
                    <button key={d.id || "default"} type="button" role="radio" aria-checked={on} onClick={() => set("templateId", d.id)} className={`flex min-h-14 items-center gap-3 rounded-2xl border-2 px-4 py-2.5 text-left text-[15px] font-semibold ${on ? "border-ink bg-mint-soft" : "border-transparent bg-surface shadow-row"}`}>
                      <span className="flex-1">{d.name}</span>
                      {d.tag ? <span className="text-xs font-medium text-ink-secondary">{d.tag}</span> : null}
                    </button>
                  );
                })}
              </div>
            </div>
            <button
              type="button"
              disabled={!p.draft}
              onClick={() => setPreviewWidth(Math.min(560, window.innerWidth - 40))}
              className="flex h-14 items-center justify-center gap-2.5 rounded-[18px] bg-surface text-base font-bold shadow-[inset_0_0_0_2px_var(--ink)] disabled:opacity-45"
            >
              <Icon d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h6" size={20} width={2} />
              Ver documento
            </button>
            <button type="button" disabled={p.pending || !p.q?.ok} onClick={() => p.submit(true)} className="h-12 text-[15px] font-semibold underline disabled:opacity-45">
              Guardar como cotización
            </button>
          </>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-col gap-2.5 bg-[linear-gradient(to_top,var(--canvas)_70%,transparent)] px-5 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-3.5">
        {p.error ? (
          <p role="alert" className="text-[13px] font-medium text-danger">
            {p.error}
          </p>
        ) : null}
        {showHint ? (
          <div className="flex items-baseline justify-between text-sm text-ink-secondary">
            <span>{step === 5 ? "Total" : "Unidad"}</span>
            <span className="font-bold text-ink">{step === 5 ? (p.total === null ? "—" : money(p.total)) : unitLabel}</span>
          </div>
        ) : null}
        <button
          type="button"
          disabled={p.pending}
          onClick={() => (step < 6 ? next() : p.submit(false))}
          className={`h-[60px] rounded-[20px] text-[17px] font-bold text-surface disabled:opacity-60 ${step === 1 && !name ? "bg-control-strong" : "bg-ink"}`}
        >
          {primary}
        </button>
      </div>

      {previewWidth ? (
        <div role="dialog" aria-label="Vista previa del documento" className={`anim-full absolute inset-0 z-10 flex flex-col bg-[#1c1c1a] ${closingPreview ? "is-closing" : ""}`}>
          <div className="flex shrink-0 items-center justify-between gap-3 px-5 pb-3 pt-5 text-surface">
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-[17px] font-bold">{docName}</span>
              <span className="text-[13px] text-ink-faint">Así se imprime</span>
            </div>
            <button type="button" aria-label="Cerrar vista previa" onClick={closePreview} className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/15">
              <Icon d="M6 6l12 12M18 6 6 18" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 pt-2">
            <OrderPreview draft={p.draft} choice={form.templateId} width={previewWidth} fallback={<p className="rounded-lg bg-surface p-4 text-sm">Completa los datos para ver el documento.</p>} />
          </div>
          <div className="flex shrink-0 gap-2.5 px-5 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-3">
            <button type="button" onClick={closePreview} className="h-14 flex-1 rounded-[18px] bg-white/15 text-base font-bold text-surface">
              Seguir editando
            </button>
            <button type="button" disabled={p.pending} onClick={() => p.submit(false)} className="h-14 flex-1 rounded-[18px] bg-mint text-base font-bold text-ink disabled:opacity-60">
              {p.pending ? "Generando…" : "Generar orden"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
