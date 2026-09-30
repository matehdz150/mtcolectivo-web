"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type MouseEvent } from "react";

import { PAGE_H, PAGE_W, PdfPage } from "@/components/documents/pdf-page";
import { Button } from "@/components/ui/button";
import { ChoiceChips } from "@/components/ui/choice-chips";
import { Icon, type IconName } from "@/components/ui/icon";
import { IconTile } from "@/components/ui/icon-tile";
import { ErrorState, PageHeader, Panel, Skeleton } from "@/components/ui/misc";
import { TextField } from "@/components/ui/text-field";
import { useOrders, useSaveTemplate, useTemplate } from "@/lib/queries";
import { TEMPLATE_KINDS, TEMPLATE_TRIGGERS, TEMPLATE_VARIABLES, variableLabel } from "@/lib/template-vars";
import type { DocumentTemplate, FieldType, TemplateField } from "@/lib/types";

const TYPE_ICON: Record<FieldType, IconName> = { text: "file", date: "calendar", money: "dollar", sign: "idCard", check: "check" };
const TOOLS: { type: FieldType; label: string }[] = [
  { type: "text", label: "Texto" },
  { type: "date", label: "Fecha" },
  { type: "money", label: "Moneda" },
  { type: "sign", label: "Firma" },
  { type: "check", label: "Casilla" },
];

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
  if (!id) return <Editor initial={blankTemplate()} isNew initialStep={1} />;
  if (template.isPending) return <Skeleton rows={8} />;
  if (template.isError) return <ErrorState message="No encontramos esa plantilla." onRetry={() => template.refetch()} />;
  return <Editor key={template.data.id} initial={template.data} isNew={false} initialStep={step} />;
}

function blankTemplate(): DocumentTemplate {
  return { id: `tpl-${Date.now().toString(36)}`, name: "", kind: "contract", trigger: "deposit", fileName: "", pages: 1, fields: [], status: "draft", sendByWhatsApp: true, requestSignature: true, updatedAt: "" };
}

function Editor({ initial, isNew, initialStep }: { initial: DocumentTemplate; isNew: boolean; initialStep: 1 | 2 | 3 }) {
  const router = useRouter();
  const save = useSaveTemplate();
  const orders = useOrders();
  const [t, setT] = useState(initial);
  const [file, setFile] = useState<File | undefined>();
  const [step, setStep] = useState(initialStep);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(initial.fields[0]?.id ?? null);
  const [placing, setPlacing] = useState<FieldType | null>(null);
  const [sampleIndex, setSampleIndex] = useState(0);
  const [published, setPublished] = useState(false);

  const hasFile = Boolean(t.fileName);
  const pageFields = t.fields.filter((f) => f.page === page);
  const selected = t.fields.find((f) => f.id === selectedId) ?? null;
  const missing = t.fields.filter((f) => !f.variable).length;
  const updateField = (patch: Partial<TemplateField>) => setT((prev) => ({ ...prev, fields: prev.fields.map((f) => (f.id === selectedId ? { ...f, ...patch } : f)) }));

  function placeField(e: MouseEvent<HTMLDivElement>) {
    if (!placing) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const scale = rect.width / PAGE_W;
    const sign = placing === "sign";
    const w = sign ? 200 : placing === "check" ? 22 : 180;
    const h = sign ? 52 : 22;
    const x = Math.max(0, Math.min(PAGE_W - w, Math.round((e.clientX - rect.left) / scale - w / 2)));
    const y = Math.max(0, Math.min(PAGE_H - h, Math.round((e.clientY - rect.top) / scale - h / 2)));
    const field: TemplateField = { id: `f-${Date.now().toString(36)}`, page, label: TOOLS.find((x2) => x2.type === placing)?.label ?? "Campo", variable: placing === "sign" ? "sign.client" : null, type: placing, x, y, w, h, required: true };
    setT((prev) => ({ ...prev, fields: [...prev.fields, field] }));
    setSelectedId(field.id);
    setPlacing(null);
  }

  function persist(status: DocumentTemplate["status"]) {
    const next = { ...t, status };
    save.mutate(
      { template: next, isNew, file },
      {
        onSuccess: (saved) => {
          setT(saved);
          if (status === "published") setPublished(true);
          else router.push("/documentos");
        },
      },
    );
  }

  const trigger = TEMPLATE_TRIGGERS.find((x) => x.value === t.trigger);
  const sample = orders.data?.[sampleIndex];

  return (
    <>
      <PageHeader
        crumb={
          <>
            <Link href="/documentos" className="hover:text-ink">
              Documentos
            </Link>{" "}
            / {isNew ? "Agregar PDF" : t.name}
          </>
        }
        title={isNew ? (step === 1 ? "Agregar PDF" : t.name || "Nueva plantilla") : "Editar plantilla"}
        actions={
          <ol aria-label="Pasos" className="flex gap-1.5">
            {(["Subir PDF", "Marcar campos", "Revisar y publicar"] as const).map((label, i) => {
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
                      setPlacing(null);
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

      {step === 1 ? (
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_640px]">
          <div className="flex min-w-0 flex-col gap-4">
            {hasFile ? (
              <div className="flex items-center gap-3.5 rounded-[20px] bg-surface px-[18px] py-4 shadow-row">
                <IconTile icon="file" size="lg" />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <b className="truncate text-sm">{t.fileName}</b>
                  <span className="text-xs text-ink-muted">{file ? `${Math.max(1, Math.round(file.size / 1024))} KB` : `${t.pages} ${t.pages === 1 ? "página" : "páginas"}`}</span>
                </span>
                <Button variant="soft" size="sm" onClick={() => { setFile(undefined); setT({ ...t, fileName: "" }); }}>
                  Cambiar archivo
                </Button>
              </div>
            ) : (
              <label className="flex h-[260px] cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-control-strong bg-surface text-center transition hover:bg-canvas focus-within:outline-2 focus-within:outline-focus">
                <IconTile icon="file" size="lg" />
                <span className="text-[17px] font-semibold">Arrastra tu PDF aquí o elige un archivo</span>
                <span className="text-[13px] text-ink-muted">Solo PDF, hasta 10 MB. Puede tener varias páginas.</span>
                <span className="inline-flex h-10 items-center rounded-md bg-ink px-4 text-sm font-semibold text-surface">Elegir archivo</span>
                <input
                  type="file"
                  accept="application/pdf"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setFile(f);
                    // TODO: contar páginas con pdf.js al integrar el render real.
                    setT((prev) => ({ ...prev, fileName: f.name, pages: 2, name: prev.name || f.name.replace(/\.pdf$/i, "") }));
                  }}
                />
              </label>
            )}
            <Panel className="flex flex-col gap-4">
              <TextField label="Nombre de la plantilla" value={t.name} onChange={(e) => setT({ ...t, name: e.target.value })} placeholder="Contrato de prestación de servicios" />
              <div className="flex flex-col gap-2">
                <span className="text-[13px] font-semibold">Tipo de documento</span>
                <ChoiceChips label="Tipo de documento" value={t.kind} onChange={(v) => setT({ ...t, kind: v })} options={TEMPLATE_KINDS} />
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-[13px] font-semibold">¿Cuándo se genera?</span>
                <ChoiceChips label="Cuándo se genera" value={t.trigger} onChange={(v) => setT({ ...t, trigger: v })} options={TEMPLATE_TRIGGERS} />
                <span className="text-xs text-ink-muted">La app lo arma sola en ese momento y lo deja listo para enviar al cliente.</span>
              </div>
            </Panel>
            <div className="flex justify-end gap-2">
              <Link href="/documentos" className="inline-flex h-11 items-center rounded-md bg-surface px-[18px] text-sm font-semibold shadow-row">
                Cancelar
              </Link>
              <Button disabled={!hasFile || !t.name.trim()} onClick={() => setStep(2)} iconRight="arrowRight">
                Continuar: marcar campos
              </Button>
            </div>
          </div>
          <div className="flex min-w-0 flex-col gap-2.5">
            <span className="text-[13px] font-semibold">{hasFile ? `Vista previa · ${t.pages} ${t.pages === 1 ? "página" : "páginas"}` : "Aquí verás las páginas de tu PDF"}</span>
            <div className="grid min-h-[400px] grid-cols-[repeat(2,300px)] gap-4 overflow-x-auto rounded-xl bg-card p-5">
              {hasFile
                ? Array.from({ length: Math.min(2, t.pages) }, (_, i) => (
                    <div key={i} className="h-[388px] w-[300px] overflow-hidden rounded-md">
                      <PdfPage page={i + 1} style={{ transform: "scale(0.5)", transformOrigin: "0 0" }} />
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
            {Array.from({ length: t.pages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                aria-current={page === n ? "page" : undefined}
                onClick={() => {
                  setPage(n);
                  setPlacing(null);
                }}
                className={`flex flex-col items-center gap-1.5 rounded-lg border-2 px-2 py-2.5 ${page === n ? "border-ink bg-surface" : "border-transparent"}`}
              >
                <span className="block h-[108px] w-[84px] rounded-[3px] bg-white shadow-row" />
                <span className="text-[11px] font-semibold">Página {n}</span>
              </button>
            ))}
          </div>

          <div className="flex min-w-0 flex-col gap-2.5 overflow-x-auto pb-2">
            <div className="flex min-h-8 items-center justify-between">
              <span className="text-[13px] text-ink-muted">
                {placing ? `Haz clic en la hoja donde va el campo de ${TOOLS.find((x) => x.type === placing)?.label.toLowerCase()}` : "Selecciona un campo para cambiar su dato, o agrega uno nuevo"}
              </span>
              {placing ? (
                <Button variant="soft" size="sm" onClick={() => setPlacing(null)}>
                  Cancelar
                </Button>
              ) : null}
            </div>
            <PdfPage page={page} onClick={placeField} className={`mx-2.5 ${placing ? "cursor-crosshair outline-2 outline-offset-[6px] outline-dashed outline-mint-deep" : ""}`}>
              {pageFields.map((f) => {
                const on = f.id === selectedId;
                return (
                  <button
                    key={f.id}
                    type="button"
                    aria-pressed={on}
                    aria-label={`Campo ${f.label}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedId(f.id);
                      setPlacing(null);
                    }}
                    className={`absolute flex overflow-hidden whitespace-nowrap rounded-[4px] px-1.5 text-[10.5px] font-semibold ${f.type === "sign" ? "items-end" : "items-center"} ${f.variable ? "bg-mint-soft/90 text-on-mint" : "bg-danger-soft/85 text-danger"} ${on ? "border-2 border-ink shadow-[0_0_0_3px_rgba(11,11,11,0.12)]" : `border-[1.5px] border-dashed ${f.variable ? "border-mint-deep" : "border-danger"}`}`}
                    style={{ left: f.x, top: f.y, width: f.w, height: f.h }}
                  >
                    {f.label}
                  </button>
                );
              })}
            </PdfPage>
          </div>

          <div className="flex flex-col gap-3.5">
            <Panel className="flex flex-col gap-2.5 p-[18px]">
              <span className="text-[13px] font-semibold">Agregar campo</span>
              <div className="grid grid-cols-5 gap-1.5">
                {TOOLS.map((tool) => (
                  <button
                    key={tool.type}
                    type="button"
                    aria-pressed={placing === tool.type}
                    onClick={() => setPlacing(placing === tool.type ? null : tool.type)}
                    className={`flex h-[58px] flex-col items-center justify-center gap-1 rounded-md text-[11px] font-semibold ${placing === tool.type ? "bg-ink text-surface" : "bg-card hover:bg-control"}`}
                  >
                    <Icon name={TYPE_ICON[tool.type]} />
                    {tool.label}
                  </button>
                ))}
              </div>
            </Panel>

            <Panel className="flex flex-col gap-2 p-[18px]">
              <div className="flex items-baseline justify-between">
                <span className="text-[13px] font-semibold">Campos en esta página</span>
                <span className={`text-xs font-semibold ${missing ? "text-danger" : "text-mint-deep"}`}>{missing ? `${missing} sin dato` : "Todo asignado"}</span>
              </div>
              <div className="flex max-h-[228px] flex-col gap-1 overflow-auto">
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
                          <span className="text-[13px] font-semibold">{f.label}</span>
                          <span className={`text-[11px] ${f.variable ? "text-ink-muted" : "text-danger"}`}>{variableLabel(f.variable) ?? "Sin dato asignado"}</span>
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <span className="py-2 text-[13px] text-ink-muted">Esta página no tiene campos. Elige un tipo arriba y da clic en la hoja.</span>
                )}
              </div>
            </Panel>

            {selected && selected.page === page ? (
              <Panel className="flex flex-col gap-3 p-[18px]">
                <TextField label="Nombre del campo" value={selected.label} onChange={(e) => updateField({ label: e.target.value })} />
                <div className="flex flex-col gap-1.5">
                  <span className="text-[13px] font-semibold">Dato de la orden que lo llena</span>
                  <ChoiceChips
                    size="sm"
                    label="Dato de la orden"
                    className="max-h-[136px] overflow-auto"
                    value={selected.variable ?? ""}
                    onChange={(v) => {
                      const def = TEMPLATE_VARIABLES.find((x) => x.id === v);
                      updateField({ variable: v, type: def?.type ?? selected.type });
                    }}
                    options={TEMPLATE_VARIABLES.map((v) => ({ value: v.id, label: v.label }))}
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <label className="flex cursor-pointer items-center gap-2 text-[13px] font-medium">
                    <input type="checkbox" checked={selected.required} onChange={(e) => updateField({ required: e.target.checked })} className="size-4 accent-ink" />
                    Obligatorio para generar
                  </label>
                  <Button
                    variant="soft"
                    size="sm"
                    icon="x"
                    onClick={() => {
                      setT((prev) => ({ ...prev, fields: prev.fields.filter((f) => f.id !== selectedId) }));
                      setSelectedId(null);
                    }}
                  >
                    Quitar campo
                  </Button>
                </div>
              </Panel>
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
                options={(orders.data ?? []).slice(0, 3).map((o, i) => ({ value: i, label: `${o.folio.replace("OS-2026-", "OS-")} · ${o.clientName}` }))}
              />
            </div>
            <PdfPage page={1} className="mx-2.5">
              {sample
                ? t.fields
                    .filter((f) => f.page === 1)
                    .map((f) => {
                      const def = TEMPLATE_VARIABLES.find((v) => v.id === f.variable);
                      const value = f.type === "sign" ? (t.requestSignature ? "Firma digital pendiente" : "") : def ? def.resolve(sample) : "";
                      const empty = !value;
                      return (
                        <span
                          key={f.id}
                          className={`absolute flex overflow-hidden whitespace-nowrap rounded-[3px] px-1 ${f.type === "sign" ? "items-end text-[10px] italic" : "items-center"} ${f.type === "money" ? "font-bold" : "font-medium"} ${empty ? "bg-danger-soft/85 text-danger" : f.type === "sign" ? "bg-mint-soft/45 text-ink-muted" : "bg-mint-soft/45"}`}
                          style={{ left: f.x, top: f.y, width: f.w, height: f.h }}
                        >
                          {empty ? `Falta dato: ${f.label}` : value}
                        </span>
                      );
                    })
                : null}
            </PdfPage>
          </div>
          <div className="flex flex-col gap-3.5">
            <Panel className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold">Antes de publicar</h2>
              <Check ok={missing === 0} title={missing === 0 ? "Todos los campos tienen dato" : `${missing} ${missing === 1 ? "campo sin dato asignado" : "campos sin dato asignado"}`} sub={missing === 0 ? `${t.fields.length} campos se llenan solos con cada orden` : 'Regresa a "Marcar campos" y elige qué dato llevan'} />
              <Check ok={t.fields.some((f) => f.type === "sign")} title="Incluye firma del cliente" sub={t.requestSignature ? "Se le pedirá firma digital al enviarlo" : "Se firmará en papel"} />
              <Check ok title={`Se genera ${trigger?.sentence}`} sub={`Tipo: ${TEMPLATE_KINDS.find((k) => k.value === t.kind)?.label}`} />
              <Check ok title={sample ? `Probado con ${sample.folio}` : "Sin órdenes de prueba"} sub="Revisa que ningún texto se salga de su recuadro" />
            </Panel>
            <Panel className="flex flex-col gap-2.5">
              <h2 className="font-semibold">Al generarse</h2>
              <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                <input type="checkbox" checked={t.sendByWhatsApp} onChange={(e) => setT({ ...t, sendByWhatsApp: e.target.checked })} className="size-[18px] accent-ink" />
                Enviarlo al cliente por WhatsApp junto con la orden
              </label>
              <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                <input type="checkbox" checked={t.requestSignature} onChange={(e) => setT({ ...t, requestSignature: e.target.checked })} className="size-[18px] accent-ink" />
                Pedir firma digital del cliente
              </label>
            </Panel>
            {published ? (
              <div role="status" className="flex items-center gap-3 rounded-[20px] bg-mint px-[18px] py-4 text-on-mint">
                <Icon name="check" size={18} />
                <span className="flex-1 text-sm font-semibold">Plantilla publicada. Se generará {trigger?.sentence}.</span>
                <Link href="/documentos" className="text-[13px] font-bold underline">
                  Ver en Documentos
                </Link>
              </div>
            ) : null}
            {save.isError ? <ErrorState message="No pudimos guardar la plantilla. Intenta de nuevo." /> : null}
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="secondary" onClick={() => setStep(2)}>
                Editar campos
              </Button>
              <Button variant="soft" disabled={save.isPending} onClick={() => persist("draft")}>
                Guardar borrador
              </Button>
              <Button icon="check" disabled={save.isPending || missing > 0} onClick={() => persist("published")}>
                {save.isPending ? "Guardando…" : "Publicar plantilla"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
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
