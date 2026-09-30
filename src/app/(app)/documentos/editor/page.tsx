"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState, type CSSProperties, type DragEvent, type MouseEvent, type PointerEvent } from "react";

import { CoveragePanel } from "@/components/documents/coverage-panel";
import { PAGE_H, PAGE_W, PdfPage } from "@/components/documents/pdf-page";
import { Button } from "@/components/ui/button";
import { ChoiceChips } from "@/components/ui/choice-chips";
import { Icon, type IconName } from "@/components/ui/icon";
import { IconTile } from "@/components/ui/icon-tile";
import { ErrorState, PageHeader, Panel, Skeleton } from "@/components/ui/misc";
import { TextField } from "@/components/ui/text-field";
import { ApiError } from "@/lib/api";
import { money2 } from "@/lib/format";
import { getTextRuns, joinRuns, sampleBackground, sampleTextColor, usePdf, type TextRun } from "@/lib/pdf";
import { flattenCovered } from "@/lib/pdf-flatten";
import { useDeleteTemplate, useOrders, useSaveTemplate, useTemplate, useTemplateSourceUrl } from "@/lib/queries";
import { coverage, tokensInFields } from "@/lib/template-coverage";
import { fillText, TEMPLATE_KINDS, TEMPLATE_TRIGGERS, TEMPLATE_VARIABLES } from "@/lib/template-vars";
import type { DocumentTemplate, FieldType, Order, TemplateField, TemplateInput } from "@/lib/types";

type Tool = "pick" | "erase" | FieldType;

const TYPE_ICON: Record<FieldType, IconName> = { text: "file", date: "calendar", money: "dollar", sign: "idCard", check: "check", lines: "grid" };
const TOOLS: { type: Tool; label: string; icon: IconName }[] = [
  { type: "pick", label: "Texto del PDF", icon: "pin" },
  { type: "erase", label: "Borrar zona", icon: "x" },
  { type: "text", label: "Texto nuevo", icon: "file" },
  { type: "lines", label: "Conceptos", icon: "grid" },
  { type: "sign", label: "Firma", icon: "idCard" },
  { type: "check", label: "Casilla", icon: "check" },
];
const MAX_BYTES = 10 * 1024 * 1024;
const newId = () => `f-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const INK = "#0f0f12";

/** A complete order used to preview a template when there is no real order yet. */
const SAMPLE_ORDER: Order = {
  id: "sample", folio: "OS-2026-0000", clientId: "s", clientName: "Tamiko Perez Gasque Muslera", clientPhone: "33 1234 5678", serviceId: "s", serviceName: "Turismo",
  selections: {}, serviceLabel: "Ciudad de México · 4 días", route: "round", date: "2026-10-06", departureTime: "10:00", returnTime: "17:00",
  origin: "UNIVERSIDAD MARISTA - M. Champagnat #2981, Loma Bonita, 45050 Zapopan, Jal.", destination: "Ciudad de México, CDMX", passengers: 18, units: [20], vehicles: [],
  lines: [{ qty: 1, concept: "Ida y vuelta", amount: 35000 }, { qty: null, concept: "Descuento", amount: -1000 }], total: 34000,
  payments: [{ id: "p", amount: 7750, date: "2026-09-20", method: "Transferencia" }], status: "deposit", contractSigned: false, issuedAt: "2026-09-30",
};

// Static export: ?id=<plantilla> edits, no id creates; ?paso=3 opens the review.
export default function TemplateEditorPage() {
  return (
    <Suspense fallback={<Skeleton rows={8} />}>
      <EditorLoader />
    </Suspense>
  );
}

function EditorLoader() {
  const params = useSearchParams();
  const id = params.get("id");
  const step = params.get("paso") === "3" ? 3 : id ? 2 : 1;
  const template = useTemplate(id);
  if (!id) return <Editor initial={null} initialStep={1} />;
  if (template.isPending) return <Skeleton rows={8} />;
  if (template.isError) return <ErrorState message="No encontramos esa plantilla." onRetry={() => template.refetch()} />;
  if (template.data.mode === "document") return <RedirectToDocument id={template.data.id} />;
  return <Editor key={template.data.id} initial={template.data} initialStep={step} />;
}

/** Written documents have their own editor. */
function RedirectToDocument({ id }: { id: string }) {
  const router = useRouter();
  useEffect(() => {
    router.replace(`/documentos/documento?id=${id}`);
  }, [id, router]);
  return <Skeleton rows={8} />;
}

type Draft = TemplateInput;

/** Fields saved with a bare variable (first version) become text with {token}, so everything is edited the same way. */
function upgradeField(f: TemplateField): TemplateField {
  if (f.text !== undefined || !f.variable || (f.type !== "text" && f.type !== "date" && f.type !== "money")) return f;
  const token = TEMPLATE_VARIABLES.find((v) => v.id === f.variable)?.token;
  return token ? { ...f, text: `{${token}}`, variable: null, bold: f.bold ?? (f.type === "money" ? true : undefined) } : f;
}

function toDraft(t: DocumentTemplate | null): Draft {
  return t
    ? { name: t.name, kind: t.kind, trigger: t.trigger, mode: "pdf", fileName: t.fileName, pages: t.pages, fields: t.fields.map(upgradeField), pageRules: t.pageRules ?? [], status: t.status, sendByWhatsApp: false, requestSignature: false }
    : { name: "", kind: "order", trigger: "quote", mode: "pdf", fileName: "", pages: 1, fields: [], status: "draft", sendByWhatsApp: false, requestSignature: false };
}

const fieldText = (f: TemplateField) => f.text ?? "";
const isPrinted = (f: TemplateField) => f.type === "text" || f.type === "date" || f.type === "money";
/** Printed fields with nothing to print would come out blank. */
const isEmpty = (f: TemplateField) => isPrinted(f) && !fieldText(f).trim() && !f.variable && !f.cover;

const fieldStyle = (f: TemplateField): CSSProperties => ({
  left: f.x,
  top: f.y,
  width: f.w,
  height: f.h,
  fontSize: f.fontSize ?? 10.5,
  lineHeight: f.lineHeight ? `${f.lineHeight}px` : 1.2,
  fontWeight: f.bold || f.type === "money" ? 700 : 400,
  textAlign: f.align ?? "left",
  color: f.color ?? INK,
  fontFamily: "Helvetica, Arial, sans-serif",
});

function Editor({ initial, initialStep }: { initial: DocumentTemplate | null; initialStep: 1 | 2 | 3 }) {
  const router = useRouter();
  const save = useSaveTemplate();
  const remove = useDeleteTemplate();
  const orders = useOrders();
  const [t, setT] = useState<Draft>(() => toDraft(initial));
  const [savedId, setSavedId] = useState<string | undefined>(initial?.id);
  const [file, setFile] = useState<File | undefined>();
  const [fileError, setFileError] = useState("");
  const [dropped, setDropped] = useState(false);
  const [step, setStep] = useState(initialStep);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(initial?.fields[0]?.id ?? null);
  const [tool, setTool] = useState<Tool>("pick");
  const [sampleIndex, setSampleIndex] = useState(0);
  const [published, setPublished] = useState(false);
  const [allowIncomplete, setAllowIncomplete] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [prepareError, setPrepareError] = useState("");
  const [runs, setRuns] = useState<TextRun[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);

  // The PDF as uploaded comes from S3 (its text is still selectable); a freshly chosen file is read locally.
  const storedFile = !!initial?.fileKey && !dropped;
  const sourceUrl = useTemplateSourceUrl(initial?.id ?? null, storedFile && !file);
  const { pdf, bytes, error: pdfError } = usePdf(file ?? (storedFile ? (sourceUrl.data?.url ?? null) : null));
  const hasFile = !!file || storedFile;
  const pages = pdf?.numPages ?? t.pages;

  // The text already printed on the page, as clickable pieces.
  useEffect(() => {
    if (!pdf || step !== 2) return;
    let cancelled = false;
    getTextRuns(pdf, page)
      .then((r) => !cancelled && setRuns(r))
      .catch(() => !cancelled && setRuns([]));
    return () => {
      cancelled = true;
    };
  }, [pdf, page, step]);

  const pageFields = t.fields.filter((f) => f.page === page);
  const selected = t.fields.find((f) => f.id === selectedId) ?? null;
  const missing = t.fields.filter(isEmpty).length;
  const coverCount = t.fields.filter((f) => f.cover).length;
  // An order document has to print all the data of the order (or be published on purpose without some of it).
  const covered = coverage(tokensInFields(t.fields));
  const gaps = t.kind === "order" ? covered.filter((c) => !c.ok).length : 0;
  const placing = tool !== "pick" && tool !== "erase" ? tool : null;
  const [drag, setDrag] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);

  const updateField = (patch: Partial<TemplateField>) => setT((prev) => ({ ...prev, fields: prev.fields.map((f) => (f.id === selectedId ? { ...f, ...patch } : f)) }));

  // Pieces of the original text that already belong to a field are not offered again.
  const freeRuns = runs.filter((r) => !pageFields.some((f) => r.x + r.w / 2 >= f.x && r.x + r.w / 2 <= f.x + f.w && r.y + r.h / 2 >= f.y && r.y + r.h / 2 <= f.y + f.h));

  function chooseFile(f: File | undefined) {
    if (!f) return;
    if (f.type !== "application/pdf" && !/\.pdf$/i.test(f.name)) return setFileError("Solo se aceptan archivos PDF.");
    if (f.size > MAX_BYTES) return setFileError("El PDF pesa más de 10 MB.");
    setFileError("");
    setFile(f);
    setT((prev) => ({ ...prev, fileName: f.name, name: prev.name || f.name.replace(/\.pdf$/i, "") }));
  }

  function placeField(e: MouseEvent<HTMLDivElement>) {
    if (!placing) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const scale = rect.width / PAGE_W;
    const size = ({ sign: [200, 52], check: [22, 22], lines: [520, 136] } as Record<string, number[]>)[placing] ?? [180, 22];
    const [w, h] = size;
    const x = Math.max(0, Math.min(PAGE_W - w, Math.round((e.clientX - rect.left) / scale - w / 2)));
    const y = Math.max(0, Math.min(PAGE_H - h, Math.round((e.clientY - rect.top) / scale - h / 2)));
    const variable = placing === "sign" ? "sign.client" : placing === "lines" ? "order.lines" : null;
    const label = TOOLS.find((x2) => x2.type === placing)?.label ?? "Campo";
    const field: TemplateField = { id: newId(), page, label, variable, type: placing, x, y, w, h, required: false, ...(placing === "text" ? { text: "" } : {}) };
    setT((prev) => ({ ...prev, fields: [...prev.fields, field] }));
    setSelectedId(field.id);
    setTool("pick");
  }

  /** Selected pieces of the PDF become one field that prints text of your choice over them. */
  function convertPicked(type: "text" | "lines" = "text") {
    const chosen = runs.filter((r) => picked.includes(r.id));
    if (!chosen.length) return;
    const g = joinRuns(chosen);
    const box = { x: Math.max(0, g.x), y: Math.max(0, g.y - 1), w: g.w + 3, h: g.h + 2 };
    // A single line may be replaced by something longer: let it run up to the next thing on the same line.
    const single = type === "text" && g.lineRects.length === 1;
    const originalBox = { ...box };
    if (single) {
      const others = [...runs.filter((r) => !picked.includes(r.id)), ...pageFields];
      const limit = Math.min(
        PAGE_W - 30,
        ...others.filter((o) => o.x > g.x + g.w - 2 && o.y < g.y + g.h - 2 && o.y + ("h" in o ? o.h : 0) > g.y + 2).map((o) => o.x - 4),
      );
      box.w = Math.max(box.w, limit - box.x);
    }
    const pad = (r: { x: number; y: number; w: number; h: number }) => ({ x: Math.max(0, r.x), y: Math.max(0, r.y - 1), w: r.w + 3, h: r.h + 2 });
    const cover = canvas ? sampleBackground(canvas, box) : "#ffffff";
    const field: TemplateField =
      type === "lines"
        ? { id: newId(), page, label: "Conceptos", variable: "order.lines", type: "lines", ...box, required: false, cover, ...(g.lineRects.length > 1 ? { coverRects: g.lineRects.map(pad) } : {}) }
        : {
            id: newId(),
            page,
            label: g.text.slice(0, 28),
            variable: null,
            type: "text",
            text: g.text,
            ...box,
            required: false,
            fontSize: g.size,
            lineHeight: g.lineHeight,
            bold: g.bold || undefined,
            align: "left",
            cover,
            color: canvas ? sampleTextColor(canvas, box, cover) : undefined,
            ...(g.lineRects.length > 1 ? { coverRects: g.lineRects.map(pad) } : {}),
            ...(single && box.w > originalBox.w ? { coverRects: [originalBox] } : {}),
            ...(g.indent ? { indent: g.indent } : {}),
          };
    setT((prev) => ({ ...prev, fields: [...prev.fields, field] }));
    setSelectedId(field.id);
    setPicked([]);
  }

  /** Removes the picked texts from the document: they are covered and nothing is printed in their place. */
  function erasePicked() {
    const chosen = runs.filter((r) => picked.includes(r.id));
    if (!chosen.length) return;
    const g = joinRuns(chosen);
    const pad = (r: { x: number; y: number; w: number; h: number }) => ({ x: Math.max(0, r.x), y: Math.max(0, r.y - 1), w: r.w + 3, h: r.h + 2 });
    const box = pad(g);
    const field: TemplateField = {
      id: newId(),
      page,
      label: `Borrado: ${g.text.slice(0, 22)}`,
      variable: null,
      type: "text",
      text: "",
      ...box,
      required: false,
      cover: canvas ? sampleBackground(canvas, box) : "#ffffff",
      ...(g.lineRects.length > 1 ? { coverRects: g.lineRects.map(pad) } : {}),
    };
    setT((prev) => ({ ...prev, fields: [...prev.fields, field] }));
    setSelectedId(field.id);
    setPicked([]);
  }

  /** Dragging with the eraser covers any area: a logo, a line, a text the picker cannot select. */
  const pointAt = (e: PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const k = rect.width / PAGE_W;
    return { x: Math.min(PAGE_W, Math.max(0, (e.clientX - rect.left) / k)), y: Math.min(PAGE_H, Math.max(0, (e.clientY - rect.top) / k)) };
  };
  const dragStart = (e: PointerEvent<HTMLDivElement>) => {
    if (tool !== "erase") return;
    const p = pointAt(e);
    try {
      e.currentTarget.setPointerCapture(e.pointerId); // keeps the drag alive when the pointer leaves the page
    } catch {
      // no active pointer to capture: the drag still works while it stays over the page
    }
    setDrag({ x0: p.x, y0: p.y, x1: p.x, y1: p.y });
  };
  const dragMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag) return;
    const p = pointAt(e);
    setDrag({ ...drag, x1: p.x, y1: p.y });
  };
  const dragEnd = () => {
    if (!drag) return;
    const box = { x: Math.min(drag.x0, drag.x1), y: Math.min(drag.y0, drag.y1), w: Math.abs(drag.x1 - drag.x0), h: Math.abs(drag.y1 - drag.y0) };
    setDrag(null);
    if (box.w < 4 || box.h < 4) return;
    const field: TemplateField = { id: newId(), page, label: "Zona borrada", variable: null, type: "text", text: "", ...box, required: false, cover: canvas ? sampleBackground(canvas, box) : "#ffffff" };
    setT((prev) => ({ ...prev, fields: [...prev.fields, field] }));
    setSelectedId(field.id);
    setTool("pick");
  };

  // Delete removes the selected field (when you are not typing in a box).
  useEffect(() => {
    if (step !== 2 || !selectedId) return;
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && e.target.closest("input, textarea, select, [contenteditable]");
      if (e.key !== "Delete" || typing) return;
      setT((prev) => ({ ...prev, fields: prev.fields.filter((f) => f.id !== selectedId) }));
      setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, selectedId]);

  async function persist(status: DocumentTemplate["status"]) {
    setPrepareError("");
    let upload: Blob | undefined = file;
    let source: Blob | undefined;
    let clearSource = false;

    try {
      setPreparing(true);
      if (coverCount > 0) {
        if (!pdf || !bytes) throw new Error("pdf");
        // Covered pages are baked into images so the original text is really removed.
        upload = new Blob([new Uint8Array(await flattenCovered(bytes, pdf, t.fields))], { type: "application/pdf" });
        source = file; // a newly chosen original is kept aside; otherwise the server keeps what it already has
      } else if (file) {
        clearSource = true;
      } else if (initial?.sourceKey && bytes) {
        // Covers were removed: print from the original again.
        upload = new Blob([bytes], { type: "application/pdf" });
        clearSource = true;
      }
    } catch {
      setPreparing(false);
      setPrepareError("No pudimos preparar el PDF con los textos cambiados. Intenta de nuevo o revisa que el archivo no esté protegido.");
      return;
    }
    setPreparing(false);

    const input: TemplateInput = { ...t, pages, name: t.name.trim(), status };
    save.mutate(
      { input, id: savedId, file: upload, source, clearSource },
      {
        onSuccess: (saved) => {
          setSavedId(saved.id);
          setFile(undefined);
          setDropped(false);
          setT((prev) => ({ ...prev, status }));
          if (status === "published") setPublished(true);
          else router.push("/documentos");
        },
      },
    );
  }

  const trigger = TEMPLATE_TRIGGERS.find((x) => x.value === t.trigger);
  const sample = orders.data?.[sampleIndex] ?? SAMPLE_ORDER;
  const saveError = save.error instanceof ApiError ? [save.error.message, ...(save.error.details ?? [])].join(" ") : save.isError ? "No pudimos guardar la plantilla. Intenta de nuevo." : "";
  const isNew = !savedId;
  const busy = preparing || save.isPending;

  const onDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    chooseFile(e.dataTransfer.files?.[0]);
  };

  /** What a field prints for a given order (the preview's approximation of the server). */
  const resolved = (f: TemplateField) => (fieldText(f) ? fillText(sample, fieldText(f)) : f.variable ? (TEMPLATE_VARIABLES.find((v) => v.id === f.variable)?.resolve(sample) ?? "") : "");

  return (
    <>
      <PageHeader
        crumb={
          <>
            <Link href="/documentos" className="hover:text-ink">
              Documentos
            </Link>{" "}
            / {isNew ? "Subir PDF" : t.name}
          </>
        }
        title={isNew ? (step === 1 ? "Subir PDF" : t.name || "Nueva plantilla") : "Editar plantilla"}
        actions={
          <ol aria-label="Pasos" className="flex gap-1.5">
            {(["Subir PDF", "Editar textos", "Revisar y publicar"] as const).map((label, i) => {
              const n = (i + 1) as 1 | 2 | 3;
              const done = n < step;
              const current = n === step;
              return (
                <li key={label}>
                  <button
                    type="button"
                    aria-current={current ? "step" : undefined}
                    disabled={n > 1 && !hasFile}
                    onClick={() => {
                      setStep(n);
                      setTool("pick");
                    }}
                    className={`inline-flex h-10 items-center gap-2 rounded-full pl-1.5 pr-3.5 text-[13px] font-semibold shadow-row disabled:opacity-50 ${current ? "bg-ink text-surface" : done ? "bg-surface text-ink" : "bg-surface text-ink-muted"}`}
                  >
                    <span className={`flex size-7 items-center justify-center rounded-full text-xs font-bold ${done ? "bg-mint text-on-mint" : current ? "bg-surface text-ink" : "bg-control text-ink"}`}>{done ? "✓" : n}</span>
                    {label}
                  </button>
                </li>
              );
            })}
          </ol>
        }
      />

      {pdfError ? <ErrorState message="No pudimos abrir el PDF. Verifica que el archivo no esté dañado o protegido con contraseña." /> : null}

      {step === 1 ? (
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_640px]">
          <div className="flex min-w-0 flex-col gap-4">
            {hasFile ? (
              <div className="flex items-center gap-3.5 rounded-[20px] bg-surface px-[18px] py-4 shadow-row">
                <IconTile icon="file" size="lg" />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <b className="truncate text-sm">{t.fileName || "PDF de la plantilla"}</b>
                  <span className="text-xs text-ink-muted">
                    {file ? `${Math.max(1, Math.round(file.size / 1024))} KB · ` : ""}
                    {pages} {pages === 1 ? "página" : "páginas"}
                  </span>
                </span>
                <Button
                  variant="soft"
                  size="sm"
                  onClick={() => {
                    setFile(undefined);
                    setDropped(true);
                    setT({ ...t, fileName: "", fields: [] });
                  }}
                >
                  Cambiar archivo
                </Button>
              </div>
            ) : (
              <label
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
                className="flex h-[260px] cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-control-strong bg-surface text-center transition hover:bg-canvas focus-within:outline-2 focus-within:outline-focus"
              >
                <IconTile icon="file" size="lg" />
                <span className="text-[17px] font-semibold">Arrastra tu PDF aquí o elige un archivo</span>
                <span className="text-[13px] text-ink-muted">Solo PDF, hasta 10 MB. Puede ser uno ya llenado: en el siguiente paso cambias sus textos por {"{variables}"}.</span>
                <span className="inline-flex h-10 items-center rounded-md bg-ink px-4 text-sm font-semibold text-surface">Elegir archivo</span>
                <input type="file" accept="application/pdf" className="sr-only" onChange={(e) => chooseFile(e.target.files?.[0])} />
              </label>
            )}
            {fileError ? (
              <p role="alert" className="text-[13px] font-medium text-danger">
                {fileError}
              </p>
            ) : null}
            <Panel className="flex flex-col gap-4">
              <TextField label="Nombre de la plantilla" value={t.name} onChange={(e) => setT({ ...t, name: e.target.value })} placeholder="Orden de servicio" />
              <div className="flex flex-col gap-2">
                <span className="text-[13px] font-semibold">Tipo de documento</span>
                <ChoiceChips label="Tipo de documento" value={t.kind} onChange={(v) => setT({ ...t, kind: v })} options={TEMPLATE_KINDS} />
              </div>
              {t.kind !== "order" ? (
                <div className="flex flex-col gap-2">
                  <span className="text-[13px] font-semibold">¿Cuándo se genera?</span>
                  <ChoiceChips label="Cuándo se genera" value={t.trigger} onChange={(v) => setT({ ...t, trigger: v })} options={TEMPLATE_TRIGGERS} />
                </div>
              ) : (
                <span className="text-xs text-ink-muted">Las plantillas de orden se asignan en Documentos y se generan con cada orden nueva.</span>
              )}
            </Panel>
            <div className="flex justify-end gap-2">
              <Link href="/documentos" className="inline-flex h-11 items-center rounded-md bg-surface px-[18px] text-sm font-semibold shadow-row">
                Cancelar
              </Link>
              <Button disabled={!hasFile || !t.name.trim() || !pdf} onClick={() => setStep(2)} iconRight="arrowRight">
                Continuar: editar textos
              </Button>
            </div>
          </div>
          <div className="flex min-w-0 flex-col gap-2.5">
            <span className="text-[13px] font-semibold">{hasFile ? `Vista previa · ${pages} ${pages === 1 ? "página" : "páginas"}` : "Aquí verás las páginas de tu PDF"}</span>
            <div className="grid min-h-[400px] grid-cols-[repeat(2,300px)] gap-4 overflow-x-auto rounded-xl bg-card p-5">
              {hasFile
                ? Array.from({ length: Math.min(2, pages) }, (_, i) => (
                    <div key={i} className="h-[388px] w-[300px] overflow-hidden rounded-md">
                      <PdfPage pdf={pdf} page={i + 1} style={{ transform: "scale(0.5)", transformOrigin: "0 0" }} />
                    </div>
                  ))
                : null}
            </div>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="grid items-start gap-5 xl:grid-cols-[112px_620px_minmax(0,1fr)]">
          <div className="flex gap-2.5 overflow-x-auto xl:flex-col">
            {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                aria-current={page === n ? "page" : undefined}
                onClick={() => {
                  setPage(n);
                  setPicked([]);
                  setTool("pick");
                }}
                className={`flex flex-col items-center gap-1.5 rounded-lg border-2 px-2 py-2.5 ${page === n ? "border-ink bg-surface" : "border-transparent"}`}
              >
                <span className="block h-[108px] w-[84px] overflow-hidden rounded-[3px] bg-white shadow-row">
                  <PdfPage pdf={pdf} page={n} className="!shadow-none" style={{ transform: "scale(0.14)", transformOrigin: "0 0" }} />
                </span>
                <span className="text-[11px] font-semibold">Página {n}</span>
              </button>
            ))}
          </div>

          <div className="flex min-w-0 flex-col gap-2.5 overflow-x-auto pb-2">
            <div className="flex min-h-8 items-center justify-between gap-3">
              <span className="text-[13px] text-ink-muted">
                {tool === "erase"
                  ? "Arrastra sobre la hoja para tapar una zona (un logo, una línea, un texto)."
                  : placing
                    ? `Haz clic en la hoja donde va el campo de ${TOOLS.find((x) => x.type === placing)?.label.toLowerCase()}`
                    : picked.length
                    ? `${picked.length} ${picked.length === 1 ? "texto elegido" : "textos elegidos"}. Conviértelos en un campo en el panel.`
                    : "Haz clic en un texto del PDF para cambiarlo (puedes elegir varios), o selecciona un campo."}
              </span>
              {placing || tool === "erase" ? (
                <Button variant="soft" size="sm" onClick={() => setTool("pick")}>
                  Cancelar
                </Button>
              ) : null}
            </div>
            <PdfPage
              pdf={pdf}
              page={page}
              onClick={placeField}
              onCanvas={setCanvas}
              onPointerDown={dragStart}
              onPointerMove={dragMove}
              onPointerUp={dragEnd}
              className={`mx-2.5 touch-none ${placing || tool === "erase" ? "cursor-crosshair outline-2 outline-offset-[6px] outline-dashed outline-mint-deep" : ""}`}
            >
              {drag ? <span aria-hidden="true" className="pointer-events-none absolute border-2 border-dashed border-danger bg-danger/15" style={{ left: Math.min(drag.x0, drag.x1), top: Math.min(drag.y0, drag.y1), width: Math.abs(drag.x1 - drag.x0), height: Math.abs(drag.y1 - drag.y0) }} /> : null}
              {tool === "pick"
                ? freeRuns.map((r) => {
                    const on = picked.includes(r.id);
                    return (
                      <button
                        key={r.id}
                        type="button"
                        aria-pressed={on}
                        aria-label={`Texto: ${r.text}`}
                        title={r.text}
                        onClick={(e) => {
                          e.stopPropagation();
                          setPicked((p) => (p.includes(r.id) ? p.filter((x) => x !== r.id) : [...p, r.id]));
                        }}
                        className={`absolute rounded-[3px] transition ${on ? "bg-mint/50 outline-2 outline-ink" : "outline-1 outline-transparent hover:bg-mint/30 hover:outline-mint-deep"}`}
                        style={{ left: r.x - 1, top: r.y - 1, width: r.w + 2, height: r.h + 2 }}
                      />
                    );
                  })
                : null}
              {pageFields.flatMap((f) => (f.cover && f.coverRects?.length ? f.coverRects.map((r, i) => <span key={`${f.id}-c${i}`} aria-hidden="true" className="pointer-events-none absolute" style={{ left: r.x, top: r.y, width: r.w, height: r.h, background: f.cover }} />) : []))}
              {pageFields.map((f) => {
                const on = f.id === selectedId;
                const shown = fieldText(f);
                return (
                  <button
                    key={f.id}
                    type="button"
                    aria-pressed={on}
                    aria-label={`Campo ${f.label}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedId(f.id);
                      setTool("pick");
                    }}
                    className={`absolute overflow-hidden whitespace-pre-wrap rounded-[2px] px-0.5 text-left ${on ? "outline-2 outline-ink" : isEmpty(f) ? "outline-[1.5px] outline-dashed outline-danger" : "outline-[1.5px] outline-dashed outline-mint-deep"} ${f.cover ? "" : isEmpty(f) ? "bg-danger-soft/70" : "bg-mint-soft/70"}`}
                    style={{ ...fieldStyle(f), ...(f.cover && !f.coverRects?.length ? { background: f.cover } : {}), ...(f.indent ? { textIndent: f.indent } : {}), ...(f.type === "lines" ? { display: "flex", alignItems: "flex-end" } : {}) }}
                  >
                    {f.type === "lines" ? "Conceptos de la orden" : f.type === "sign" ? "Firma" : f.type === "check" ? "☐" : shown || (f.cover ? "" : f.label)}
                  </button>
                );
              })}
            </PdfPage>
          </div>

          <div className="flex flex-col gap-3.5">
            <Panel className="flex flex-col gap-2.5 p-[18px]">
              <span className="text-[13px] font-semibold">Qué quieres hacer</span>
              <div className="grid grid-cols-3 gap-1.5">
                {TOOLS.map((tool2) => (
                  <button
                    key={tool2.type}
                    type="button"
                    aria-pressed={tool === tool2.type}
                    onClick={() => setTool(tool === tool2.type && tool2.type !== "pick" ? "pick" : tool2.type)}
                    className={`flex h-[58px] flex-col items-center justify-center gap-1 rounded-md px-1 text-center text-[11px] font-semibold leading-tight ${tool === tool2.type ? "bg-ink text-surface" : "bg-card hover:bg-control"}`}
                  >
                    <Icon name={tool2.icon} />
                    {tool2.label}
                  </button>
                ))}
              </div>
              {picked.length ? (
                <div className="flex flex-col gap-2 rounded-md bg-mint-soft p-3">
                  <span className="text-[13px] font-semibold text-on-mint">
                    {picked.length} {picked.length === 1 ? "texto elegido" : "textos elegidos"}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <Button size="sm" icon="check" onClick={() => convertPicked("text")}>
                      Convertir en campo
                    </Button>
                    <Button size="sm" variant="secondary" icon="grid" onClick={() => convertPicked("lines")} title="Reemplaza este bloque por la tabla de conceptos y precios de la orden">
                      Es la tabla de conceptos
                    </Button>
                    <Button size="sm" variant="secondary" icon="x" onClick={erasePicked} title="Tapa estos textos y no imprime nada en su lugar">
                      Eliminar texto
                    </Button>
                    <Button size="sm" variant="soft" onClick={() => setPicked([])}>
                      Quitar selección
                    </Button>
                  </div>
                </div>
              ) : null}
              <PageRule page={page} rules={t.pageRules ?? []} onChange={(pageRules) => setT((prev) => ({ ...prev, pageRules }))} />
              {!runs.length && pdf && tool === "pick" ? <p className="text-xs text-ink-muted">Esta página no trae texto seleccionable (puede ser una imagen). Usa “Texto nuevo” para escribir encima.</p> : null}
            </Panel>

            <Panel className="flex flex-col gap-2 p-[18px]">
              <div className="flex items-baseline justify-between">
                <span className="text-[13px] font-semibold">Campos en esta página</span>
                <span className={`text-xs font-semibold ${missing ? "text-danger" : "text-mint-deep"}`}>{missing ? `${missing} sin texto` : "Todo listo"}</span>
              </div>
              <div className="flex max-h-[200px] flex-col gap-1 overflow-auto">
                {pageFields.length ? (
                  pageFields.map((f) => {
                    const on = f.id === selectedId;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setSelectedId(f.id)}
                        className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left ${on ? "bg-mint-soft shadow-[inset_0_0_0_2px_var(--ink)]" : "hover:bg-canvas"}`}
                      >
                        <Icon name={TYPE_ICON[f.type]} />
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-[13px] font-semibold">{f.label || "Campo"}</span>
                          <span className={`truncate text-[11px] ${isEmpty(f) ? "text-danger" : "text-ink-muted"}`}>{f.type === "lines" ? "Tabla de conceptos" : f.type === "sign" ? "Espacio de firma" : fieldText(f) || (f.cover ? "Texto original eliminado" : "Sin texto")}</span>
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <span className="py-2 text-[13px] text-ink-muted">Esta página no tiene campos. Haz clic en un texto del PDF y conviértelo en campo.</span>
                )}
              </div>
            </Panel>

            {selected && selected.page === page ? (
              <FieldPanel
                field={selected}
                onChange={updateField}
                onResample={() => canvas && updateField({ cover: sampleBackground(canvas, selected) })}
                onRemove={() => {
                  setT((prev) => ({ ...prev, fields: prev.fields.filter((f) => f.id !== selectedId) }));
                  setSelectedId(null);
                }}
              />
            ) : null}

            <div className="flex justify-end gap-2">
              {isNew ? (
                <Button variant="secondary" onClick={() => setStep(1)}>
                  Atrás
                </Button>
              ) : (
                <Link href="/documentos" className="inline-flex h-11 items-center rounded-md bg-surface px-[18px] text-sm font-semibold shadow-row">
                  Descartar cambios
                </Link>
              )}
              <Button iconRight="arrowRight" onClick={() => setStep(3)}>
                {isNew ? "Continuar: revisar" : "Revisar cambios"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="grid items-start gap-6 xl:grid-cols-[620px_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col gap-2.5 overflow-x-auto pb-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[13px] font-semibold">Probar con una orden</span>
              <ChoiceChips
                label="Orden de prueba"
                value={sampleIndex}
                onChange={setSampleIndex}
                options={[...(orders.data ?? []).slice(0, 3).map((o, i) => ({ value: i, label: `${o.folio} · ${o.clientName}` })), ...(orders.data?.length ? [] : [{ value: 0, label: "Ejemplo" }])]}
              />
            </div>
            {pages > 1 ? <ChoiceChips label="Página" value={page} onChange={setPage} options={Array.from({ length: pages }, (_, i) => ({ value: i + 1, label: `Página ${i + 1}` }))} /> : null}
            <PdfPage pdf={pdf} page={page} className="mx-2.5">
              {t.fields.filter((f) => f.page === page).flatMap((f) => (f.cover && f.coverRects?.length ? f.coverRects.map((r, i) => <span key={`${f.id}-c${i}`} aria-hidden="true" className="absolute" style={{ left: r.x, top: r.y, width: r.w, height: r.h, background: f.cover }} />) : []))}
              {t.fields
                .filter((f) => f.page === page)
                .map((f) => {
                  if (f.type === "lines") {
                    return (
                      <span key={f.id} className="absolute flex flex-col overflow-hidden text-[10px]" style={{ left: f.x, top: f.y, width: f.w, height: f.h, ...(f.cover ? { background: f.cover } : {}) }}>
                        {sample.lines.map((l, i) => (
                          <span key={i} className="flex justify-between gap-3 px-1 py-[2px]" style={{ fontFamily: "Helvetica, Arial, sans-serif" }}>
                            <span className="truncate">{l.qty ? `${l.qty}   ` : ""}{l.concept}</span>
                            <b className="shrink-0">{money2(l.amount)}</b>
                          </span>
                        ))}
                      </span>
                    );
                  }
                  if (f.type === "sign") return f.cover ? <span key={f.id} className="absolute" style={{ left: f.x, top: f.y, width: f.w, height: f.h, background: f.cover }} /> : null;
                  const value = f.type === "check" ? "" : resolved(f);
                  const blank = !value && isPrinted(f) && !f.cover;
                  return (
                    <span
                      key={f.id}
                      className={`absolute overflow-hidden whitespace-pre-wrap px-0.5 ${blank ? "bg-danger-soft/85 text-danger" : ""}`}
                      style={{ ...fieldStyle(f), ...(f.cover ? { background: f.cover } : {}), ...(blank ? { color: undefined } : {}) }}
                    >
                      {blank ? `Falta texto: ${f.label}` : value}
                    </span>
                  );
                })}
            </PdfPage>
            <span className="px-2.5 text-xs text-ink-muted">Vista aproximada: el PDF final se arma en el servidor y ajusta el tamaño de letra para que el texto quepa en su recuadro.</span>
          </div>
          <div className="flex flex-col gap-3.5">
            <Panel className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold">Antes de publicar</h2>
              <Check
                ok={missing === 0}
                title={missing === 0 ? "Todos los campos tienen texto" : `${missing} ${missing === 1 ? "campo sin texto" : "campos sin texto"}`}
                sub={missing === 0 ? `${t.fields.length} campos se llenan solos con cada orden` : 'Regresa a "Editar textos" y escribe qué imprime cada uno'}
              />
              <Check ok title={coverCount ? `${coverCount} ${coverCount === 1 ? "texto original tapado" : "textos originales tapados"}` : "No se tapó texto del PDF"} sub={coverCount ? "Al guardar, las páginas editadas se convierten en imagen para que el texto original desaparezca del archivo" : "El PDF se usa tal cual lo subiste"} />
              <Check ok={t.fields.some((f) => f.type === "sign")} title="Incluye espacio de firma del cliente" sub="El PDF deja el espacio libre; se firma en papel" />
              <Check ok title={t.kind === "order" ? "Se asigna a las órdenes en Documentos" : `Se genera ${trigger?.sentence}`} sub={`Tipo: ${TEMPLATE_KINDS.find((k) => k.value === t.kind)?.label}`} />
            </Panel>
            {t.kind === "order" ? <CoveragePanel items={covered} allow={allowIncomplete} onAllow={setAllowIncomplete} /> : null}
            {published ? (
              <div role="status" className="flex items-center gap-3 rounded-[20px] bg-mint px-[18px] py-4 text-on-mint">
                <Icon name="check" size={18} />
                <span className="flex-1 text-sm font-semibold">Plantilla publicada.{t.kind === "order" ? " Asígnala a las órdenes desde Documentos." : ""}</span>
                <Link href="/documentos" className="text-[13px] font-bold underline">
                  Ver en Documentos
                </Link>
              </div>
            ) : null}
            {prepareError ? <ErrorState message={prepareError} /> : null}
            {saveError ? <ErrorState message={saveError} /> : null}
            {remove.isError ? <ErrorState message="No pudimos eliminar la plantilla." /> : null}
            <div className="flex flex-wrap justify-end gap-2">
              {!isNew ? (
                <Button variant="soft" disabled={remove.isPending} onClick={() => window.confirm(`¿Eliminar la plantilla “${t.name}”? Los documentos ya generados se conservan.`) && remove.mutate(savedId as string, { onSuccess: () => router.push("/documentos") })}>
                  Eliminar
                </Button>
              ) : null}
              <Button variant="secondary" onClick={() => setStep(2)}>
                Editar textos
              </Button>
              <Button variant="soft" disabled={busy} onClick={() => void persist("draft")}>
                Guardar borrador
              </Button>
              <Button icon="check" disabled={busy || missing > 0 || (gaps > 0 && !allowIncomplete)} onClick={() => void persist("published")}>
                {preparing ? "Preparando el PDF…" : save.isPending ? "Guardando…" : "Publicar plantilla"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

/** "Print this page only if the order has an itinerary" (or notes). */
function PageRule({ page, rules, onChange }: { page: number; rules: { page: number; onlyIf: string }[]; onChange: (rules: { page: number; onlyIf: string }[]) => void }) {
  const rule = rules.find((r) => r.page === page);
  const others = rules.filter((r) => r.page !== page);
  return (
    <div className="flex flex-col gap-1.5 rounded-md bg-card p-3">
      <label className="flex cursor-pointer items-start gap-2 text-[13px] font-medium">
        <input type="checkbox" checked={!!rule} onChange={(e) => onChange(e.target.checked ? [...others, { page, onlyIf: "itinerario" }] : others)} className="mt-0.5 size-4 accent-ink" />
        <span className="flex flex-col">
          Imprimir la página {page} solo si la orden tiene…
          <span className="text-xs font-normal text-ink-muted">Si el dato está vacío, esa página se omite (por ejemplo, la del itinerario).</span>
        </span>
      </label>
      {rule ? (
        <select aria-label="Dato necesario para imprimir la página" value={rule.onlyIf} onChange={(e) => onChange([...others, { page, onlyIf: e.target.value }])} className="h-9 rounded-md bg-surface px-2 text-[13px] shadow-[inset_0_0_0_1px_var(--line)]">
          {TEMPLATE_VARIABLES.filter((v) => v.type === "text" && ["itinerario", "notas", "abonos"].includes(v.token)).map((v) => (
            <option key={v.token} value={v.token}>
              {v.label}
            </option>
          ))}
        </select>
      ) : null}
    </div>
  );
}

/** Everything about one field: what it prints, how it looks and whether it hides the original text. */
function FieldPanel({ field: f, onChange, onResample, onRemove }: { field: TemplateField; onChange: (patch: Partial<TemplateField>) => void; onResample: () => void; onRemove: () => void }) {
  const area = useRef<HTMLTextAreaElement>(null);

  function insert(token: string) {
    const el = area.current;
    const value = fieldText(f);
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    onChange({ text: `${value.slice(0, start)}{${token}}${value.slice(end)}` });
    requestAnimationFrame(() => {
      el?.focus();
      const at = start + token.length + 2;
      el?.setSelectionRange(at, at);
    });
  }

  return (
    <Panel className="flex flex-col gap-3 p-[18px]">
      <TextField label="Nombre del campo" value={f.label} onChange={(e) => onChange({ label: e.target.value })} />

      {isPrinted(f) ? (
        <>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="field-text" className="text-[13px] font-semibold">
              Texto que imprime
            </label>
            <textarea
              id="field-text"
              ref={area}
              rows={Math.min(6, Math.max(2, fieldText(f).split("\n").length + 1))}
              value={fieldText(f)}
              onChange={(e) => onChange({ text: e.target.value })}
              placeholder="Escribe texto y usa {variables}: Fecha: {fecha}"
              className="rounded-md bg-card p-3 text-sm outline-none placeholder:text-ink-faint focus:shadow-[inset_0_0_0_2px_var(--ink)]"
            />
            <span className="text-xs text-ink-muted">Mezcla texto fijo y datos. Haz clic en un dato para insertarlo donde está el cursor.</span>
            <div className="flex max-h-[150px] flex-wrap gap-1 overflow-auto">
              {TEMPLATE_VARIABLES.filter((v) => v.type !== "sign" && v.type !== "lines").map((v) => (
                <button key={v.token} type="button" title={v.label} onClick={() => insert(v.token)} className="rounded-full bg-mint-soft px-2.5 py-0.5 text-[11px] font-semibold text-on-mint hover:bg-mint">
                  {`{${v.token}}`}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <TextField label="Tamaño de letra" type="number" min={4} max={72} step={0.5} value={f.fontSize ?? 10.5} onChange={(e) => onChange({ fontSize: Math.min(72, Math.max(4, parseFloat(e.target.value) || 10.5)) })} />
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold">Alineación</span>
              <ChoiceChips
                size="sm"
                label="Alineación"
                value={f.align ?? "left"}
                onChange={(v) => onChange({ align: v })}
                options={[
                  { value: "left" as const, label: "Izq." },
                  { value: "center" as const, label: "Centro" },
                  { value: "right" as const, label: "Der." },
                ]}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <label className="flex cursor-pointer items-center gap-2 text-[13px] font-medium">
              <input type="checkbox" checked={!!f.bold} onChange={(e) => onChange({ bold: e.target.checked || undefined })} className="size-4 accent-ink" />
              Negritas
            </label>
            <label className="flex items-center gap-2 text-[13px] font-medium">
              Color
              <input type="color" value={f.color ?? INK} onChange={(e) => onChange({ color: e.target.value })} className="h-7 w-9 cursor-pointer rounded border border-line bg-transparent p-0" />
              {f.color ? (
                <button type="button" onClick={() => onChange({ color: undefined })} className="text-xs font-semibold underline">
                  Automático
                </button>
              ) : null}
            </label>
          </div>
        </>
      ) : f.type === "lines" ? (
        <p className="text-xs text-ink-muted">Aquí se imprime la tabla de conceptos y precios de cada orden (cantidad, concepto e importe).</p>
      ) : null}

      <div className="flex flex-col gap-1.5 rounded-md bg-card p-3">
        <label className="flex cursor-pointer items-start gap-2 text-[13px] font-medium">
          <input type="checkbox" checked={!!f.cover} onChange={(e) => (e.target.checked ? onChange({ cover: "#ffffff" }) : onChange({ cover: undefined }))} className="mt-0.5 size-4 accent-ink" />
          <span className="flex flex-col">
            Tapar el texto original
            <span className="text-xs font-normal text-ink-muted">Borra lo que trae el PDF en este recuadro; lo nuevo se imprime encima.</span>
          </span>
        </label>
        {f.cover ? (
          <div className="flex items-center gap-2 text-[13px]">
            <span>Color del fondo</span>
            <input type="color" value={f.cover} onChange={(e) => onChange({ cover: e.target.value })} className="h-7 w-9 cursor-pointer rounded border border-line bg-transparent p-0" />
            <button type="button" onClick={onResample} className="text-xs font-semibold underline">
              Tomarlo de la página
            </button>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-4 gap-2">
        {(["x", "y", "w", "h"] as const).map((k) => (
          <TextField key={k} label={{ x: "X", y: "Y", w: "Ancho", h: "Alto" }[k]} type="number" value={Math.round(f[k])} onChange={(e) => onChange({ [k]: Math.max(k === "w" || k === "h" ? 4 : 0, parseFloat(e.target.value) || 0) })} />
        ))}
      </div>
      <div className="flex justify-end">
        <Button variant="soft" size="sm" icon="x" onClick={onRemove}>
          Quitar campo
        </Button>
      </div>
    </Panel>
  );
}

function Check({ ok, title, sub }: { ok: boolean; title: string; sub: string }) {
  return (
    <div className="flex items-start gap-2.5 text-sm">
      <span className={`flex size-[22px] shrink-0 items-center justify-center rounded-full text-xs font-bold ${ok ? "bg-mint text-on-mint" : "bg-danger-soft text-danger"}`}>{ok ? "✓" : "!"}</span>
      <span className="flex flex-col gap-0.5">
        <b className="font-semibold">{title}</b>
        <span className="text-xs text-ink-muted">{sub}</span>
      </span>
    </div>
  );
}
