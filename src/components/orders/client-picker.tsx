"use client";

import { useState } from "react";

import { TextField } from "@/components/ui/text-field";

type Option = { id: string; name: string; phone: string };

/**
 * Name field that opens the list of clients on click. Pick one to use it; type a name
 * that is not in the list and a new client is created with the order.
 */
export function ClientPicker({ value, options, onChange, onPick, hint }: { value: string; options: Option[]; onChange: (name: string) => void; onPick: (id: string) => void; hint?: string }) {
  const [open, setOpen] = useState(false);
  const q = value.trim().toLowerCase();
  const shown = options.filter((c) => !q || c.name.toLowerCase().includes(q)).slice(0, 8);

  return (
    <div className="relative" onBlur={() => setOpen(false)}>
      <TextField
        label="Nombre"
        icon="idCard"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        role="combobox"
        aria-expanded={open && shown.length > 0}
        aria-autocomplete="list"
        autoComplete="off"
        placeholder="Nombre completo"
        hint={hint}
      />
      {open && shown.length > 0 ? (
        <ul role="listbox" aria-label="Clientes" className="absolute left-0 right-0 top-[72px] z-20 max-h-64 overflow-auto rounded-md bg-surface py-1 shadow-float">
          {shown.map((c) => (
            <li key={c.id} role="option" aria-selected={c.name.trim().toLowerCase() === q}>
              <button
                type="button"
                // keeps the input focused so the list does not close before the click lands
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onPick(c.id);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between gap-3 px-3.5 py-2 text-left text-sm hover:bg-canvas"
              >
                <span className="truncate font-medium">{c.name}</span>
                <span className="shrink-0 text-xs text-ink-muted">{c.phone}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
