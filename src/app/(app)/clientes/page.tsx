"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { FilterTabs } from "@/components/ui/filter-tabs";
import { EmptyState, ErrorState, PageHeader, Skeleton } from "@/components/ui/misc";
import { TextField } from "@/components/ui/text-field";
import { initials, money } from "@/lib/format";
import { useClients } from "@/lib/queries";
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
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
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
        subtitle="Quién contrata, qué ha contratado y qué falta por cobrar"
        actions={
          <>
            <TextField label="Buscar" className="w-[300px] [&>label]:sr-only" icon="search" placeholder="Buscar por nombre, celular o correo" value={search} onChange={(e) => setSearch(e.target.value)} />
            {/* TODO: formulario de alta de cliente. */}
            <Button icon="plus">Nuevo cliente</Button>
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
        <EmptyState title="Sin clientes con ese filtro" body="Cambia el filtro o la búsqueda." />
      ) : (
        <div className="overflow-x-auto rounded-xl bg-surface px-2 py-1 shadow-row">
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
                    <div className="font-medium tabular-nums">{c.phone}</div>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
