"use client";

export interface Choice<T> {
  value: T;
  label: string;
}

/** Single-choice chips (aria-pressed). Ink when selected, card otherwise. */
export function ChoiceChips<T extends string | number>({
  label,
  options,
  value,
  onChange,
  size = "md",
  className = "",
}: {
  label: string;
  options: Choice<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={`flex flex-wrap gap-1.5 ${className}`}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            className={`rounded-md transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
              size === "sm" ? "h-7 px-2.5 text-xs" : "h-9 px-3.5 text-[13px]"
            } ${on ? "bg-ink font-semibold text-surface" : "bg-card font-medium text-ink-secondary hover:bg-control"}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
