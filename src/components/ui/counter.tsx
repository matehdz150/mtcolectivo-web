"use client";

/** −/+ stepper for small whole numbers (extra hours, extra moves). */
export function Counter({ label, hint, value, onChange, min = 0, max = 20 }: { label: string; hint?: string; value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  const btn = "flex size-8 items-center justify-center rounded-[10px] bg-surface text-base font-semibold transition hover:bg-control disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-focus";
  return (
    <div className="flex flex-1 items-center justify-between gap-2 rounded-md bg-card px-3 py-2.5">
      <div className="flex flex-col">
        <span className="text-[13px] font-semibold">{label}</span>
        {hint ? <span className="text-[11px] text-ink-muted">{hint}</span> : null}
      </div>
      <div className="flex items-center gap-2">
        <button type="button" className={btn} aria-label={`Quitar ${label.toLowerCase()}`} disabled={value <= min} onClick={() => onChange(value - 1)}>
          −
        </button>
        <output aria-live="polite" className="min-w-4 text-center font-bold tabular-nums">
          {value}
        </output>
        <button type="button" className={btn} aria-label={`Agregar ${label.toLowerCase()}`} disabled={value >= max} onClick={() => onChange(value + 1)}>
          +
        </button>
      </div>
    </div>
  );
}
