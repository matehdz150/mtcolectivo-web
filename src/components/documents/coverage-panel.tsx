"use client";

import { Panel } from "@/components/ui/misc";

/**
 * Which data of the order the document prints. An order document has to cover
 * all of it; publishing with gaps needs an explicit "publish anyway".
 */
export function CoveragePanel({ items, allow, onAllow }: { items: { label: string; ok: boolean }[]; allow: boolean; onAllow: (value: boolean) => void }) {
  const missing = items.filter((i) => !i.ok);
  return (
    <Panel className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">Datos de la orden que imprime</h2>
        <span className={`text-xs font-semibold ${missing.length ? "text-danger" : "text-mint-deep"}`}>{missing.length ? `Faltan ${missing.length}` : "Completo"}</span>
      </div>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px]">
        {items.map((i) => (
          <li key={i.label} className="flex items-center gap-2">
            <span className={`flex size-[18px] shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${i.ok ? "bg-mint text-on-mint" : "bg-danger-soft text-danger"}`}>{i.ok ? "✓" : "!"}</span>
            <span className={i.ok ? "" : "font-semibold text-danger"}>{i.label}</span>
          </li>
        ))}
      </ul>
      {missing.length ? (
        <label className="flex cursor-pointer items-start gap-2 rounded-md bg-card p-3 text-[13px] font-medium">
          <input type="checkbox" checked={allow} onChange={(e) => onAllow(e.target.checked)} className="mt-0.5 size-4 accent-ink" />
          <span className="flex flex-col">
            Publicar aunque no imprima: {missing.map((m) => m.label.toLowerCase()).join(", ")}
            <span className="text-xs font-normal text-ink-muted">Sin esos datos, alguien tendrá que escribirlos a mano en cada orden.</span>
          </span>
        </label>
      ) : null}
    </Panel>
  );
}
