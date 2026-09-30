"use client";

import { useState, type ReactNode } from "react";

import { FilterTabs } from "@/components/ui/filter-tabs";
import { IconTile } from "@/components/ui/icon-tile";
import { ErrorState, PageHeader, Panel, Skeleton } from "@/components/ui/misc";
import { VehicleArt } from "@/components/ui/vehicle-art";
import { money } from "@/lib/format";
import { CAPACITIES, capacityRange, unitName } from "@/lib/pricing";
import { useTariffs } from "@/lib/queries";
import type { CapacityPrices, UnitCapacity } from "@/lib/types";

type Tab = "amatitan" | "eventos" | "turismo";

const TITLES: Record<Tab, [string, string]> = {
  amatitan: ["Amatitán · Cantaritos", "Ida y vuelta, 7 horas"],
  eventos: ["Eventos", "Traslado al evento, horario pactado"],
  turismo: ["Turismo por destino", "Autobús de 45 se cotiza aparte · N/D = no disponible"],
};

export default function PricesPage() {
  const tariffs = useTariffs();
  const [tab, setTab] = useState<Tab>("amatitan");

  if (tariffs.isPending) return <Skeleton rows={8} />;
  if (tariffs.isError) return <ErrorState message="No pudimos cargar las tarifas." onRetry={() => tariffs.refetch()} />;
  const t = tariffs.data;

  const matrix: { head: [string, string][]; rows: { capacity: UnitCapacity; cells: { value: number; strong: boolean }[] }[] } | null =
    tab === "amatitan"
      ? {
          head: [
            ["Matutino", "9:00 a. m. – 4:00 p. m."],
            ["Con descuento", "recomendado"],
            ["Vespertino", "1:00 p. m. – 8:00 p. m."],
            ["Con descuento", "recomendado"],
          ],
          rows: CAPACITIES.map((c) => ({ capacity: c, cells: cells([t.amatitan.am.normal, t.amatitan.am.discount, t.amatitan.pm.normal, t.amatitan.pm.discount], c) })),
        }
      : tab === "eventos"
        ? {
            head: [
              ["Precio normal", "boda, graduación, posada, concierto"],
              ["Con descuento", "recomendado"],
            ],
            rows: CAPACITIES.map((c) => ({ capacity: c, cells: cells([t.eventos.normal, t.eventos.discount], c) })),
          }
        : null;

  return (
    <>
      <PageHeader title={`Precios ${t.year}`} subtitle="El cotizador toma estas tarifas según el servicio y la unidad asignada. Precios por unidad, ida y vuelta." />
      <FilterTabs
        label="Tipo de servicio"
        tabs={[
          { id: "amatitan", label: "Amatitán · Cantaritos" },
          { id: "eventos", label: "Eventos" },
          { id: "turismo", label: "Turismo" },
        ]}
        value={tab}
        onChange={setTab}
      />

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Panel className="flex flex-col gap-3.5 overflow-x-auto">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold">{TITLES[tab][0]}</h2>
            <span className="text-xs text-ink-muted">{TITLES[tab][1]}</span>
          </div>
          {matrix ? (
            <table className="w-full min-w-[640px] border-collapse text-sm tabular-nums">
              <thead>
                <tr className="text-right text-xs text-ink-muted">
                  <th className="px-3 py-2.5 text-left font-semibold">Unidad</th>
                  {matrix.head.map(([label, sub]) => (
                    <th key={label + sub} className="px-3 py-2.5 font-semibold">
                      {label}
                      <div className="text-[11px] font-medium">{sub}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.rows.map((r) => (
                  <tr key={r.capacity} className="border-t border-line">
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center gap-3">
                        <VehicleArt kind={r.capacity === 45 ? "bus" : "van"} width={64} />
                        <span className="flex flex-col">
                          <b>{unitName(r.capacity)}</b>
                          <span className="text-[11px] text-ink-muted">{capacityRange(r.capacity)}</span>
                        </span>
                      </span>
                    </td>
                    {r.cells.map((cell, i) => (
                      <td key={i} className={`px-3 py-3 text-right ${cell.strong ? "text-[15px] font-bold" : "font-semibold text-mint-deep"}`}>
                        {money(cell.value)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full min-w-[820px] border-collapse text-[13px] tabular-nums">
              <thead>
                <tr className="text-xs text-ink-muted">
                  <th rowSpan={2} className="px-2.5 py-2 text-left align-bottom font-semibold">
                    Destino
                  </th>
                  {([6, 14, 20] as const).map((c) => (
                    <th key={c} colSpan={3} className="border-l border-line px-2.5 py-2 font-semibold">
                      {unitName(c)}
                    </th>
                  ))}
                </tr>
                <tr className="text-right text-[11px] text-ink-muted">
                  {([6, 14, 20] as const).flatMap((c) =>
                    ["1 día", "S – D", "V – D"].map((d, i) => (
                      <th key={`${c}-${d}`} className={`px-2.5 py-1 font-medium ${i === 0 ? "border-l border-line" : ""}`}>
                        {d}
                      </th>
                    )),
                  )}
                </tr>
              </thead>
              <tbody>
                {t.turismo.map((rate) => (
                  <tr key={rate.destination} className="border-t border-line">
                    <td className="px-2.5 py-2.5 font-semibold">{rate.destination}</td>
                    {([6, 14, 20] as const).flatMap((c) =>
                      rate.prices[c].map((v, i) => (
                        <td key={`${c}-${i}`} className={`px-2.5 py-2.5 text-right ${i === 0 ? "border-l border-line" : ""} ${v === null ? "text-ink-faint" : ""}`}>
                          {v === null ? "N/D" : money(v)}
                        </td>
                      )),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>

        <aside className="flex flex-col gap-3">
          <Panel as="div" className="flex flex-col gap-3 p-5">
            <h2 className="font-semibold">Reglas que aplica el cotizador</h2>
            <ul className="flex flex-col gap-2.5 text-[13px] leading-[1.45] text-ink-secondary">
              <Rule icon="users">La unidad se asigna por pasajeros: hasta 6, 14, 20 o 45. Más de 45 combina unidades.</Rule>
              <Rule icon="clock">
                Turismo mismo día es de 8:00 a. m. a 2:00 p. m. Vespertino (1–9 p. m.) +{money(t.tourShiftSurcharge.pm)}; completo (8 a. m.–9 p. m.) +{money(t.tourShiftSurcharge.full)}.
              </Rule>
              <Rule icon="route">Movimientos a más de 5 km se cobran como extra, de $500 a $2,000, a $20 por km.</Rule>
              <Rule icon="check">Incluye operador, viáticos, gasolina, casetas, seguro de viajero y unidad modelo reciente.</Rule>
            </ul>
          </Panel>
          <div className="flex flex-col gap-2.5 rounded-xl bg-card p-5">
            <h2 className="font-semibold">Extras por unidad</h2>
            <table className="w-full border-collapse text-[13px] tabular-nums">
              <thead>
                <tr className="text-right text-[11px] text-ink-muted">
                  <th className="py-1.5 text-left font-semibold">Unidad</th>
                  <th className="py-1.5 font-semibold">Hora extra</th>
                  <th className="py-1.5 font-semibold">Mov. extra</th>
                </tr>
              </thead>
              <tbody>
                {CAPACITIES.map((c) => (
                  <tr key={c} className="border-t border-line text-right">
                    <td className="py-2 text-left font-semibold">{unitName(c)}</td>
                    <td className="py-2">{money(t.extras[c].hour)}</td>
                    <td className="py-2">{money(t.extras[c].move)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </aside>
      </div>
    </>
  );
}

function cells(tables: CapacityPrices[], c: UnitCapacity) {
  return tables.map((table, i) => ({ value: table[c], strong: i % 2 === 0 }));
}

function Rule({ icon, children }: { icon: "users" | "clock" | "route" | "check"; children: ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <IconTile icon={icon} size="sm" className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </li>
  );
}
