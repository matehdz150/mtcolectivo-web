"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { FilterTabs } from "@/components/ui/filter-tabs";
import { EmptyState, ErrorState, PageHeader, Panel, Skeleton } from "@/components/ui/misc";
import { TextField } from "@/components/ui/text-field";
import { ApiError } from "@/lib/api";
import { CAPACITIES, unitName } from "@/lib/fleet";
import { money } from "@/lib/format";
import { useCreateService, useDeleteService, useDuplicateService, useSaveService, useServices } from "@/lib/queries";
import { combinations, priceKeys, sameSel, slugify, withoutRef } from "@/lib/service-helpers";
import type { Charge, PriceRow, Service, ServiceInput, Variable } from "@/lib/types";

const BLANK: ServiceInput = { name: "Nuevo servicio", description: "", active: true, variables: [], prices: [], charges: [] };

const toInput = (s: Service): ServiceInput => ({ name: s.name, description: s.description ?? "", active: s.active, variables: s.variables, prices: s.prices, charges: s.charges });
const errorLines = (err: unknown) => (err instanceof ApiError ? [err.message, ...(err.details ?? [])] : ["No pudimos guardar. Intenta de nuevo."]);

export default function PricesPage() {
  const services = useServices();
  const create = useCreateService();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  /** Phone: the list of services, or the editor of the chosen one. */
  const [editingOnPhone, setEditingOnPhone] = useState(false);

  if (services.isPending) return <Skeleton rows={8} />;
  if (services.isError) return <ErrorState message="No pudimos cargar los precios." onRetry={() => services.refetch()} />;

  const list = services.data;
  const selected = list.find((s) => s.id === selectedId) ?? list[0];

  const go = (id: string) => {
    if (dirty && !window.confirm("Tienes cambios sin guardar en este servicio. ¿Descartarlos?")) return;
    setDirty(false);
    setSelectedId(id);
  };

  return (
    <>
      <PageHeader
        inlineActions
        title="Precios"
        subtitle={
          <>
            <span className="max-lg:hidden">Servicios, variables y tarifas. El cotizador y las órdenes usan exactamente lo que guardes aquí.</span>
            <span className="lg:hidden">
              {list.filter((s) => s.active).length} {list.filter((s) => s.active).length === 1 ? "servicio activo" : "servicios activos"}
            </span>
          </>
        }
        actions={
          <Button
            icon="plus"
            className="max-lg:size-12 max-lg:rounded-2xl max-lg:px-0"
            disabled={create.isPending}
            onClick={() =>
              create.mutate(BLANK, {
                onSuccess: (s) => {
                  go(s.id);
                  setEditingOnPhone(true);
                },
              })
            }
          >
            <span className="max-lg:sr-only">Nuevo servicio</span>
          </Button>
        }
      />
      {create.isError ? <ErrorState message={errorLines(create.error).join(" ")} /> : null}

      {list.length === 0 ? (
        <EmptyState title="Todavía no hay servicios" body="Crea el primero con “Nuevo servicio”." />
      ) : (
        <>
          <div className="flex flex-col gap-3 lg:hidden" hidden={editingOnPhone}>
            {list.map((s) => {
              const caps = [...new Set(s.prices.map((p) => p.capacity))].sort((a, b) => a - b);
              return (
                <article key={s.id} className="flex flex-col gap-3.5 rounded-3xl bg-surface p-[18px] shadow-row">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-xl font-bold tracking-[-0.02em]">{s.name}</span>
                      {s.description ? <span className="text-[13px] text-ink-secondary">{s.description}</span> : null}
                    </div>
                    <span className={`inline-flex h-[26px] shrink-0 items-center rounded-full px-3 text-xs font-bold ${s.active ? "bg-mint-soft text-mint-deep" : "bg-card text-ink-secondary"}`}>{s.active ? "Activo" : "Inactivo"}</span>
                  </div>
                  {caps.length ? (
                    <div className="grid grid-cols-2 gap-2">
                      {caps.map((c) => {
                        const amounts = s.prices.filter((p) => p.capacity === c).map((p) => p.price);
                        const varied = new Set(amounts).size > 1;
                        return (
                          <div key={c} className="flex flex-col rounded-[14px] bg-canvas px-3.5 py-2.5">
                            <span className="text-xs text-ink-muted">{unitName(c)}</span>
                            <span className="text-[17px] font-bold tracking-[-0.01em] tabular-nums">
                              {varied ? "Desde " : ""}
                              {money(Math.min(...amounts))}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-[13px] text-ink-muted">Todavía sin precios.</span>
                  )}
                  <Button
                    variant="soft"
                    onClick={() => {
                      go(s.id);
                      setEditingOnPhone(true);
                    }}
                  >
                    Editar precios
                  </Button>
                </article>
              );
            })}
          </div>
          <div className={`flex flex-col gap-4 ${editingOnPhone ? "" : "max-lg:hidden"}`}>
            <button type="button" onClick={() => setEditingOnPhone(false)} className="flex h-11 items-center gap-2 self-start text-sm font-semibold lg:hidden">
              ‹ Todos los servicios
            </button>
            <div className="max-lg:hidden">
              <FilterTabs label="Servicio" tabs={list.map((s) => ({ id: s.id, label: s.active ? s.name : `${s.name} (inactivo)` }))} value={selected.id} onChange={go} />
            </div>
            <ServiceEditor key={`${selected.id}-${selected.updatedAt}`} service={selected} onDirty={setDirty} onDeleted={() => { setSelectedId(null); setEditingOnPhone(false); }} onDuplicated={go} />
          </div>
        </>
      )}
    </>
  );
}

/* --------------------------------------------------------------- editor */

function ServiceEditor({ service, onDirty, onDeleted, onDuplicated }: { service: Service; onDirty: (dirty: boolean) => void; onDeleted: () => void; onDuplicated: (id: string) => void }) {
  const save = useSaveService();
  const duplicate = useDuplicateService();
  const remove = useDeleteService();
  const [draft, setDraftState] = useState<ServiceInput>(() => toInput(service));
  const original = useMemo(() => JSON.stringify(toInput(service)), [service]);
  const isDirty = JSON.stringify(draft) !== original;

  const setDraft = setDraftState;

  useEffect(() => {
    onDirty(isDirty);
  }, [isDirty, onDirty]);

  const capacities = useMemo(() => [...new Set([...CAPACITIES, ...draft.prices.map((p) => p.capacity)])].sort((a, b) => a - b), [draft.prices]);

  return (
    <div className="flex flex-col gap-4">
      <Panel className="flex flex-col gap-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <TextField label="Nombre del servicio" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <TextField label="Descripción (se muestra al cotizar)" value={draft.description ?? ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium">
            <input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} className="size-[18px] accent-ink" />
            Servicio activo (aparece al crear órdenes)
          </label>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" disabled={duplicate.isPending} onClick={() => duplicate.mutate(service.id, { onSuccess: (s) => onDuplicated(s.id) })}>
              Duplicar (p. ej. para el siguiente año)
            </Button>
          </div>
        </div>
      </Panel>

      <VariablesPanel draft={draft} setDraft={setDraft} />
      <PriceGrid draft={draft} setDraft={setDraft} capacities={capacities} />
      <ChargesPanel draft={draft} setDraft={setDraft} capacities={capacities} />

      {save.isError || duplicate.isError || remove.isError ? (
        <div role="alert" className="flex flex-col gap-1 rounded-xl bg-danger-soft px-6 py-4 text-sm font-medium text-danger">
          {errorLines(save.error ?? duplicate.error ?? remove.error).map((l, i) => (
            <span key={i}>{l}</span>
          ))}
        </div>
      ) : null}

      <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-xl bg-ink px-5 py-3.5 text-surface shadow-float max-lg:bottom-24">
        <span className="text-sm font-medium">{isDirty ? "Tienes cambios sin guardar." : save.isSuccess ? "Guardado." : "Sin cambios."}</span>
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="soft"
            icon="x"
            disabled={remove.isPending}
            onClick={() => window.confirm(`¿Eliminar el servicio “${service.name}” y todos sus precios? Las órdenes ya creadas conservan sus precios.`) && remove.mutate(service.id, { onSuccess: onDeleted })}
          >
            Eliminar
          </Button>
          <Button variant="soft" disabled={!isDirty} onClick={() => setDraftState(toInput(service))}>
            Descartar
          </Button>
          <Button variant="accent" icon="check" disabled={!isDirty || save.isPending} onClick={() => save.mutate({ id: service.id, input: { ...draft, description: draft.description?.trim() || undefined } }, )}>
            {save.isPending ? "Guardando…" : "Guardar cambios"}
          </Button>
        </div>
      </div>
    </div>
  );
}

type EditorProps = { draft: ServiceInput; setDraft: (next: ServiceInput | ((prev: ServiceInput) => ServiceInput)) => void };

function Section({ title, hint, children, action }: { title: string; hint?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <Panel className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-lg font-semibold">{title}</h2>
          {hint ? <p className="max-w-[720px] text-[13px] text-ink-muted">{hint}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </Panel>
  );
}

/* ------------------------------------------------------------ variables */

function VariablesPanel({ draft, setDraft }: EditorProps) {
  const affecting = priceKeys(draft);

  const updateVar = (key: string, patch: Partial<Variable>) => setDraft((d) => ({ ...d, variables: d.variables.map((v) => (v.key === key ? { ...v, ...patch } : v)) }));

  const addVariable = () =>
    setDraft((d) => {
      const key = slugify("variable", d.variables.map((v) => v.key));
      return { ...d, variables: [...d.variables, { key, label: "Nueva variable", options: [{ value: "opcion-1", label: "Opción 1" }] }] };
    });

  /** "Cambia el precio": on = prices exist for every option; off = one price for all options. */
  const togglePrice = (v: Variable, on: boolean) =>
    setDraft((d) => {
      if (!on) return withoutPriceKey(d, v.key);
      const prices: PriceRow[] = d.prices.flatMap((p) => (v.key in p.sel ? [p] : v.options.map((o) => ({ ...p, sel: { ...p.sel, [v.key]: o.value } }))));
      return { ...d, prices };
    });

  return (
    <Section
      title="Variables"
      hint="Lo que el operador elige al cotizar: horario, destino, días, tipo de tarifa… Cada opción puede tener su propio precio. Una variable que no cambia el precio sirve para recargos."
      action={
        <Button variant="secondary" size="sm" icon="plus" onClick={addVariable}>
          Agregar variable
        </Button>
      }
    >
      {draft.variables.length === 0 ? <p className="text-sm text-ink-muted">Sin variables: el servicio tiene un solo precio por unidad.</p> : null}
      <div className="grid gap-3 lg:grid-cols-2">
        {draft.variables.map((v) => {
          const others = draft.variables.filter((o) => o.key !== v.key);
          const dep = Object.entries(v.showWhen ?? {})[0];
          return (
            <div key={v.key} className="flex flex-col gap-3 rounded-lg bg-card p-4">
              <div className="flex items-end gap-2">
                <TextField label="Nombre" className="flex-1" value={v.label} onChange={(e) => updateVar(v.key, { label: e.target.value })} />
                <Button variant="soft" size="sm" icon="x" aria-label={`Quitar la variable ${v.label}`} onClick={() => setDraft((d) => withoutRef(d, v.key))}>
                  Quitar
                </Button>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[13px] font-semibold">Opciones</span>
                {v.options.map((o) => (
                  <div key={o.value} className="flex items-center gap-2">
                    <input
                      aria-label={`Opción de ${v.label}`}
                      value={o.label}
                      onChange={(e) => updateVar(v.key, { options: v.options.map((x) => (x.value === o.value ? { ...x, label: e.target.value } : x)) })}
                      className="h-9 min-w-0 flex-1 rounded-md bg-surface px-3 text-sm shadow-[inset_0_0_0_1px_var(--line)] outline-none focus:shadow-[inset_0_0_0_2px_var(--ink)]"
                    />
                    <button
                      type="button"
                      aria-label={`Quitar ${o.label}`}
                      disabled={v.options.length <= 1}
                      onClick={() => setDraft((d) => withoutRef(d, v.key, o.value))}
                      className="size-9 rounded-md text-ink-muted hover:bg-control disabled:opacity-30"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <Button
                  variant="soft"
                  size="sm"
                  icon="plus"
                  className="self-start"
                  onClick={() => updateVar(v.key, { options: [...v.options, { value: slugify("opcion", v.options.map((o) => o.value)), label: `Opción ${v.options.length + 1}` }] })}
                >
                  Agregar opción
                </Button>
              </div>
              <label className="flex cursor-pointer items-center gap-2.5 text-[13px] font-medium">
                <input type="checkbox" checked={affecting.has(v.key) || draft.prices.length === 0} onChange={(e) => togglePrice(v, e.target.checked)} className="size-4 accent-ink" />
                Cambia el precio (cada opción tiene el suyo)
              </label>
              {others.length ? (
                <div className="flex flex-wrap items-center gap-2 text-[13px]">
                  <label className="flex cursor-pointer items-center gap-2.5 font-medium">
                    <input
                      type="checkbox"
                      checked={!!dep}
                      onChange={(e) => updateVar(v.key, { showWhen: e.target.checked ? { [others[0].key]: others[0].options[0].value } : undefined })}
                      className="size-4 accent-ink"
                    />
                    Solo se pregunta cuando
                  </label>
                  {dep ? (
                    <>
                      <select
                        aria-label="Variable de la que depende"
                        value={dep[0]}
                        onChange={(e) => {
                          const target = others.find((o) => o.key === e.target.value);
                          if (target) updateVar(v.key, { showWhen: { [target.key]: target.options[0].value } });
                        }}
                        className="h-8 rounded-md bg-surface px-2 shadow-[inset_0_0_0_1px_var(--line)]"
                      >
                        {others.map((o) => (
                          <option key={o.key} value={o.key}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      <span>=</span>
                      <select
                        aria-label="Opción requerida"
                        value={dep[1]}
                        onChange={(e) => updateVar(v.key, { showWhen: { [dep[0]]: e.target.value } })}
                        className="h-8 rounded-md bg-surface px-2 shadow-[inset_0_0_0_1px_var(--line)]"
                      >
                        {others.find((o) => o.key === dep[0])?.options.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </Section>
  );
}

/** Removes one variable from the price rows only (it stays available for surcharges). */
function withoutPriceKey(d: ServiceInput, key: string): ServiceInput {
  const seen = new Set<string>();
  const prices = d.prices
    .map((p) => ({ ...p, sel: Object.fromEntries(Object.entries(p.sel).filter(([k]) => k !== key)) }))
    .filter((p) => {
      const id = `${p.capacity}|${JSON.stringify(Object.entries(p.sel).sort())}`;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  return { ...d, prices };
}

/* ----------------------------------------------------------- price grid */

function PriceGrid({ draft, setDraft, capacities }: EditorProps & { capacities: number[] }) {
  const [filter, setFilter] = useState("");
  const [percent, setPercent] = useState("");
  const keys = priceKeys(draft);
  // With no prices yet, every variable is expected to change the price.
  const gridVars = draft.variables.filter((v) => keys.has(v.key) || draft.prices.length === 0);
  const rows = useMemo(() => combinations(gridVars), [gridVars]);
  const q = filter.trim().toLowerCase();
  const shown = q ? rows.filter((r) => r.label.toLowerCase().includes(q)) : rows;
  const bulk = parseFloat(percent);

  const priceOf = (sel: Record<string, string>, capacity: number) => draft.prices.find((p) => p.capacity === capacity && sameSel(p.sel, sel))?.price;

  const setPrice = (sel: Record<string, string>, capacity: number, raw: string) =>
    setDraft((d) => {
      const rest = d.prices.filter((p) => !(p.capacity === capacity && sameSel(p.sel, sel)));
      const value = parseFloat(raw);
      return { ...d, prices: raw === "" || Number.isNaN(value) ? rest : [...rest, { sel, capacity, price: Math.max(0, value) }] };
    });

  const adjustAll = () => {
    if (!Number.isFinite(bulk) || bulk === 0) return;
    setDraft((d) => ({ ...d, prices: d.prices.map((p) => ({ ...p, price: Math.round((p.price * (1 + bulk / 100)) / 50) * 50 })) }));
    setPercent("");
  };

  return (
    <Section
      title="Precios por unidad"
      hint="Precio de una unidad, ida y vuelta. Deja una celda vacía si esa combinación no se ofrece (el cotizador avisará que no hay precio)."
      action={
        <div className="flex flex-wrap items-end gap-2">
          {rows.length > 12 ? <TextField label="Filtrar filas" className="w-[200px]" icon="search" value={filter} onChange={(e) => setFilter(e.target.value)} /> : null}
          <TextField label="Ajustar todos (%)" type="number" className="w-[130px]" value={percent} onChange={(e) => setPercent(e.target.value)} placeholder="5" />
          <Button variant="secondary" disabled={!Number.isFinite(bulk) || bulk === 0} onClick={adjustAll} title="Redondea a múltiplos de $50">
            Aplicar
          </Button>
        </div>
      }
    >
      <div className="max-h-[560px] overflow-auto rounded-lg">
        <table className="w-full min-w-[640px] border-collapse text-sm tabular-nums">
          <thead className="sticky top-0 z-[1] bg-surface">
            <tr className="text-right text-xs text-ink-muted">
              <th className="px-3 py-2.5 text-left font-semibold">{gridVars.length ? gridVars.map((v) => v.label).join(" · ") : "Precio base"}</th>
              {capacities.map((c) => (
                <th key={c} className="px-3 py-2.5 font-semibold">
                  {unitName(c)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={JSON.stringify(r.sel)} className="border-t border-line">
                <td className="px-3 py-1.5 font-medium">{r.label || "Todas las opciones"}</td>
                {capacities.map((c) => (
                  <td key={c} className="px-2 py-1.5 text-right">
                    <input
                      type="number"
                      min={0}
                      step={50}
                      aria-label={`${r.label || "Precio"} · ${unitName(c)}`}
                      value={priceOf(r.sel, c) ?? ""}
                      placeholder="—"
                      onChange={(e) => setPrice(r.sel, c, e.target.value)}
                      className="h-9 w-[110px] rounded-md bg-card px-2.5 text-right outline-none placeholder:text-ink-faint focus:bg-surface focus:shadow-[inset_0_0_0_2px_var(--ink)]"
                    />
                  </td>
                ))}
              </tr>
            ))}
            {!shown.length ? (
              <tr>
                <td colSpan={capacities.length + 1} className="px-3 py-6 text-center text-ink-muted">
                  {rows.length ? "Ninguna fila coincide con el filtro." : "Agrega opciones a las variables para armar la tabla."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {draft.prices.length ? (
        <p className="text-xs text-ink-muted">
          {draft.prices.length} precios · desde {money(Math.min(...draft.prices.map((p) => p.price)))} hasta {money(Math.max(...draft.prices.map((p) => p.price)))}
        </p>
      ) : null}
    </Section>
  );
}

/* --------------------------------------------------------------- charges */

function ChargesPanel({ draft, setDraft, capacities }: EditorProps & { capacities: number[] }) {
  const updateCharge = (id: string, patch: Partial<Charge>) => setDraft((d) => ({ ...d, charges: d.charges.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  const setAmount = (c: Charge, key: string, raw: string) => {
    const amounts = { ...c.amounts };
    const value = parseFloat(raw);
    if (raw === "" || Number.isNaN(value)) delete amounts[key];
    else amounts[key] = Math.max(0, value);
    updateCharge(c.id, { amounts });
  };

  const add = (mode: Charge["mode"]) =>
    setDraft((d) => ({
      ...d,
      charges: [
        ...d.charges,
        {
          id: slugify(mode === "manual" ? "cargo" : "recargo", d.charges.map((c) => c.id)),
          label: mode === "manual" ? "Nuevo cargo" : "Nuevo recargo",
          mode,
          perUnit: true,
          amounts: {},
          when: mode === "conditional" && d.variables[0] ? { [d.variables[0].key]: d.variables[0].options[0].value } : undefined,
        },
      ],
    }));

  return (
    <Section
      title="Cargos adicionales"
      hint="Horas extra, movimientos extra y recargos. Los manuales se capturan con cantidad al crear la orden; los automáticos se suman solos cuando las opciones elegidas coinciden."
      action={
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon="plus" onClick={() => add("manual")}>
            Cargo con cantidad
          </Button>
          <Button variant="secondary" size="sm" icon="plus" onClick={() => add("conditional")} disabled={!draft.variables.length}>
            Recargo automático
          </Button>
        </div>
      }
    >
      {draft.charges.length === 0 ? <p className="text-sm text-ink-muted">Este servicio no tiene cargos adicionales.</p> : null}
      <div className="flex flex-col gap-3">
        {draft.charges.map((c) => (
          <div key={c.id} className="flex flex-col gap-3 rounded-lg bg-card p-4">
            <div className="flex flex-wrap items-end gap-3">
              <TextField label="Nombre" className="min-w-[220px] flex-1" value={c.label} onChange={(e) => updateCharge(c.id, { label: e.target.value })} />
              <span className="inline-flex h-11 items-center rounded-md bg-surface px-3 text-xs font-semibold text-ink-secondary">{c.mode === "manual" ? "Con cantidad" : "Automático"}</span>
              <label className="flex h-11 cursor-pointer items-center gap-2 text-[13px] font-medium">
                <input type="checkbox" checked={c.perUnit} onChange={(e) => updateCharge(c.id, { perUnit: e.target.checked })} className="size-4 accent-ink" />
                Se cobra por cada unidad
              </label>
              <Button variant="soft" size="sm" icon="x" onClick={() => setDraft((d) => ({ ...d, charges: d.charges.filter((x) => x.id !== c.id) }))}>
                Quitar
              </Button>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {(c.perUnit ? capacities : []).map((cap) => (
                <label key={cap} className="flex flex-col gap-1 text-[11px] font-semibold text-ink-muted">
                  {unitName(cap)}
                  <input
                    type="number"
                    min={0}
                    aria-label={`${c.label} · ${unitName(cap)}`}
                    value={c.amounts[String(cap)] ?? ""}
                    placeholder={c.amounts["*"] !== undefined ? String(c.amounts["*"]) : "—"}
                    onChange={(e) => setAmount(c, String(cap), e.target.value)}
                    className="h-9 w-[110px] rounded-md bg-surface px-2.5 text-right text-sm font-normal text-ink outline-none focus:shadow-[inset_0_0_0_2px_var(--ink)]"
                  />
                </label>
              ))}
              <label className="flex flex-col gap-1 text-[11px] font-semibold text-ink-muted">
                {c.perUnit ? "Cualquier otra unidad" : "Monto"}
                <input
                  type="number"
                  min={0}
                  aria-label={`${c.label} · monto general`}
                  value={c.amounts["*"] ?? ""}
                  placeholder="—"
                  onChange={(e) => setAmount(c, "*", e.target.value)}
                  className="h-9 w-[130px] rounded-md bg-surface px-2.5 text-right text-sm font-normal text-ink outline-none focus:shadow-[inset_0_0_0_2px_var(--ink)]"
                />
              </label>
            </div>
            {c.mode === "conditional" ? <WhenEditor charge={c} variables={draft.variables} onChange={(when) => updateCharge(c.id, { when })} /> : null}
          </div>
        ))}
      </div>
    </Section>
  );
}

/** Conditions of an automatic surcharge: every pair must match the order's choices. */
function WhenEditor({ charge, variables, onChange }: { charge: Charge; variables: Variable[]; onChange: (when: Record<string, string>) => void }) {
  const entries = Object.entries(charge.when ?? {});
  const free = variables.filter((v) => !(v.key in (charge.when ?? {})));
  const select = "h-8 rounded-md bg-surface px-2 text-[13px] shadow-[inset_0_0_0_1px_var(--line)]";
  return (
    <div className="flex flex-col gap-2 text-[13px]">
      <span className="font-semibold">Se aplica cuando</span>
      {entries.map(([key, value]) => {
        const v = variables.find((x) => x.key === key);
        return (
          <div key={key} className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{v?.label ?? key}</span>
            <span>=</span>
            <select aria-label={`Opción de ${v?.label ?? key}`} value={value} onChange={(e) => onChange({ ...charge.when, [key]: e.target.value })} className={select}>
              {v?.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {entries.length > 1 ? (
              <button type="button" aria-label={`Quitar condición de ${v?.label ?? key}`} onClick={() => onChange(Object.fromEntries(entries.filter(([k]) => k !== key)))} className="size-7 rounded-md text-ink-muted hover:bg-control">
                ×
              </button>
            ) : null}
          </div>
        );
      })}
      {free.length ? (
        <Button variant="soft" size="sm" icon="plus" className="self-start" onClick={() => onChange({ ...charge.when, [free[0].key]: free[0].options[0].value })}>
          Y también cuando {free[0].label}…
        </Button>
      ) : null}
    </div>
  );
}
