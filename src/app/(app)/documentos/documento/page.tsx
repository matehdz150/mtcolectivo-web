"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";

import { PAGE_H, PAGE_W, PdfPage } from "@/components/documents/pdf-page";
import { CoveragePanel } from "@/components/documents/coverage-panel";
import { DocEditor, type DocEditorHandle } from "@/components/documents/doc-editor";
import { Button } from "@/components/ui/button";
import { ChoiceChips } from "@/components/ui/choice-chips";
import { FilterTabs } from "@/components/ui/filter-tabs";
import { Icon } from "@/components/ui/icon";
import { ErrorState, PageHeader, Panel, Skeleton } from "@/components/ui/misc";
import { TextField } from "@/components/ui/text-field";
import { api, ApiError } from "@/lib/api";
import { usePdf } from "@/lib/pdf";
import { useAssignments, useOrders, useSaveTemplate, useSetAssignments, useTemplate, useTemplateVariables } from "@/lib/queries";
import { coverage, tokensInDocument } from "@/lib/template-coverage";
import { useAnimatedClose } from "@/lib/use-animated-close";
import { TEMPLATE_KINDS, TEMPLATE_TRIGGERS } from "@/lib/template-vars";
import type { DocumentTemplate, PmNode, TemplateContent, TemplateInput } from "@/lib/types";

const EMPTY: PmNode = { type: "doc", content: [{ type: "paragraph" }] };
type Part = "body" | "header" | "footer";

const PARTS: { id: Part; label: string; hint: string }[] = [
  { id: "body", label: "Documento", hint: "El contenido principal. Las páginas se agregan solas cuando el texto no cabe." },
  { id: "header", label: "Encabezado", hint: "Se repite arriba en todas las páginas: logo, fecha, folio…" },
  { id: "footer", label: "Pie de página", hint: "Se repite abajo en todas las páginas: contacto, número de página…" },
];

// Static export: ?id=<plantilla> edits, no id creates.
export default function DocumentEditorPage() {
  return (
    <Suspense fallback={<Skeleton rows={8} />}>
      <Loader />
    </Suspense>
  );
}

function Loader() {
  const id = useSearchParams().get("id");
  const template = useTemplate(id);
  if (!id) return <Editor initial={null} />;
  if (template.isPending) return <Skeleton rows={8} />;
  if (template.isError) return <ErrorState message="No encontramos esa plantilla." onRetry={() => template.refetch()} />;
  if (template.data.mode !== "document") return <RedirectToPdfEditor id={template.data.id} />;
  return <Editor key={template.data.id} initial={template.data} />;
}

/** Templates made from a blank PDF have their own editor. */
function RedirectToPdfEditor({ id }: { id: string }) {
  const router = useRouter();
  useEffect(() => {
    router.replace(`/documentos/editor?id=${id}`);
  }, [id, router]);
  return <Skeleton rows={8} />;
}

function Editor({ initial }: { initial: DocumentTemplate | null }) {
  const router = useRouter();
  const save = useSaveTemplate();
  const setAssignment = useSetAssignments();
  const assignments = useAssignments();
  const variables = useTemplateVariables();
  const orders = useOrders();

  const [name, setName] = useState(initial?.name ?? "");
  const [kind, setKind] = useState<TemplateInput["kind"]>(initial?.kind ?? "order");
  const [trigger, setTrigger] = useState<TemplateInput["trigger"]>(initial?.trigger ?? "manual");
  const [content, setContent] = useState<TemplateContent>(initial?.content ?? { body: EMPTY });
  const [part, setPart] = useState<Part>("body");
  const [savedId, setSavedId] = useState<string | undefined>(initial?.id);
  const [assignOnPublish, setAssignOnPublish] = useState(!initial);
  const [published, setPublished] = useState(false);
  const [allowIncomplete, setAllowIncomplete] = useState(false);
  const [previewOrder, setPreviewOrder] = useState<string>("sample");
  const handle = useRef<DocEditorHandle | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const knownTokens = useMemo(() => [...(variables.data?.variables.map((v) => v.token) ?? []), ...(variables.data?.special.map((s) => s.token) ?? [])], [variables.data]);
  const isAssigned = !!savedId && assignments.data?.order === savedId;
  const nameOk = name.trim().length > 0;
  // An order document has to print all the data of the order (or be published on purpose without some of it).
  const covered = coverage(tokensInDocument(content));
  const gaps = kind === "order" ? covered.filter((c) => !c.ok).length : 0;

  const preview = useMutation({
    mutationFn: () => api.previewDocument(content, previewOrder === "sample" ? undefined : previewOrder),
    onSuccess: (blob) => setPreviewUrl(URL.createObjectURL(blob)),
  });

  function closePreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  }

  function persist(status: DocumentTemplate["status"]) {
    const input: TemplateInput = { name: name.trim(), kind, trigger, mode: "document", fileName: "", pages: 1, fields: [], content, status, sendByWhatsApp: false, requestSignature: false };
    save.mutate(
      { input, id: savedId },
      {
        onSuccess: (saved) => {
          setSavedId(saved.id);
          if (status === "published") {
            setPublished(true);
            if (kind === "order" && assignOnPublish) setAssignment.mutate(saved.id);
          } else router.push("/documentos");
        },
      },
    );
  }

  const partInfo = PARTS.find((p) => p.id === part) as (typeof PARTS)[number];
  const saveError = save.error instanceof ApiError ? [save.error.message, ...(save.error.details ?? [])].join(" ") : save.isError ? "No pudimos guardar el documento. Intenta de nuevo." : "";
  const previewError = preview.error instanceof ApiError ? [preview.error.message, ...(preview.error.details ?? [])].join(" ") : preview.isError ? "No pudimos generar la vista previa." : "";

  return (
    <>
      <PageHeader
        crumb={
          <>
            <Link href="/documentos" className="hover:text-ink">
              Documentos
            </Link>{" "}
            / {savedId ? name || "Documento" : "Nuevo documento"}
          </>
        }
        title={savedId ? "Editar documento" : "Nuevo documento"}
        subtitle="Escribe el documento y usa {variables} donde van los datos de cada orden: {cliente}, {fecha}, {total}…"
      />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-3">
          <FilterTabs label="Parte del documento" tabs={PARTS.map((p) => ({ id: p.id, label: p.label }))} value={part} onChange={setPart} />
          <p className="text-[13px] text-ink-muted">{partInfo.hint}</p>
          <div className="mx-auto w-full max-w-[720px]">
            <DocEditor
              key={part}
              initial={content[part] ?? EMPTY}
              knownTokens={knownTokens}
              onChange={(doc) => setContent((prev) => ({ ...prev, [part]: doc }))}
              onHandle={(h) => {
                handle.current = h;
              }}
            />
          </div>
        </div>

        <aside className="flex min-w-0 flex-col gap-3.5 xl:sticky xl:top-24">
          <Panel className="flex flex-col gap-3.5 p-[18px]">
            <TextField label="Nombre del documento" value={name} onChange={(e) => setName(e.target.value)} placeholder="Orden de servicio" />
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold">Tipo de documento</span>
              <ChoiceChips size="sm" label="Tipo de documento" value={kind} onChange={setKind} options={TEMPLATE_KINDS} />
            </div>
            {kind === "order" ? (
              <label className="flex cursor-pointer items-start gap-2.5 text-[13px] font-medium">
                <input type="checkbox" checked={isAssigned || assignOnPublish} disabled={isAssigned} onChange={(e) => setAssignOnPublish(e.target.checked)} className="mt-0.5 size-4 accent-ink" />
                <span className="flex flex-col">
                  {isAssigned ? "Es la plantilla que usan las órdenes nuevas" : "Usarlo para las órdenes nuevas al publicar"}
                  <span className="text-xs font-normal text-ink-muted">Las órdenes ya creadas conservan su PDF; puedes regenerarlas una por una.</span>
                </span>
              </label>
            ) : (
              <div className="flex flex-col gap-1.5">
                <span className="text-[13px] font-semibold">¿Cuándo se genera?</span>
                <ChoiceChips size="sm" label="Cuándo se genera" value={trigger} onChange={setTrigger} options={TEMPLATE_TRIGGERS} />
              </div>
            )}
          </Panel>

          <Panel className="flex flex-col gap-2.5 p-[18px]">
            <span className="text-[13px] font-semibold">Insertar un dato</span>
            <p className="text-xs text-ink-muted">Haz clic en el lugar del documento y elige el dato. También puedes escribir {"{cliente}"} a mano.</p>
            <div className="flex max-h-[260px] flex-col gap-0.5 overflow-auto rounded-md bg-card p-1.5">
              {variables.isPending ? <span className="p-2 text-xs text-ink-muted">Cargando…</span> : null}
              {variables.data?.variables.map((v) => (
                <button key={v.token} type="button" onClick={() => handle.current?.insertText(`{${v.token}}`)} className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-surface">
                  <span className="truncate">{v.label}</span>
                  <code className="shrink-0 rounded bg-mint-soft px-1.5 text-[11px] text-on-mint">{`{${v.token}}`}</code>
                </button>
              ))}
              {variables.data?.special.filter((s) => s.token !== "salto").map((s) => (
                <button key={s.token} type="button" onClick={() => handle.current?.insertText(`{${s.token}}`)} className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-surface">
                  <span className="truncate">{s.label}</span>
                  <code className="shrink-0 rounded bg-control px-1.5 text-[11px]">{`{${s.token}}`}</code>
                </button>
              ))}
            </div>
            <p className="text-xs text-ink-muted">
              <b>{"{conceptos}"}</b> solo en un párrafo dibuja la tabla de precios. <b>{"{#si itinerario}"}</b> … <b>{"{/si}"}</b> imprime lo que haya en medio solo si el dato tiene contenido.
            </p>
          </Panel>

          <Panel className="flex flex-col gap-2.5 p-[18px]">
            <span className="text-[13px] font-semibold">Vista previa en PDF</span>
            <ChoiceChips
              size="sm"
              label="Datos de la vista previa"
              value={previewOrder}
              onChange={setPreviewOrder}
              options={[{ value: "sample", label: "Ejemplo" }, ...(orders.data ?? []).slice(0, 3).map((o) => ({ value: o.id, label: o.folio }))]}
            />
            <Button variant="secondary" icon="file" disabled={preview.isPending} onClick={() => preview.mutate()}>
              {preview.isPending ? "Generando…" : "Ver cómo queda el PDF"}
            </Button>
            {previewError ? (
              <p role="alert" className="text-xs font-medium text-danger">
                {previewError}
              </p>
            ) : null}
          </Panel>

          {kind === "order" ? <CoveragePanel items={covered} allow={allowIncomplete} onAllow={setAllowIncomplete} /> : null}

          {published ? (
            <div role="status" className="flex items-center gap-3 rounded-[20px] bg-mint px-[18px] py-4 text-on-mint">
              <Icon name="check" size={18} />
              <span className="flex-1 text-sm font-semibold">Publicado{kind === "order" && (isAssigned || assignOnPublish) ? " y asignado a las órdenes nuevas" : ""}.</span>
              <Link href="/documentos" className="text-[13px] font-bold underline">
                Ver en Documentos
              </Link>
            </div>
          ) : null}
          {saveError ? <ErrorState message={saveError} /> : null}
          <div className="flex flex-wrap justify-end gap-2">
            <Link href="/documentos" className="inline-flex h-11 items-center rounded-md bg-surface px-[18px] text-sm font-semibold shadow-row">
              Cerrar
            </Link>
            <Button variant="soft" disabled={save.isPending || !nameOk} onClick={() => persist("draft")}>
              Guardar borrador
            </Button>
            <Button icon="check" disabled={save.isPending || !nameOk || (gaps > 0 && !allowIncomplete)} onClick={() => persist("published")}>
              {save.isPending ? "Guardando…" : "Publicar"}
            </Button>
          </div>
        </aside>
      </div>

      {previewUrl ? <PreviewDialog url={previewUrl} onClose={closePreview} /> : null}
    </>
  );
}

/** The PDF exactly as the server printed it, page by page. */
function PreviewDialog({ url, onClose: done }: { url: string; onClose: () => void }) {
  const [closing, onClose] = useAnimatedClose(done);
  const ref = useRef<HTMLDialogElement>(null);
  const { pdf, error } = usePdf(url);

  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog ref={ref} onClose={() => !ref.current?.open && onClose()} aria-label="Vista previa del PDF" className={`anim-dialog ${closing ? "is-closing" : ""} m-auto max-h-[92dvh] w-[min(700px,calc(100vw-24px))] max-w-none overflow-hidden rounded-xl bg-surface p-0 shadow-float backdrop:bg-ink/40`}>
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <span className="text-sm font-semibold">Así se imprime{pdf ? ` · ${pdf.numPages} ${pdf.numPages === 1 ? "página" : "páginas"}` : ""}</span>
        <button type="button" aria-label="Cerrar" onClick={onClose} className="flex size-9 items-center justify-center rounded-md bg-control hover:bg-control-strong">
          <Icon name="x" />
        </button>
      </div>
      <div className="flex max-h-[calc(92dvh-56px)] flex-col items-center gap-4 overflow-auto bg-card p-5">
        {error ? <ErrorState message="No pudimos mostrar el PDF." /> : null}
        {Array.from({ length: pdf?.numPages ?? 1 }, (_, i) => (
          <div key={i} style={{ width: PAGE_W, height: PAGE_H }} className="max-w-full">
            <PdfPage pdf={pdf} page={i + 1} />
          </div>
        ))}
      </div>
    </dialog>
  );
}
