"use client";

export interface FilterTab<T extends string> {
  id: T;
  label: string;
  count?: number;
}

/** Row of filter pills; the selected one is ink. */
export function FilterTabs<T extends string>({ label, tabs, value, onChange }: { label: string; tabs: FilterTab<T>[]; value: T; onChange: (id: T) => void }) {
  return (
    <div role="tablist" aria-label={label} className="flex flex-wrap gap-1.5">
      {tabs.map((tab) => {
        const selected = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.id)}
            className={`h-9 rounded-md px-3.5 text-[13px] shadow-row transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
              selected ? "bg-ink font-semibold text-surface" : "bg-surface font-medium text-ink-muted hover:text-ink"
            }`}
          >
            {tab.label}
            {tab.count !== undefined ? <span className={`ml-1 tabular-nums ${selected ? "opacity-70" : ""}`}>{tab.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
