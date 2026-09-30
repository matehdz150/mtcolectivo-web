/** Thin ink-on-grey progress with a start caption and a status word. */
export function ProgressBar({ value, start, end, label }: { value: number; start?: string; end?: string; label?: string }) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="flex flex-col gap-2">
      {start || end ? (
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-xs text-ink-muted">{start}</span>
          <span className="text-[13px] font-semibold">{end}</span>
        </div>
      ) : null}
      <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v * 100)} aria-label={label ?? end ?? "Progreso"} className="h-1 overflow-hidden rounded-sm bg-control-strong">
        <span className="block h-full rounded-sm bg-ink" style={{ width: `${v * 100}%` }} />
      </div>
    </div>
  );
}

/** Mint block + ink cursor + hatched remainder: actual against pending. */
export function TickMeter({ value, max, startLabel, endLabel, label }: { value: number; max: number; startLabel?: string; endLabel?: string; label: string }) {
  const pct = max > 0 ? (Math.max(0, Math.min(max, value)) / max) * 100 : 0;
  return (
    <div role="meter" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label={label} className="flex flex-col gap-2">
      {startLabel || endLabel ? (
        <div className="flex justify-between text-xs font-semibold">
          <span>{startLabel}</span>
          <span>{endLabel}</span>
        </div>
      ) : null}
      <div className="flex h-5 items-center">
        <span className="h-3.5 rounded-[2px] bg-mint" style={{ width: `max(0px, calc(${pct}% - 8px))` }} />
        <span className="mx-[3px] h-5 w-0.5 rounded-[1px] bg-ink" />
        <span className="h-3.5 flex-1 bg-[repeating-linear-gradient(90deg,var(--control-strong)_0_1px,transparent_1px_4px)]" />
      </div>
    </div>
  );
}

/** Tiny inline paid-ratio bar for table cells. */
export function MiniBar({ ratio }: { ratio: number }) {
  const pct = Math.round(Math.max(0, Math.min(1, ratio)) * 100);
  return (
    <span className="flex items-center gap-2">
      <span className="block h-1 w-[60px] overflow-hidden rounded-sm bg-control-strong">
        <span className={`block h-full ${pct === 100 ? "bg-mint-deep" : "bg-ink"}`} style={{ width: `${pct}%` }} />
      </span>
      <span className="text-xs tabular-nums text-ink-secondary">{pct}%</span>
    </span>
  );
}
