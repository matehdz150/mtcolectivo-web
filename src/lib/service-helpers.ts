import type { Charge, PriceRow, Service, ServiceInput, Variable } from "./types";

/** Variables that apply given what has been picked so far (a variable can depend on another). */
export function activeVariables(variables: Variable[], selections: Record<string, string>): Variable[] {
  return variables.filter((v) => Object.entries(v.showWhen ?? {}).every(([k, val]) => selections[k] === val));
}

/** Picks the first option of every applicable variable, keeping choices that are still valid. */
export function defaultSelections(service: Pick<Service, "variables">, current: Record<string, string> = {}): Record<string, string> {
  const next: Record<string, string> = {};
  for (const v of service.variables) {
    const applies = Object.entries(v.showWhen ?? {}).every(([k, val]) => next[k] === val);
    if (!applies) continue;
    next[v.key] = v.options.some((o) => o.value === current[v.key]) ? current[v.key] : (v.options[0]?.value ?? "");
  }
  return next;
}

/** Amount of one charge for a set of vehicles (per unit, or flat). */
export function chargeAmountFor(charge: Charge, units: number[]): number {
  const of = (capacity: number) => charge.amounts[String(capacity)] ?? charge.amounts["*"] ?? 0;
  return charge.perUnit ? units.reduce((sum, c) => sum + of(c), 0) : (charge.amounts["*"] ?? 0);
}

/** Manual extras and what one of each costs for these units: "Horas extra $500". */
export function manualCharges(service: Pick<Service, "charges"> | undefined, units: number[]) {
  return (service?.charges ?? []).filter((c) => c.mode === "manual").map((c) => ({ id: c.id, label: c.label, amount: chargeAmountFor(c, units) }));
}

/** Cheapest price in a service's grid, for "Desde $2,500". */
export const startingPrice = (service: Pick<Service, "prices">) => (service.prices.length ? Math.min(...service.prices.map((p) => p.price)) : null);

/* -------------------------------------------------------- editing helpers */

/** "Puerto Vallarta" -> "puerto-vallarta" (ids the API accepts: a-z, 0-9, - and _). */
export function slugify(label: string, taken: string[] = []): string {
  const base =
    label
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 36) || "opcion";
  let slug = base;
  for (let n = 2; taken.includes(slug); n++) slug = `${base}-${n}`;
  return slug;
}

/** Every combination of the given variables' options; a variable only joins when its showWhen matches. */
export function combinations(variables: Variable[]): { sel: Record<string, string>; label: string }[] {
  const out: { sel: Record<string, string>; label: string }[] = [];
  const walk = (i: number, sel: Record<string, string>, labels: string[]) => {
    if (i === variables.length) {
      out.push({ sel, label: labels.join(" · ") });
      return;
    }
    const v = variables[i];
    const applies = Object.entries(v.showWhen ?? {}).every(([k, val]) => sel[k] === val || !(k in sel));
    if (!applies) return walk(i + 1, sel, labels);
    for (const o of v.options) walk(i + 1, { ...sel, [v.key]: o.value }, [...labels, o.label]);
  };
  walk(0, {}, []);
  return out;
}

export const sameSel = (a: Record<string, string>, b: Record<string, string>) => {
  const ka = Object.keys(a);
  return ka.length === Object.keys(b).length && ka.every((k) => a[k] === b[k]);
};

/** Keys of the variables that appear in at least one price row. */
export const priceKeys = (service: Pick<ServiceInput, "prices">) => new Set(service.prices.flatMap((p) => Object.keys(p.sel)));

/** Drops a variable (or one of its options) from everything that refers to it. */
export function withoutRef(service: ServiceInput, key: string, value?: string): ServiceInput {
  const hit = (sel: Record<string, string> | undefined) => !!sel && key in sel && (value === undefined || sel[key] === value);
  const clean = (sel: Record<string, string> | undefined) => (sel && !hit(sel) ? sel : undefined);
  const dedupe = (rows: PriceRow[]) => rows.filter((r, i) => rows.findIndex((o) => o.capacity === r.capacity && sameSel(o.sel, r.sel)) === i);
  const stripKey = (sel: Record<string, string>) => Object.fromEntries(Object.entries(sel).filter(([k]) => k !== key));
  return {
    ...service,
    variables: service.variables
      .filter((v) => value !== undefined || v.key !== key)
      .map((v) => ({
        ...v,
        options: v.key === key && value !== undefined ? v.options.filter((o) => o.value !== value) : v.options,
        showWhen: v.showWhen && (value === undefined ? stripKey(v.showWhen) : (clean(v.showWhen) ?? {})),
      }))
      .map((v) => (v.showWhen && !Object.keys(v.showWhen).length ? { ...v, showWhen: undefined } : v)),
    prices: dedupe(service.prices.filter((p) => value === undefined || !hit(p.sel)).map((p) => (value === undefined ? { ...p, sel: stripKey(p.sel) } : p))),
    charges: service.charges.filter((c) => value !== undefined ? !hit(c.when) : true).map((c) => (value === undefined && c.when ? { ...c, when: stripKey(c.when) } : c)),
  };
}
