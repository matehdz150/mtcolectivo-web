"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { FilterTabs } from "@/components/ui/filter-tabs";
import { Icon } from "@/components/ui/icon";
import { EmptyState, ErrorState, PageHeader, Skeleton } from "@/components/ui/misc";
import { TextField } from "@/components/ui/text-field";
import { ApiError } from "@/lib/api";
import { useMobileSearch } from "@/lib/mobile-search";
import { useAnimatedClose } from "@/lib/use-animated-close";
import { initials, money } from "@/lib/format";
import { useClients, useCreateClient, useDeleteClient, useUpdateClient } from "@/lib/queries";
import type { Client } from "@/lib/types";

type Filter = "all" | "frequent" | "due" | "nocontract";

const TESTS: Record<Filter, (c: Client) => boolean> = {
  all: () => true,
  frequent: (c) => c.servicesCount >= 2,
  due: (c) => c.balanceDue > 0,
  nocontract: (c) => !c.contractSigned,
};

export default function ClientsPage() {
  const clients = useClients();
  useMobileSearch("search-clients");
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  /** undefined = closed, null = new client, Client = editing. */
  const [editing, setEditing] = useState<Client | null | undefined>(undefined);
  const list = clients.data ?? [];

  const q = search.trim().toLowerCase();
  const visible = list.filter((c) => TESTS[filter](c) && (!q || [c.name, c.phone, c.email].some((s) => s.toLowerCase().includes(q))));

  const tabs = (
    [
      ["all", "Todos"],
      ["frequent", "Frecuentes"],
      ["due", "Con saldo"],
      ["nocontract", "Sin contrato"],
    ] as const
  ).map(([id, label]) => ({ id, label, count: list.filter(TESTS[id]).length }));

  return (
    <>
      <PageHeader
        title="Clientes"
        subtitle={
          <>
            <span className="max-lg:hidden">Quién contrata, qué ha contratado y qué falta por cobrar</span>
            <span className="lg:hidden">
              {list.length} {list.length === 1 ? "cliente" : "clientes"} · {money(list.reduce((a, c) => a + c.balanceDue, 0))} por cobrar
            </span>
          </>
        }
        actions={
          <>
            <TextField id="search-clients" label="Buscar" className="w-[300px] max-lg:w-auto max-lg:min-w-0 max-lg:flex-1 [&>label]:sr-only" icon="search" placeholder="Buscar por nombre, celular o correo" value={search} onChange={(e) => setSearch(e.target.value)} />
            <Button icon="plus" className="max-lg:size-12 max-lg:rounded-2xl max-lg:px-0" onClick={() => setEditing(null)}>
              <span className="max-lg:sr-only">Nuevo cliente</span>
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <FilterTabs label="Filtrar clientes" tabs={tabs} value={filter} onChange={setFilter} />
        <span className="text-[13px] text-ink-muted">
          Por cobrar: <b className="tabular-nums text-ink">{money(list.reduce((a, c) => a + c.balanceDue, 0))}</b>
        </span>
      </div>

      {clients.isPending ? (
        <Skeleton rows={8} />
      ) : clients.isError ? (
        <ErrorState message="No pudimos cargar los clientes." onRetry={() => clients.refetch()} />
      ) : visible.length === 0 ? (
        <EmptyState title={list.length ? "Sin clientes con ese filtro" : "Todavía no hay clientes"} body={list.length ? "Cambia el filtro o la búsqueda." : "Se crean solos con la primera orden, o agrégalos aquí."} />
      ) : (
        <>
        <div className="anim-list flex flex-col gap-2.5 lg:hidden">
          {visible.map((c) => (
            <button key={c.id} type="button" onClick={() => setEditing(c)} aria-label={`Editar ${c.name}`} className="flex min-h-[76px] items-center gap-3.5 rounded-[22px] bg-surface px-4 py-3 text-left shadow-row">
              <span className="flex size-[46px] shrink-0 items-center justify-center rounded-full bg-mint-soft text-base font-bold text-mint-deep">{initials(c.name)}</span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-base font-bold tracking-[-0.01em]">{c.name}</span>
                <span className="text-[13px] tabular-nums text-ink-muted">{c.phone || "Sin celular"}</span>
                <span className="truncate text-xs text-ink-muted">{c.lastService ? `${c.lastService.label} · ${c.lastService.when}` : "Sin servicios"}</span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-0.5 text-right">
                <span className="text-xs text-ink-muted">{c.balanceDue ? "Por cobrar" : "Al corriente"}</span>
                <span className={`text-base font-bold tabular-nums ${c.balanceLate ? "text-danger" : c.balanceDue ? "" : "text-mint-deep"}`}>{money(c.balanceDue)}</span>
              </span>
            </button>
          ))}
        </div>
        <div className="overflow-x-auto rounded-xl bg-surface px-2 py-1 shadow-row max-lg:hidden">
          <table className="w-full min-w-[1000px] border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-muted">
                <th className="px-3.5 py-3 font-semibold">Cliente</th>
                <th className="px-3.5 py-3 font-semibold">Contacto</th>
                <th className="px-3.5 py-3 text-right font-semibold">Servicios</th>
                <th className="px-3.5 py-3 text-right font-semibold">Total contratado</th>
                <th className="px-3.5 py-3 font-semibold">Último o próximo servicio</th>
                <th className="px-3.5 py-3 font-semibold">Contrato</th>
                <th className="px-3.5 py-3 text-right font-semibold">Por cobrar</th>
                <th className="px-3.5 py-3" />
              </tr>
            </thead>
            <tbody>
              {visible.map((c) => (
                <tr key={c.id} className="border-t border-line hover:bg-canvas/60">
                  <td className="px-3.5 py-2.5">
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-card text-xs font-bold">{initials(c.name)}</span>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold">{c.name}</span>
                        {c.servicesCount >= 2 ? <span className="self-start rounded-full bg-mint px-2 text-[10.5px] font-semibold text-on-mint">Frecuente</span> : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-3.5 py-2.5">
                    <div className="font-medium tabular-nums">{c.phone || "—"}</div>
                    <div className="text-xs text-ink-muted">{c.email}</div>
                  </td>
                  <td className="px-3.5 py-2.5 text-right font-semibold tabular-nums">{c.servicesCount}</td>
                  <td className="px-3.5 py-2.5 text-right tabular-nums">{c.totalContracted ? money(c.totalContracted) : "—"}</td>
                  <td className="px-3.5 py-2.5">
                    <div className="font-medium">{c.lastService?.label ?? "—"}</div>
                    <div className="text-xs text-ink-muted">{c.lastService?.when}</div>
                  </td>
                  <td className="px-3.5 py-2.5">
                    <span className={`inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold ${c.contractSigned ? "bg-card text-mint-deep" : "bg-control text-ink-secondary"}`}>
                      {c.contractSigned ? "Firmado" : "Pendiente"}
                    </span>
                  </td>
                  <td className={`px-3.5 py-2.5 text-right font-bold tabular-nums ${c.balanceLate ? "text-danger" : c.balanceDue ? "" : "font-medium text-ink-muted"}`}>
                    {c.balanceDue ? `${money(c.balanceDue)}${c.balanceLate ? " · vencido" : ""}` : "$0"}
                  </td>
                  <td className="px-3.5 py-2.5 text-right">
                    <Button variant="soft" size="sm" onClick={() => setEditing(c)}>
                      Editar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}

      {editing !== undefined ? <ClientDialog client={editing} onClose={() => setEditing(undefined)} /> : null}
    </>
  );
}

function ClientDialog({ client, onClose: done }: { client: Client | null; onClose: () => void }) {
  const [closing, onClose] = useAnimatedClose(done);
  const create = useCreateClient();
  const update = useUpdateClient();
  const remove = useDeleteClient();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [form, setForm] = useState({ name: client?.name ?? "", phone: client?.phone ?? "", email: client?.email ?? "", contractSigned: client?.contractSigned ?? false });
  const saving = create.isPending || update.isPending;
  const failure = create.error ?? update.error ?? remove.error;

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  function submit(e: FormEvent) {
    e.preventDefault();
    const input = { name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim(), contractSigned: form.contractSigned };
    if (!input.name) return;
    if (client) update.mutate({ id: client.id, patch: input }, { onSuccess: onClose });
    else create.mutate(input, { onSuccess: onClose });
  }

  return (
    <dialog ref={dialogRef} onClose={() => !dialogRef.current?.open && onClose()} aria-labelledby="client-dialog-title" className={`anim-dialog ${closing ? "is-closing" : ""} m-auto w-[min(520px,calc(100vw-32px))] max-w-none overflow-hidden rounded-xl bg-surface p-0 shadow-float backdrop:bg-ink/30`}>
      <form onSubmit={submit} className="flex flex-col gap-[18px] p-7">
        <div className="flex items-center justify-between">
          <h2 id="client-dialog-title" className="text-xl font-medium tracking-[-0.01em]">
            {client ? "Editar cliente" : "Nuevo cliente"}
          </h2>
          <button type="button" aria-label="Cerrar" onClick={onClose} className="flex size-9 items-center justify-center rounded-md bg-control hover:bg-control-strong">
            <Icon name="x" />
          </button>
        </div>
        <TextField label="Nombre" icon="idCard" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus />
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Celular" icon="phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <TextField label="Correo" icon="mail" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium">
          <input type="checkbox" checked={form.contractSigned} onChange={(e) => setForm({ ...form, contractSigned: e.target.checked })} className="size-[18px] accent-ink" />
          Contrato de prestación de servicios firmado
        </label>
        {failure ? (
          <p role="alert" className="text-[13px] font-medium text-danger">
            {failure instanceof ApiError ? [failure.message, ...(failure.details ?? [])].join(" ") : "No pudimos guardar el cliente. Intenta de nuevo."}
          </p>
        ) : null}
        <div className="flex items-center justify-between gap-2">
          {client ? (
            <Button
              variant="soft"
              disabled={remove.isPending || client.servicesCount > 0}
              title={client.servicesCount > 0 ? "Tiene órdenes de servicio: no se puede eliminar" : undefined}
              onClick={() => window.confirm(`¿Eliminar a ${client.name}?`) && remove.mutate(client.id, { onSuccess: onClose })}
            >
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
              {saving ? "Guardando…" : "Guardar cliente"}
            </Button>
          </div>
        </div>
      </form>
    </dialog>
  );
}
