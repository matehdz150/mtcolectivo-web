import { useId, type InputHTMLAttributes, type ReactNode } from "react";

import { Icon, type IconName } from "./icon";

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  label: string;
  icon?: IconName;
  trailing?: ReactNode;
  hint?: string;
  size?: "md" | "lg";
};

/** Labelled field: hairline on surface, 2px ink ring on focus. */
export function TextField({ label, icon, trailing, hint, size = "md", id, className = "", ...rest }: TextFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const lg = size === "lg";
  return (
    <div className={`flex flex-col ${lg ? "gap-2" : "gap-1.5"} ${className}`}>
      <label htmlFor={inputId} className={`font-semibold ${lg ? "text-sm" : "text-[13px]"}`}>
        {label}
      </label>
      <div
        className={`group flex items-center bg-surface text-ink-muted shadow-[inset_0_0_0_1px_var(--line)] transition focus-within:text-ink focus-within:shadow-[inset_0_0_0_2px_var(--ink)] ${lg ? "h-14 gap-3 rounded-[14px] px-4" : "h-11 gap-2.5 rounded-md px-3.5"} ${trailing ? "pr-1.5" : ""}`}
      >
        {icon ? <Icon name={icon} size={lg ? 18 : 16} /> : null}
        <input
          id={inputId}
          aria-describedby={hintId}
          className={`h-full min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-ink-faint ${lg ? "text-base" : "text-sm"}`}
          {...rest}
        />
        {trailing}
      </div>
      {hint ? (
        <span id={hintId} className="text-xs text-ink-muted">
          {hint}
        </span>
      ) : null}
    </div>
  );
}
