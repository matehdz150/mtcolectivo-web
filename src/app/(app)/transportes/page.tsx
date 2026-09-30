"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { EmptyState, ErrorState, PageHeader, Skeleton } from "@/components/ui/misc";
import { TextField } from "@/components/ui/text-field";
import { VEHICLE_ART_WIDTH, VEHICLE_KIND_LABELS, VEHICLE_KINDS, VehicleArt } from "@/components/ui/vehicle-art";
import { ApiError } from "@/lib/api";
import { useMobileSearch } from "@/lib/mobile-search";
import { useAnimatedClose } from "@/lib/use-animated-close";
import { CAPACITIES, kindFor, sizeClass, unitName } from "@/lib/fleet";
import { rangeConflict, vehicleRange } from "@/shared/core";
import { monthLabel, shortDate } from "@/lib/format";
import { useCreateVehicle, useDeleteVehicle, useUpdateVehicle, useVehicles } from "@/lib/queries";
import type { Vehicle, VehicleKind } from "@/lib/types";

/** Soft backgrounds behind each illustration, by size of vehicle. */
const TINTS = ["bg-card", "bg-mint-soft", "bg-control", "bg-card", "bg-mint-soft"];

export default function VehiclesPage() {
  const vehicles = useVehicles();
  const searchOpen = useMobileSearch("search-vehicles");
  const [search, setSearch] = useState("");
  /** undefined = closed, null = new unit, Vehicle = editing. */
  const [editing, setEditing] = useState<Vehicle | null | undefined>(undefined);
  const monthName = monthLabel(new Date().toISOString().slice(0, 7)).split(" ")[0].slice(0, 3).toLowerCase();

  const list = [...(vehicles.data ?? [])].sort((x, y) => x.capacity - y.capacity || x.code.localeCompare(y.code, "es", { numeric: true }));
  const q = search.trim().toLowerCase();
  const shown = list.filter((v) => !q || v.code.toLowerCase().includes(q) || VEHICLE_KIND_LABELS[unitKind(v)].toLowerCase().includes(q));

  return (
    <>
      <PageHeader
        inlineActions
        title="Transportes"
        subtitle={vehicles.data ? `${list.length} ${list.length === 1 ? "unidad registrada" : "unidades registradas"}` : undefined}
        actions={
          <>
            <TextField id="search-vehicles" label="Buscar" className={`w-[280px] [&>label]:sr-only max-lg:w-40 ${searchOpen ? "" : "max-lg:hidden"}`} icon="search" placeholder="Buscar unidad" value={search} onChange={(e) => setSearch(e.target.value)} />
            <Button icon="plus" className="max-lg:size-12 max-lg:rounded-2xl max-lg:px-0" onClick={() => setEditing(null)}>
              <span className="max-lg:sr-only">Agregar transporte</span>
            </Button>
          </>
        }
      />

      {vehicles.isPending ? (
        <Skeleton rows={6} />
      ) : vehicles.isError ? (
        <ErrorState message="No pudimos cargar las unidades." onRetry={() => vehicles.refetch()} />
      ) : !shown.length ? (
        <EmptyState title={list.length ? "Sin unidades con esa búsqueda" : "Todavía no hay unidades"} body={list.length ? undefined : "Agrega la primera con “Agregar transporte” para que las órdenes le asignen vehículo."} />
      ) : (
        <div className="anim-list grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {shown.map((v) => {
            const kind = unitKind(v);
            return (
              <article key={v.id} className="relative flex flex-col rounded-[24px] bg-surface p-3.5 pb-5 shadow-row transition hover:shadow-float max-lg:flex-row max-lg:gap-3.5 max-lg:pb-3.5">
                <div className={`relative flex h-[168px] items-center justify-center rounded-2xl max-lg:static max-lg:h-[116px] max-lg:w-32 max-lg:shrink-0 ${TINTS[Math.min(TINTS.length - 1, CAPACITIES.indexOf(sizeClass(v.capacity)))]}`}>
                  <span className="max-lg:scale-[0.7]">
                    <VehicleArt kind={kind} width={Math.round(150 * VEHICLE_ART_WIDTH[kind])} />
                  </span>
                  <button
                    type="button"
                    aria-label={`Editar ${v.code}`}
                    onClick={() => setEditing(v)}
                    className="absolute right-2.5 top-2.5 flex size-10 items-center justify-center rounded-xl bg-white/75 hover:bg-white max-lg:inset-0 max-lg:size-auto max-lg:rounded-3xl max-lg:bg-transparent"
                  >
                    <span className="max-lg:hidden">
                      <Icon name="expand" />
                    </span>
                  </button>
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-3.5 px-2 pt-[18px] max-lg:gap-2 max-lg:px-0 max-lg:pt-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <h2 className="text-xl font-bold tracking-[-0.02em]">
                      <span className="max-lg:hidden">{VEHICLE_KIND_LABELS[kind]}</span>
                      <span className="lg:hidden">{unitName(v.capacity)}</span>
                    </h2>
                    <span className="truncate text-[13px] font-semibold text-ink-muted max-lg:hidden">{v.code}</span>
                  </div>
                  <span className="inline-flex h-[30px] items-center gap-2 self-start rounded-full bg-card px-3 text-[13px] font-semibold">
                    <Icon name="users" size={15} />
                    {vehicleRange(v).join("–")} pasajeros
                  </span>
                  <div className="flex justify-between gap-3 border-t border-line pt-3.5 text-[13px] text-ink-muted max-lg:flex-col max-lg:gap-0.5 max-lg:border-0 max-lg:pt-0 max-lg:text-xs">
                    <span>
                      {v.servicesThisMonth} {v.servicesThisMonth === 1 ? "servicio" : "servicios"} en {monthName}
                    </span>
                    <span className="font-semibold text-ink">{v.nextService ? `Próximo: ${shortDate(v.nextService)}` : "Libre esta semana"}</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {editing !== undefined ? <VehicleDialog vehicle={editing} onClose={() => setEditing(undefined)} /> : null}
    </>
  );
}

/** The drawing of a unit; a type that no longer exists falls back to the one its capacity suggests. */
const unitKind = (v: Vehicle): VehicleKind => (VEHICLE_KINDS.includes(v.kind) ? v.kind : kindFor(v.capacity));

function VehicleDialog({ vehicle, onClose: done }: { vehicle: Vehicle | null; onClose: () => void }) {
  const [closing, onClose] = useAnimatedClose(done);
  const create = useCreateVehicle();
  const update = useUpdateVehicle();
  const remove = useDeleteVehicle();
  const fleet = useVehicles();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const initial = vehicle ? vehicleRange(vehicle) : [7, 14];
  const [minText, setMinText] = useState(String(initial[0]));
  const [maxText, setMaxText] = useState(String(initial[1]));
  const minCapacity = Math.floor(Number(minText)) || 0;
  const capacity = Math.floor(Number(maxText)) || 0;
  // until a drawing is picked by hand, it follows the capacity
  const [pickedKind, setPickedKind] = useState<VehicleKind | null>(vehicle && VEHICLE_KINDS.includes(vehicle.kind) ? vehicle.kind : null);
  const kind = pickedKind ?? kindFor(capacity || 14);
  const [error, setError] = useState("");
  const saving = create.isPending || update.isPending;
  const failure = create.error ?? update.error ?? remove.error;

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (minCapacity < 1 || capacity > 200 || minCapacity > capacity) {
      setError("Escribe el rango de pasajeros de la unidad: de 1 a 200, y el mínimo no puede ser mayor que el máximo.");
      return;
    }
    const clash = rangeConflict({ capacity, minCapacity }, (fleet.data ?? []).filter((v) => v.id !== vehicle?.id));
    if (clash) {
      setError(`Ese rango se empalma con ${clash.code} (${vehicleRange(clash).join("–")} pasajeros). Usa el mismo rango o uno que no se cruce.`);
      return;
    }
    setError("");
    // The unit is recognised by its size and a number, e.g. VAN-14-2; editing keeps the code it already has.
    const prefix = `${VEHICLE_KIND_LABELS[kind].toUpperCase().replace(/s+/g, "")}-${capacity}`;
    const used = (fleet.data ?? []).filter((v) => v.code.startsWith(prefix + "-")).map((v) => parseInt(v.code.slice(prefix.length + 1), 10) || 0);
    const code = vehicle?.code ?? `${prefix}-${Math.max(0, ...used) + 1}`;
    const input = { code, capacity, minCapacity, kind, model: vehicle?.model ?? "", plates: vehicle?.plates ?? "", driver: vehicle?.driver ?? null, active: true };
    if (vehicle) update.mutate({ id: vehicle.id, patch: input }, { onSuccess: onClose });
    else create.mutate(input, { onSuccess: onClose });
  }

  return (
    <dialog
      ref={dialogRef}
      // React StrictMode opens, closes and reopens the dialog once in dev; that first close event must not dismiss it.
      onClose={() => !dialogRef.current?.open && onClose()}
      aria-labelledby="vehicle-dialog-title"
      className={`anim-dialog ${closing ? "is-closing" : ""} m-auto max-h-[92dvh] w-[min(860px,calc(100vw-32px))] max-w-none overflow-y-auto overscroll-contain rounded-xl bg-surface p-0 shadow-float backdrop:bg-ink/30`}
    >
      <form onSubmit={submit} className="grid md:grid-cols-[320px_minmax(0,1fr)]">
        <div className="hidden flex-col justify-between gap-6 bg-[linear-gradient(165deg,var(--mint)_0%,var(--mint-soft)_62%,var(--surface)_100%)] p-7 text-on-mint md:flex">
          <span className="text-xs font-semibold">Vista previa</span>
          <div className="flex justify-center">
            <VehicleArt kind={kind} width={Math.round(200 * VEHICLE_ART_WIDTH[kind])} />
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="text-2xl font-bold leading-tight tracking-[-0.02em] text-ink">{vehicle?.code ?? "Nueva unidad"}</div>
            <div className="flex items-center gap-1.5 text-sm font-medium text-ink">
              <Icon name="users" size={15} />
              {VEHICLE_KIND_LABELS[kind]} · {minCapacity || "—"}–{capacity || "—"} pasajeros
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-[18px] p-7">
          <div className="flex items-center justify-between">
            <h2 id="vehicle-dialog-title" className="text-xl font-medium tracking-[-0.01em]">
              {vehicle ? `Editar ${vehicle.code}` : "Agregar transporte"}
            </h2>
            <button type="button" aria-label="Cerrar" onClick={onClose} className="flex size-9 items-center justify-center rounded-md bg-control hover:bg-control-strong">
              <Icon name="x" />
            </button>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-[13px] font-semibold">Rango de pasajeros</span>
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Desde" icon="users" type="number" min={1} max={200} inputMode="numeric" value={minText} onChange={(e) => setMinText(e.target.value)} placeholder="7" required />
              <TextField label="Hasta" icon="users" type="number" min={1} max={200} inputMode="numeric" value={maxText} onChange={(e) => setMaxText(e.target.value)} placeholder="14" required />
            </div>
            <span className="text-xs text-ink-muted">Otras unidades pueden tener este mismo rango, pero un rango distinto no puede cruzarse con este.</span>
          </div>
          <Field label="Tipo de vehículo">
            <div role="group" aria-label="Tipo de vehículo" className="grid grid-cols-3 gap-2">
              {VEHICLE_KINDS.map((k) => {
                const on = k === kind;
                return (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setPickedKind(k)}
                    className={`flex h-[96px] flex-col items-center justify-end gap-2 rounded-lg border-2 px-2 pb-2.5 pt-2 ${on ? "border-ink bg-mint-soft" : "border-transparent bg-card hover:bg-control"}`}
                  >
                    <VehicleArt kind={k} width={Math.round(76 * VEHICLE_ART_WIDTH[k])} />
                    <span className="text-xs font-semibold">{VEHICLE_KIND_LABELS[k]}</span>
                  </button>
                );
              })}
            </div>
          </Field>
          {error || failure ? (
            <p role="alert" className="text-[13px] font-medium text-danger">
              {error || (failure instanceof ApiError ? [failure.message, ...(failure.details ?? [])].join(" ") : "No pudimos guardar la unidad. Intenta de nuevo.")}
            </p>
          ) : null}
          <div className="flex items-center justify-between gap-2">
            {vehicle ? (
              <Button variant="soft" disabled={remove.isPending} onClick={() => window.confirm(`¿Eliminar ${vehicle.code}? Las órdenes que ya la usaron conservan su código.`) && remove.mutate(vehicle.id, { onSuccess: onClose })}>
                Eliminar
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button variant="secondary" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" icon="check" disabled={saving}>
                {saving ? "Guardando…" : "Guardar transporte"}
              </Button>
            </div>
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
