const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const MONTHS_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const WEEKDAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

/** $5,000 */
export const money = (n: number) => `${n < 0 ? "-" : ""}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`;

/** $5,000.00 (documents) */
export const money2 = (n: number) =>
  `${n < 0 ? "-" : ""}$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function parseISO(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** 4 oct */
export const shortDate = (iso: string) => {
  const d = parseISO(iso);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
};

/** sábado 4 de octubre de 2026 */
export const longDate = (iso: string) => {
  const d = parseISO(iso);
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`;
};

/** 04/10/2026 */
export const numericDate = (iso: string) => {
  const d = parseISO(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

/** "13:00" → "1:00 p. m." */
export const time12 = (hhmm: string | null) => {
  if (!hhmm) return "—";
  const [h, m] = hhmm.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "a. m." : "p. m."}`;
};

/** Duration between two "HH:MM" times, crossing midnight if needed. */
export const durationHours = (from: string, to: string | null) => {
  if (!to) return null;
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  const minutes = (toMin(to) - toMin(from) + 1440) % 1440;
  return minutes / 60;
};

export const hoursLabel = (h: number | null) => (h === null ? "—" : `${Number.isInteger(h) ? h : h.toFixed(1)} horas`);

/** "MES 2026-09" → "septiembre 2026" */
export const monthLabel = (isoMonth: string) => {
  const [y, m] = isoMonth.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
};

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
