"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { PAGE_H, PAGE_W, PdfPage } from "@/components/documents/pdf-page";
import { api } from "@/lib/api";
import { renderOrderPdf } from "@/lib/local-render";
import { usePdf } from "@/lib/pdf";
import { useAssignments, useTemplates } from "@/lib/queries";
import type { Order } from "@/lib/types";

const WIDTH = 560;

/**
 * The PDF of an order with a document, drawn in the browser with the same code
 * the API uses. Shared by the live preview and the download button, so what
 * you see is exactly what you download.
 * `choice`: "" = the default document, "none" = no document, otherwise a template id
 * (if that one is gone or unpublished, the default is used).
 */
export function useOrderDocument(draft: Order | null, choice: string) {
  const templates = useTemplates();
  const assignments = useAssignments();
  const published = (id: string | null | undefined) => templates.data?.find((t) => t.id === id && t.status === "published");
  const template = choice === "none" ? null : ((choice ? published(choice) : undefined) ?? published(assignments.data?.order) ?? null);

  // A template made from a PDF needs the blank PDF once; it is reused for every change.
  const base = useQuery({
    queryKey: ["template-base", template?.id, template?.updatedAt],
    queryFn: async () => {
      const { url } = await api.getTemplateFileUrl((template as NonNullable<typeof template>).id);
      return new Uint8Array(await (await fetch(url)).arrayBuffer());
    },
    enabled: template?.mode === "pdf",
    staleTime: Infinity,
  });

  const ready = !!template && !!draft && (template.mode === "document" || !!base.data);
  const render = useQuery({
    queryKey: ["local-render", template?.id, template?.updatedAt, draft ? JSON.stringify(draft) : ""],
    queryFn: () => renderOrderPdf(template as NonNullable<typeof template>, draft as Order, base.data),
    enabled: ready,
    placeholderData: keepPreviousData,
    staleTime: Infinity,
    gcTime: 30_000,
    retry: false,
  });

  return {
    template,
    blob: render.data ?? null,
    loading: templates.isPending || assignments.isPending || (template?.mode === "pdf" && base.isPending),
    problem: render.isError ? "No pudimos armar el PDF con este documento." : base.isError ? "No pudimos abrir el PDF de la plantilla." : "",
  };
}

/**
 * The order as the chosen document prints it, drawn right here in the browser
 * as you type: no request, no waiting. Until there is enough data (or when no
 * document applies) the approximate on-screen version is shown instead.
 */
export function OrderPreview({ draft, choice, fallback, width = WIDTH }: { draft: Order | null; choice: string; fallback: ReactNode; width?: number }) {
  const { template, blob, loading, problem: renderProblem } = useOrderDocument(draft, choice);
  const { pdf, error: pdfError } = usePdf(blob);
  const pages = pdf?.numPages ?? 1;
  const scale = width / PAGE_W;
  const problem = renderProblem || (pdfError ? "No pudimos mostrar el PDF." : "");

  if (!draft || !template || problem) {
    return (
      <div className="flex flex-col gap-2">
        {fallback}
        <p role={problem ? "alert" : "status"} className={`text-xs ${problem ? "font-medium text-danger" : "text-ink-muted"}`}>
          {problem ||
            (loading
              ? "Cargando el documento…"
              : !draft
                ? "Completa el servicio y los pasajeros para ver aquí el documento."
                : choice === "none"
                  ? "Esta orden se guardará sin documento. Esto es solo una vista aproximada."
                  : "No hay un documento publicado para esta orden. Esto es solo una vista aproximada.")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2" aria-live="polite">
      <div className="flex items-center justify-between gap-3 text-xs text-ink-muted">
        <span className="truncate">
          Documento: <b className="text-ink">{template.name}</b>
          {pages > 1 ? ` · ${pages} páginas` : ""}
        </span>
        <span>En vivo</span>
      </div>
      <div className="flex flex-col gap-3 rounded-lg bg-card p-2">
        {Array.from({ length: pages }, (_, i) => (
          <div key={i} style={{ width, height: PAGE_H * scale }} className="max-w-full overflow-hidden rounded-md">
            <PdfPage pdf={pdf} page={i + 1} style={{ transform: `scale(${scale})`, transformOrigin: "0 0" }} />
          </div>
        ))}
      </div>
    </div>
  );
}
