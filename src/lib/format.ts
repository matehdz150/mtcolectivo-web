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

/** Starts a browser download for a link that already sends Content-Disposition: attachment. */
export function startDownload(url: string, fileName?: string) {
  const a = document.createElement("a");
  a.href = url;
  if (fileName) a.download = fileName;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** "viernes" for a YYYY-MM-DD date. */
export const weekdayName = (iso: string) => WEEKDAYS[parseISO(iso).getDay()];
export const monthName = (iso: string) => MONTHS[parseISO(iso).getMonth()];

const SMALL = ["cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez", "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete", "dieciocho", "diecinueve", "veinte", "veintiuno", "veintidós", "veintitrés", "veinticuatro", "veinticinco", "veintiséis", "veintisiete", "veintiocho", "veintinueve"];
const TENS = ["", "", "veinte", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];
const HUNDREDS = ["", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos", "seiscientos", "setecientos", "ochocientos", "novecientos"];
const apocope = (s: string) => s.replace(/veintiuno$/, "veintiún").replace(/uno$/, "un");

function belowThousand(n: number): string {
  if (n === 100) return "cien";
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const out: string[] = [];
  if (hundreds) out.push(HUNDREDS[hundreds]);
  if (rest) {
    if (rest < 30) out.push(SMALL[rest]);
    else out.push(rest % 10 ? `${TENS[Math.floor(rest / 10)]} y ${SMALL[rest % 10]}` : TENS[Math.floor(rest / 10)]);
  }
  return out.join(" ");
}

function words(n: number): string {
  if (n === 0) return "cero";
  const millions = Math.floor(n / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1000);
  const rest = n % 1000;
  const out: string[] = [];
  if (millions) out.push(millions === 1 ? "un millón" : `${apocope(words(millions))} millones`);
  if (thousands) out.push(thousands === 1 ? "mil" : `${apocope(belowThousand(thousands))} mil`);
  if (rest) out.push(belowThousand(rest));
  return out.join(" ");
}

/** 34000 -> "TREINTA Y CUATRO MIL PESOS 00/100 M.N." (same text the API prints). */
export function moneyInWords(amount: number): string {
  const abs = Math.abs(amount);
  let pesos = Math.floor(abs);
  let cents = Math.round((abs - pesos) * 100);
  if (cents === 100) {
    pesos += 1;
    cents = 0;
  }
  if (pesos >= 1_000_000_000) return "";
  const unit = pesos === 1 ? "peso" : pesos > 0 && pesos % 1_000_000 === 0 ? "de pesos" : "pesos";
  return `${apocope(words(pesos))} ${unit} ${String(cents).padStart(2, "0")}/100 M.N.`.toUpperCase();
}
