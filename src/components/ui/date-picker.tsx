"use client";

import { useId, useState, type ReactNode } from "react";

import { Icon } from "./icon";

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const SHORT_MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const todayIso = () => {
  const n = new Date();
  return iso(n.getFullYear(), n.getMonth(), n.getDate());
};
const parse = (value: string) => {
  const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(value);
  return m ? { y: Number(m[1]), m: Number(m[2]) - 1, d: m[3] ? Number(m[3]) : 1 } : null;
};
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "sáb 11 oct 2026" */
function display(value: string) {
  const p = parse(value);
  if (!p) return "";
  const weekday = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"][new Date(p.y, p.m, p.d).getDay()];
  return `${weekday} ${p.d} ${SHORT_MONTHS[p.m]} ${p.y}`;
}

const triggerBox = (size: "md" | "lg") => (size === "lg" ? "h-14 rounded-2xl px-4 text-[17px]" : "h-11 rounded-md px-3.5 text-sm");

/** The trigger field, the dim layer and the panel: a popover on the desktop, a bottom sheet on the phone. */
function Field({
  label,
  size,
  icon,
  text,
  placeholder,
  hideLabel,
  className,
  panelLabel,
  children,
}: {
  label: string;
  size: "md" | "lg";
  icon: boolean;
  text: string;
  placeholder: string;
  hideLabel?: boolean;
  className?: string;
  panelLabel: string;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const close = () => setOpen(false);

  return (
    <div className={`relative flex flex-col ${size === "lg" ? "gap-2" : "gap-1.5"} ${className ?? ""}`}>
      <label htmlFor={id} className={`font-semibold ${size === "lg" ? "text-sm" : "text-[13px]"} ${hideLabel ? "sr-only" : ""}`}>
        {label}
      </label>
      <button
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center gap-2.5 bg-surface text-left shadow-[inset_0_0_0_1px_var(--line)] outline-none transition focus-visible:shadow-[inset_0_0_0_2px_var(--ink)] ${triggerBox(size)} ${open ? "shadow-[inset_0_0_0_2px_var(--ink)]" : ""}`}
      >
        {icon ? <Icon name="calendar" size={size === "lg" ? 18 : 16} /> : null}
        <span className={`min-w-0 flex-1 truncate ${text ? "text-ink" : "text-ink-faint"}`}>{text || placeholder}</span>
        <Icon name="chevronDown" size={16} />
      </button>
      {open ? (
        <>
          <div className="anim-overlay fixed inset-0 z-40 bg-ink/40 lg:bg-transparent" onClick={close} aria-hidden="true" />
          <div
            role="dialog"
            aria-label={panelLabel}
            onKeyDown={(e) => e.key === "Escape" && close()}
            className="anim-sheet-mobile fixed inset-x-0 bottom-0 z-50 rounded-t-[28px] bg-surface px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 shadow-float lg:absolute lg:inset-x-auto lg:bottom-auto lg:left-0 lg:top-full lg:mt-2 lg:w-[320px] lg:rounded-2xl lg:p-4"
          >
            <span className="mx-auto mb-2 block h-[5px] w-11 rounded-full bg-control-strong lg:hidden" />
            {children(close)}
          </div>
        </>
      ) : null}
    </div>
  );
}

const navBtn = "flex size-10 items-center justify-center rounded-xl text-ink transition hover:bg-card focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-30 disabled:hover:bg-transparent";

function Calendar({ value, min, onPick, close }: { value: string; min?: string; onPick: (v: string) => void; close: () => void }) {
  const selected = parse(value);
  const base = selected ?? parse(min ?? "") ?? parse(todayIso()) ?? { y: 2026, m: 0, d: 1 };
  const [view, setView] = useState({ y: base.y, m: base.m });
  const today = todayIso();

  const first = new Date(view.y, view.m, 1);
  const offset = (first.getDay() + 6) % 7; // weeks start on Monday
  const days = new Date(view.y, view.m + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const shift = (by: number) => setView((v) => ({ y: v.y + Math.floor((v.m + by) / 12), m: (((v.m + by) % 12) + 12) % 12 }));
  const prevDisabled = !!min && iso(view.y, view.m, 1).slice(0, 7) <= min.slice(0, 7);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <button type="button" aria-label="Mes anterior" className={navBtn} disabled={prevDisabled} onClick={() => shift(-1)}>
          <Icon name="chevronDown" size={18} className="rotate-90" />
        </button>
        <span className="text-[15px] font-bold tracking-[-0.01em]" aria-live="polite">
          {capitalize(MONTHS[view.m])} {view.y}
        </span>
        <button type="button" aria-label="Mes siguiente" className={navBtn} onClick={() => shift(1)}>
          <Icon name="chevronDown" size={18} className="-rotate-90" />
        </button>
      </div>
      <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-ink-muted" aria-hidden="true">
        {WEEKDAYS.map((w, i) => (
          <span key={i} className="py-1">
            {w}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1" role="grid">
        {cells.map((d, i) => {
          if (d === null) return <span key={i} />;
          const v = iso(view.y, view.m, d);
          const isSelected = v === value;
          const disabled = !!min && v < min;
          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              aria-label={`${d} de ${MONTHS[view.m]} de ${view.y}`}
              aria-pressed={isSelected}
              onClick={() => {
                onPick(v);
                close();
              }}
              className={`mx-auto flex size-11 items-center justify-center rounded-full text-sm tabular-nums transition focus-visible:outline-2 focus-visible:outline-focus lg:size-10 ${
                isSelected ? "bg-ink font-bold text-surface" : disabled ? "text-ink-faint" : "font-medium hover:bg-card"
              } ${v === today && !isSelected ? "shadow-[inset_0_0_0_1.5px_var(--ink)]" : ""}`}
            >
              {d}
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between border-t border-line pt-3">
        <button
          type="button"
          disabled={!!min && today < min}
          onClick={() => {
            onPick(today);
            close();
          }}
          className="h-10 rounded-xl px-3 text-sm font-semibold hover:bg-card disabled:opacity-30"
        >
          Hoy
        </button>
        <button type="button" onClick={close} className="h-10 rounded-xl px-3 text-sm font-semibold text-ink-muted hover:bg-card">
          Cerrar
        </button>
      </div>
    </div>
  );
}

/** Date field with its own calendar. `value` and `onChange` use "YYYY-MM-DD". */
export function DatePicker({
  label,
  value,
  onChange,
  min,
  size = "md",
  icon = true,
  placeholder = "Elige una fecha",
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  size?: "md" | "lg";
  icon?: boolean;
  placeholder?: string;
  className?: string;
}) {
  return (
    <Field label={label} size={size} icon={icon} text={display(value)} placeholder={placeholder} className={className} panelLabel={`Calendario: ${label}`}>
      {(close) => <Calendar value={value} min={min} onPick={onChange} close={close} />}
    </Field>
  );
}

function Months({ value, onPick, close }: { value: string; onPick: (v: string) => void; close: () => void }) {
  const selected = parse(value);
  const now = new Date();
  const [year, setYear] = useState(selected?.y ?? now.getFullYear());
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <button type="button" aria-label="Año anterior" className={navBtn} onClick={() => setYear(year - 1)}>
          <Icon name="chevronDown" size={18} className="rotate-90" />
        </button>
        <span className="text-[15px] font-bold tabular-nums" aria-live="polite">
          {year}
        </span>
        <button type="button" aria-label="Año siguiente" className={navBtn} onClick={() => setYear(year + 1)}>
          <Icon name="chevronDown" size={18} className="-rotate-90" />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {SHORT_MONTHS.map((name, i) => {
          const v = `${year}-${pad(i + 1)}`;
          const on = v === value;
          return (
            <button
              key={name}
              type="button"
              aria-pressed={on}
              onClick={() => {
                onPick(v);
                close();
              }}
              className={`h-12 rounded-xl text-sm capitalize transition focus-visible:outline-2 focus-visible:outline-focus ${on ? "bg-ink font-bold text-surface" : v === `${now.getFullYear()}-${pad(now.getMonth() + 1)}` ? "font-semibold shadow-[inset_0_0_0_1.5px_var(--ink)]" : "font-medium hover:bg-card"}`}
            >
              {name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Month field. `value` and `onChange` use "YYYY-MM". */
export function MonthPicker({ label, value, onChange, className, hideLabel }: { label: string; value: string; onChange: (value: string) => void; className?: string; hideLabel?: boolean }) {
  const p = parse(value);
  return (
    <Field label={label} size="md" icon text={p ? `${capitalize(MONTHS[p.m])} ${p.y}` : ""} placeholder="Elige un mes" className={className} hideLabel={hideLabel} panelLabel={`Mes: ${label}`}>
      {(close) => <Months value={value} onPick={onChange} close={close} />}
    </Field>
  );
}
