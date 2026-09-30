import Image from "next/image";

import { durationHours, hoursLabel, longDate, money, money2, numericDate, time12 } from "@/lib/format";
import type { OrderLine, Payment, RouteType } from "@/lib/types";

export interface OrderDocumentData {
  folio: string;
  issuedAt: string;
  clientName: string;
  date: string;
  origin: string;
  destination: string;
  departureTime: string;
  returnTime: string | null;
  route: RouteType;
  units: number[];
  lines: OrderLine[];
  total: number | null;
  payments: Pick<Payment, "amount" | "date">[];
  /** What each manual extra costs for this unit, e.g. "Horas extra" $500. */
  extraCharges: { label: string; amount: number }[];
  itinerary?: string;
}

const EQUIPMENT = ["Seguro de viajeros", "Asientos reclinables", "Kit de sanitización", "Auto-estéreo bluetooth", "Vidrios polarizados", "GPS"];

/**
 * The service order the client receives (same structure as the PDF MT
 * Colectivo sends today). Rendered at 560px; the backend produces the PDF.
 */
export function OrderDocument({ data }: { data: OrderDocumentData }) {
  const paid = data.payments.reduce((sum, p) => sum + p.amount, 0);
  const lastPayment = data.payments.at(-1);
  const due = data.total === null ? null : Math.max(0, data.total - paid);
  const capacity = data.units.length ? data.units.map((c) => `1 ${c === 45 ? "autobús" : "van"} de ${c} pasajeros`).join(" y ") : "—";

  return (
    <article aria-label={`Orden de servicio ${data.folio}`} className="flex w-full max-w-[560px] flex-col gap-4 bg-white px-5 pb-7 pt-8 text-[11px] leading-[1.45] text-ink sm:px-9">
      <div className="flex items-start justify-between">
        <Image src="/brand/mtcolectivo-documento.png" alt="MT Colectivo, movilidad consciente" width={725} height={230} className="h-[46px] w-auto" />
        <div className="text-right">
          <div className="text-[10px] text-ink-muted">{numericDate(data.issuedAt)}</div>
          <div className="text-xs font-bold">{data.folio}</div>
        </div>
      </div>

      <div className="-mx-5 bg-[#00843f] px-5 py-2 text-[13px] text-white sm:-mx-9 sm:px-9">
        <b>Estimado(a):</b> {data.clientName || "Cliente"}
      </div>

      <p className="text-ink-secondary">Les hacemos llegar la cotización del servicio solicitado.</p>

      <dl className="grid grid-cols-[112px_minmax(0,1fr)] gap-x-3 gap-y-1.5 sm:grid-cols-[128px_minmax(0,1fr)]">
        <dt className="font-bold">Fecha</dt>
        <dd className="first-letter:uppercase">{data.date ? longDate(data.date) : "—"}</dd>
        <dt className="font-bold">Dirección de salida</dt>
        <dd>{data.origin || "—"}</dd>
        <dt className="font-bold">Destino</dt>
        <dd>{data.destination || "—"}</dd>
        <dt className="font-bold">Horario</dt>
        <dd>
          <b>Ida</b> {time12(data.departureTime)} · <b>Regreso</b> {data.route === "round" ? time12(data.returnTime) : "Sin regreso"}
        </dd>
        <dt className="font-bold">Duración</dt>
        <dd>{data.route === "round" ? hoursLabel(durationHours(data.departureTime, data.returnTime)) : "—"}</dd>
        <dt className="font-bold">Capacidad de unidad</dt>
        <dd>{capacity}</dd>
      </dl>

      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b-2 border-[#00843f] text-left text-[10px]">
            <th className="w-14 py-1.5">Unidad</th>
            <th className="py-1.5">Ruta y concepto</th>
            <th className="py-1.5 text-right">Precio</th>
          </tr>
        </thead>
        <tbody>
          {data.lines.map((line, i) => (
            <tr key={i} className="border-b border-[#ececed]">
              <td className="py-1.5 font-semibold">{line.qty ?? ""}</td>
              <td className="py-1.5">{line.concept}</td>
              <td className="whitespace-nowrap py-1.5 text-right font-semibold tabular-nums">{line.amount ? money2(line.amount) : "Por cotizar"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex flex-col items-end gap-0.5 tabular-nums">
        <div className="text-[13px] font-bold">Total: {data.total === null ? "Por cotizar" : money2(data.total)}</div>
        <div className="text-ink-secondary">
          Abonado: {money2(paid)}
          {lastPayment ? ` (${numericDate(lastPayment.date)})` : ""}
        </div>
        <div className="text-[13px] font-bold text-[#00843f]">Por liquidar: {due === null ? "—" : money2(due)}</div>
      </div>

      <div className="flex flex-col gap-1.5">
        <b>La unidad está equipada con:</b>
        <ul className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-ink-secondary sm:grid-cols-3">
          {EQUIPMENT.map((e) => (
            <li key={e}>• {e}</li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-0.5 rounded-[10px] bg-[#f4f4f5] px-3 py-2.5">
        <b>Importante</b>
        <span>
          {data.extraCharges.length
            ? data.extraCharges.map((c, i) => (
                <span key={c.label}>
                  {i > 0 ? " · " : ""}
                  {c.label}: <b>{money(c.amount)}</b>
                </span>
              ))
            : "Los servicios adicionales se cotizan aparte."}
        </span>
        <span className="text-ink-secondary">Incluye operador, viáticos, gasolina, casetas y seguro de viajero.</span>
      </div>

      <div className="flex flex-col gap-1">
        <b>Pasos de contratación</b>
        <span>1. Firmar el contrato de prestación de servicios (firma digital o escaneado).</span>
        <span>2. Depositar a la cuenta asignada.</span>
        <span>3. Respetar los horarios contratados y el reglamento del contrato.</span>
      </div>

      {data.itinerary ? (
        <div className="flex flex-col gap-1 border-t border-[#ececed] pt-3">
          <b className="text-center">ITINERARIO</b>
          <span className="whitespace-pre-line">{data.itinerary}</span>
        </div>
      ) : null}

      <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 border-t border-[#ececed] pt-2.5 text-[10px] font-semibold text-[#00843f]">
        <span>www.mtcolectivo.mx</span>
        <span>MT Colectivo</span>
        <span>@mtcolectivo</span>
        <span>33 3750 9358</span>
      </div>
    </article>
  );
}
