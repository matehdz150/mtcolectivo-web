import type { ReactNode } from "react";

/** White rounded surface for a group of related content. */
export function Panel({ children, className = "", as: Tag = "section" }: { children: ReactNode; className?: string; as?: "section" | "div" | "aside" }) {
  return <Tag className={`rounded-xl bg-surface p-6 shadow-row ${className}`}>{children}</Tag>;
}

/** Outline pill naming a depot, provider or section. */
export function Tag({ children, size = "md" }: { children: ReactNode; size?: "sm" | "md" }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full border-[1.5px] border-ink font-semibold ${size === "sm" ? "h-6 px-2.5 text-[11px]" : "h-8 px-3.5 text-[13px]"}`}>
      {children}
    </span>
  );
}

export function PageHeader({ title, subtitle, crumb, actions, inlineActions = false }: { title: ReactNode; subtitle?: ReactNode; crumb?: ReactNode; actions?: ReactNode; inlineActions?: boolean }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-6 max-lg:gap-3">
      <div className="flex flex-col gap-1.5">
        {crumb ? <nav aria-label="Ruta" className="text-[13px] text-ink-muted">{crumb}</nav> : null}
        <h1 className="text-[40px] font-normal leading-[1.05] tracking-[-0.03em] max-lg:text-[34px] max-lg:font-bold xl:text-5xl">{title}</h1>
        {subtitle ? <p className="text-sm text-ink-muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className={`flex flex-wrap items-center gap-2 ${inlineActions ? "" : "max-lg:w-full"}`}>{actions}</div> : null}
    </div>
  );
}

/** Loading placeholder with the shape of a table or grid. */
export function Skeleton({ rows = 6, className = "" }: { rows?: number; className?: string }) {
  return (
    <div aria-busy="true" aria-label="Cargando" className={`flex flex-col gap-3 rounded-xl bg-surface p-6 shadow-row ${className}`}>
      {Array.from({ length: rows }, (_, i) => (
        <span key={i} className="h-10 animate-pulse rounded-md bg-card" />
      ))}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex items-center justify-between gap-4 rounded-xl bg-danger-soft px-6 py-5 text-danger">
      <span className="text-sm font-medium">{message}</span>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="text-sm font-semibold underline">
          Reintentar
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl bg-surface px-6 py-12 text-center shadow-row">
      <span className="font-semibold">{title}</span>
      {body ? <span className="text-sm text-ink-muted">{body}</span> : null}
    </div>
  );
}
