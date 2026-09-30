"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { ChoiceChips } from "@/components/ui/choice-chips";
import { FilterTabs } from "@/components/ui/filter-tabs";
import { Icon } from "@/components/ui/icon";
import { IconTile } from "@/components/ui/icon-tile";
import { EmptyState, ErrorState, PageHeader, Skeleton } from "@/components/ui/misc";
import { TextField } from "@/components/ui/text-field";
import { VehicleArt, VEHICLE_KIND_LABELS } from "@/components/ui/vehicle-art";
import { VehicleCard } from "@/components/ui/vehicle-card";
import { money } from "@/lib/format";
import { CAPACITIES, capacityRange, unitName } from "@/lib/pricing";
import { useCreateVehicle, useProviders, useTariffs, useVehicles } from "@/lib/queries";
import type { UnitCapacity, VehicleKind } from "@/lib/types";

// TODO: mes activo desde un selector.
const MONTH_LABEL = "sep";
const MONTHLY_CAPACITY = 12;

export default function VehiclesPage() {
  const vehicles = useVehicles();
  const providers = useProviders();
  const tariffs = useTariffs();
  const [capacity, setCapacity] = useState<UnitCapacity | null>(null);
  const [provider, setProvider] = useState("all");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);

  const list = vehicles.data ?? [];
  const byCapacity = capacity ? list.filter((v) => v.capacity === capacity) : list;
  const q = search.trim().toLowerCase();
  const shown = byCapacity.filter(
    (v) => (provider === "all" || v.providerId === provider) && (!q || [v.code, v.plates, v.providerName, v.driver ?? ""].some((s) => s.toLowerCase().includes(q))),
  );

  const providerTabs = [{ id: "all", label: "Todos", count: byCapacity.length }].concat(
    (providers.data ?? []).map((p) => ({ id: p.id, label: p.name, count: byCapacity.filter((v) => v.providerId === p.id).length })),
  );

  return (
    <>
      <PageHeader
        title="Transportes"
        subtitle="Unidades propias y de proveedores, agrupadas por capacidad de pasajeros"
        actions={
          <>
            <TextField label="Buscar" className="w-[280px] [&>label]:sr-only" icon="search" placeholder="Buscar unidad, placas o proveedor" value={search} onChange={(e) => setSearch(e.target.value)} />
            <Button icon="plus" onClick={() => setFormOpen(true)}>
              Agregar transporte
            </Button>
          </>
        }
      />

      <section aria-label="Capacidades" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {CAPACITIES.map((c) => {
          const on = capacity === c;
          const units = list.filter((v) => v.capacity === c);
          const provs = new Set(units.map((v) => v.providerId)).size;
          const extras = tariffs.data?.extras[c];
          return (
            <button
              key={c}
              type="button"
              aria-pressed={on}
              onClick={() => setCapacity(on ? null : c)}
              className={`flex items-center gap-4 rounded-[20px] px-[18px] py-4 text-left shadow-row transition ${on ? "bg-mint text-on-mint" : "bg-surface hover:bg-card"}`}
            >
              <VehicleArt kind={c === 45 ? "bus" : "van"} width={c === 45 ? 118 : 100} />
              <span className="flex flex-col gap-0.5">
                <span className="text-xl font-bold tracking-[-0.02em]">{unitName(c)}</span>
                <span className="text-xs font-semibold">{capacityRange(c)}</span>
                <span className="text-xs opacity-80">
                  {units.length} {units.length === 1 ? "unidad" : "unidades"} · {provs} {provs === 1 ? "proveedor" : "proveedores"}
                </span>
                {extras ? <span className="text-[11px] opacity-80">Hora extra {money(extras.hour)} · Mov. extra {money(extras.move)}</span> : null}
              </span>
            </button>
          );
        })}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <FilterTabs label="Filtrar por proveedor" tabs={providerTabs} value={provider} onChange={setProvider} />
        <span className="text-[13px] text-ink-muted">
          Mostrando {shown.length} de {list.length} unidades{capacity ? ` · ${unitName(capacity)}` : ""}
        </span>
      </div>

      {vehicles.isPending ? (
        <Skeleton rows={6} />
      ) : vehicles.isError ? (
        <ErrorState message="No pudimos cargar las unidades." onRetry={() => vehicles.refetch()} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="flex min-h-[336px] flex-col items-center justify-center gap-3.5 rounded-xl border-2 border-dashed border-control-strong p-6 text-center transition hover:bg-surface"
          >
            <IconTile icon="plus" size="lg" />
            <span className="text-base font-semibold">Agregar transporte</span>
            <span className="max-w-[180px] text-xs leading-snug text-ink-muted">Elige proveedor, capacidad y tipo de unidad</span>
          </button>
          {shown.map((v, i) => (
            <VehicleCard
              key={v.id}
              featured={i === 0 && !capacity && provider === "all" && !search}
              code={v.code}
              kind={v.kind}
              driver={v.driver ?? (v.costPerService ? "Lo asigna el proveedor" : "Sin asignar")}
              plates={v.plates}
              model={`${unitName(v.capacity)} · ${v.model}`}
              tag={v.providerName}
              progressLabel={v.nextService ?? "Libre esta semana"}
              progressStatus={`${v.servicesThisMonth} servicios en ${MONTH_LABEL}`}
              progress={v.servicesThisMonth / MONTHLY_CAPACITY}
              stats={[
                { icon: "users", label: "Capacidad", value: `${v.capacity} pas.` },
                { icon: "file", label: "Servicios este mes", value: String(v.servicesThisMonth) },
                { icon: "dollar", label: "Costo del proveedor por servicio", value: v.costPerService ? money(v.costPerService) : "Propia" },
              ]}
            />
          ))}
          {!shown.length ? <EmptyState title="Sin unidades con ese filtro" /> : null}
        </div>
      )}

      {formOpen && providers.data ? <AddVehicleDialog providers={providers.data} onClose={() => setFormOpen(false)} /> : null}
    </>
  );
}

const KINDS: VehicleKind[] = ["van", "bus", "car", "truck"];

function AddVehicleDialog({ providers, onClose }: { providers: { id: string; name: string; own: boolean }[]; onClose: () => void }) {
  const createVehicle = useCreateVehicle();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [providerId, setProviderId] = useState(providers[0]?.id ?? "");
  const [capacity, setCapacity] = useState<UnitCapacity>(14);
  const [kind, setKind] = useState<VehicleKind>("van");
  const [form, setForm] = useState({ code: "", model: "", plates: "", cost: "", driver: "" });
  const [error, setError] = useState("");
  const own = providers.find((p) => p.id === providerId)?.own ?? false;

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!form.code.trim()) {
      setError("Escribe un identificador para reconocer la unidad, por ejemplo VT-14B.");
      return;
    }
    createVehicle.mutate(
      {
        code: form.code.trim().toUpperCase(),
        capacity,
        kind,
        providerId,
        model: form.model.trim() || "Modelo sin registrar",
        plates: form.plates.trim().toUpperCase() || "Sin placas",
        driver: own ? form.driver.trim() || null : null,
        costPerService: own ? 0 : parseFloat(form.cost) || 0,
      },
      { onSuccess: onClose },
    );
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="add-vehicle-title"
      className="m-auto w-[min(940px,calc(100vw-32px))] max-w-none overflow-hidden rounded-xl bg-surface p-0 shadow-float backdrop:bg-ink/30"
    >
      <form onSubmit={submit} className="grid md:grid-cols-[320px_minmax(0,1fr)]">
        <div className="hidden flex-col justify-between gap-6 bg-[linear-gradient(165deg,var(--mint)_0%,var(--mint-soft)_62%,var(--surface)_100%)] p-7 text-on-mint md:flex">
          <span className="text-xs font-semibold">Vista previa</span>
          <div className="flex justify-center">
            <VehicleArt kind={kind} width={kind === "bus" ? 250 : kind === "car" ? 170 : 220} />
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="text-2xl font-bold leading-tight tracking-[-0.02em] text-ink">{form.code.trim().toUpperCase() || "Nueva unidad"}</div>
            <div className="flex items-center gap-1.5 text-sm font-medium text-ink">
              <Icon name="users" size={15} />
              {unitName(capacity)} · {capacity} pasajeros
            </div>
            <div className="text-xs">
              {providers.find((p) => p.id === providerId)?.name}
              {form.model.trim() ? ` · ${form.model.trim()}` : ""}
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-[18px] p-7">
          <div className="flex items-center justify-between">
            <h2 id="add-vehicle-title" className="text-xl font-medium tracking-[-0.01em]">
              Agregar transporte
            </h2>
            <button type="button" aria-label="Cerrar" onClick={onClose} className="flex size-9 items-center justify-center rounded-md bg-control hover:bg-control-strong">
              <Icon name="x" />
            </button>
          </div>
          <Field label="Proveedor">
            <ChoiceChips label="Proveedor" value={providerId} onChange={setProviderId} options={providers.map((p) => ({ value: p.id, label: p.name }))} />
          </Field>
          <Field label="Capacidad">
            <ChoiceChips
              label="Capacidad"
              value={capacity}
              onChange={(c) => {
                setCapacity(c);
                setKind(c === 45 ? "bus" : kind === "bus" ? "van" : kind);
              }}
              options={CAPACITIES.map((c) => ({ value: c, label: unitName(c) }))}
            />
          </Field>
          <Field label="Ícono de la unidad">
            <div role="group" aria-label="Ícono de la unidad" className="grid grid-cols-4 gap-2">
              {KINDS.map((k) => {
                const on = k === kind;
                return (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setKind(k)}
                    className={`flex h-[104px] flex-col items-center justify-end gap-2 rounded-lg border-2 px-2 pb-3 pt-2.5 ${on ? "border-ink bg-mint-soft" : "border-transparent bg-card hover:bg-control"}`}
                  >
                    <VehicleArt kind={k} width={k === "bus" ? 100 : k === "car" ? 72 : 88} />
                    <span className="text-xs font-semibold">{VEHICLE_KIND_LABELS[k]}</span>
                  </button>
                );
              })}
            </div>
          </Field>
          <div className="grid gap-3.5 sm:grid-cols-2">
            <TextField label="Identificador" placeholder="VT-14B" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
            <TextField label="Marca y modelo" placeholder="Toyota Hiace 2024" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
            <TextField label="Placas" placeholder="JKX-4127" value={form.plates} onChange={(e) => setForm({ ...form, plates: e.target.value })} />
            {own ? (
              <TextField label="Chofer asignado" placeholder="Opcional" icon="idCard" value={form.driver} onChange={(e) => setForm({ ...form, driver: e.target.value })} />
            ) : (
              <TextField label="Costo del proveedor por servicio" type="number" min={0} icon="dollar" placeholder="4000" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
            )}
          </div>
          {error || createVehicle.isError ? (
            <p role="alert" className="text-[13px] font-medium text-danger">
              {error || "No pudimos guardar la unidad. Intenta de nuevo."}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" icon="check" disabled={createVehicle.isPending}>
              {createVehicle.isPending ? "Guardando…" : "Guardar transporte"}
            </Button>
          </div>
        </div>
      </form>
    </dialog>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[13px] font-semibold">{label}</span>
      {children}
    </div>
  );
}
