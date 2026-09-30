import { TEMPLATE_VARIABLES } from "./template-vars";
import type { PmNode, TemplateContent, TemplateField } from "./types";

const TOKEN = /\{([^{}\n]+)\}/g;

/** What an order document must print so nobody has to fill it in by hand. */
export const REQUIRED_DATA: { label: string; anyOf: string[] }[] = [
  { label: "Folio", anyOf: ["folio"] },
  { label: "Nombre del cliente", anyOf: ["cliente"] },
  { label: "Fecha del servicio", anyOf: ["fecha", "fecha_corta", "dia"] },
  { label: "Dirección de salida", anyOf: ["salida"] },
  { label: "Destino", anyOf: ["destino"] },
  { label: "Horario", anyOf: ["horario", "ida"] },
  { label: "Unidad", anyOf: ["unidad"] },
  { label: "Conceptos y precios", anyOf: ["conceptos", "conceptos_texto"] },
  { label: "Total", anyOf: ["total"] },
  { label: "Por liquidar", anyOf: ["pendiente"] },
];

const tokensOf = (text: string, into: Set<string>) => {
  for (const [, raw] of text.matchAll(TOKEN)) {
    const token = raw.trim();
    into.add(token.startsWith("#si ") ? token.slice(4).trim() : token);
  }
};

/** Data printed by the fields of a PDF template. */
export function tokensInFields(fields: TemplateField[]): Set<string> {
  const used = new Set<string>();
  for (const f of fields) {
    if (f.text) tokensOf(f.text, used);
    if (f.variable) {
      const token = TEMPLATE_VARIABLES.find((v) => v.id === f.variable)?.token;
      if (token) used.add(token);
    }
    if (f.type === "lines") used.add("conceptos");
  }
  return used;
}

function walk(node: PmNode | undefined, used: Set<string>) {
  if (!node) return;
  if (node.text) tokensOf(node.text, used);
  node.content?.forEach((c) => walk(c, used));
}

/** Data printed by a written document (body, header and footer). */
export function tokensInDocument(content: TemplateContent): Set<string> {
  const used = new Set<string>();
  for (const part of [content.body, content.header, content.footer]) walk(part, used);
  return used;
}

export const coverage = (used: Set<string>) => REQUIRED_DATA.map((r) => ({ label: r.label, ok: r.anyOf.some((t) => used.has(t)) }));
