"use client";

import Link from "next/link";
import { useState } from "react";

import { FilterTabs } from "@/components/ui/filter-tabs";
import { Icon } from "@/components/ui/icon";
import { IconTile } from "@/components/ui/icon-tile";
import { EmptyState, ErrorState, PageHeader, Panel, Skeleton } from "@/components/ui/misc";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { shortDate, startDownload, time12 } from "@/lib/format";
import { useAssignments, useGeneratedDocuments, useSetAssignments, useTemplates } from "@/lib/queries";
import { TEMPLATE_TRIGGERS } from "@/lib/template-vars";
import type { DocumentTemplate } from "@/lib/types";

type Filter = "all" | "published" | "draft";

export default function DocumentsPage() {
  const templates = useTemplates();
  const assignments = useAssignments();
  const documents = useGeneratedDocuments();
  const [filter, setFilter] = useState<Filter>("all");
  const list = templates.data ?? [];
  const visible = list.filter((t) => filter === "all" || t.status === filter);

  return (
    <>
      <PageHeader
        inlineActions
        title="Documentos"
        subtitle={
          <>
            <span className="max-lg:hidden">Los documentos que la app arma con los datos de cada orden</span>
            <span className="lg:hidden">
              {list.length} {list.length === 1 ? "plantilla" : "plantillas"}
            </span>
          </>
        }
        actions={
          <>
            <Link href="/documentos/editor" className="inline-flex h-11 items-center gap-2 rounded-md bg-surface px-[18px] text-sm font-semibold shadow-row hover:bg-canvas max-lg:hidden">
              Subir PDF en blanco
            </Link>
            <Link href="/documentos/documento" aria-label="Nuevo documento" className="inline-flex h-11 items-center gap-2 rounded-md bg-ink px-[18px] text-sm font-semibold text-surface hover:bg-ink-secondary max-lg:size-12 max-lg:justify-center max-lg:rounded-2xl max-lg:px-0">
              <Icon name="plus" size={16} strokeWidth={2} />
              <span className="max-lg:sr-only">Nuevo documento</span>
            </Link>
          </>
        }
      />

      <div className="max-lg:hidden">
      <OrderTemplatePicker templates={list} assignedId={assignments.data?.order ?? null} loading={assignments.isPending || templates.isPending} />
      </div>

      <ol aria-label="Cómo funciona" className="grid gap-3 max-lg:hidden md:grid-cols-3">
        {(
          [
            ["file", "1 · Escribe el documento", "Con el editor, como en Word. O sube un PDF en blanco y marca dónde va cada dato."],
            ["pin", "2 · Pon {variables}", "{cliente}, {fecha}, {total}… se sustituyen solas con los datos de cada orden."],
            ["check", "3 · Publícalo y asígnalo", "La plantilla asignada a las órdenes se imprime con cada orden nueva."],
          ] as const
        ).map(([icon, title, body]) => (
          <li key={title} className="flex items-center gap-3.5 rounded-[20px] bg-surface px-[18px] py-4 shadow-row">
            <IconTile icon={icon} size="lg" />
            <span className="flex flex-col gap-0.5">
              <b className="text-sm">{title}</b>
              <span className="text-xs text-ink-muted">{body}</span>
            </span>
          </li>
        ))}
      </ol>

      <div className="max-lg:hidden">
      <FilterTabs
        label="Filtrar plantillas"
        value={filter}
        onChange={setFilter}
        tabs={[
          { id: "all", label: "Todas", count: list.length },
          { id: "published", label: "Publicadas", count: list.filter((t) => t.status === "published").length },
          { id: "draft", label: "Borradores", count: list.filter((t) => t.status === "draft").length },
        ]}
      />
      </div>

      {templates.isPending ? (
        <Skeleton rows={4} />
      ) : templates.isError ? (
        <ErrorState message="No pudimos cargar las plantillas." onRetry={() => templates.refetch()} />
      ) : visible.length === 0 ? (
        <EmptyState title={list.length ? "Sin plantillas con ese filtro" : "Todavía no hay plantillas"} body={list.length ? undefined : "Sube tu primer PDF con “Agregar PDF”."} />
      ) : (
        <>
        <div className="anim-list flex flex-col gap-3 lg:hidden">
          {visible.map((t) => (
            <PhoneTemplateCard key={t.id} template={t} assigned={t.id === assignments.data?.order} />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 max-lg:hidden sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {visible.map((t) => (
            <TemplateCard key={t.id} template={t} assigned={t.id === assignments.data?.order} />
          ))}
        </div>
        </>
      )}

      <Panel className="flex flex-col gap-1.5 px-5 py-4">
        <h2 className="mb-1 font-semibold">Generados recientemente</h2>
        {documents.isPending ? (
          <span className="text-sm text-ink-muted">Cargando…</span>
        ) : documents.isError ? (
          <ErrorState message="No pudimos cargar los documentos." onRetry={() => documents.refetch()} />
        ) : !documents.data?.length ? (
          <span className="text-sm text-ink-muted">Aún no se genera ningún documento.</span>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-[13px]">
              <thead>
                <tr className="text-left text-xs text-ink-muted">
                  <th className="px-2.5 py-2 font-semibold">Documento</th>
                  <th className="px-2.5 py-2 font-semibold">Orden</th>
                  <th className="px-2.5 py-2 font-semibold">Cliente</th>
                  <th className="px-2.5 py-2 font-semibold">Generado</th>
                  <th className="px-2.5 py-2 font-semibold">PDF</th>
                </tr>
              </thead>
              <tbody>
                {documents.data?.map((d) => (
                  <tr key={d.id} className="border-t border-line">
                    <td className="px-2.5 py-2 font-semibold">{d.templateName}</td>
                    <td className="px-2.5 py-2">
                      <Link href={`/ordenes/detalle?id=${d.orderId}`} className="tabular-nums hover:underline">
                        {d.orderFolio}
                      </Link>
                    </td>
                    <td className="px-2.5 py-2 text-ink-secondary">{d.clientName}</td>
                    <td className="px-2.5 py-2 text-ink-secondary">
                      {shortDate(new Date(d.createdAt).toLocaleDateString("en-CA"))} · {time12(new Date(d.createdAt).toTimeString().slice(0, 5))}
                    </td>
                    <td className="px-2.5 py-2">
                      <Button variant="soft" size="sm" icon="file" onClick={() => startDownload(d.url)}>
                        Descargar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}

/** Phone: one row per template, with the page thumbnail, its status and whether it is the default. */
function PhoneTemplateCard({ template: t, assigned }: { template: DocumentTemplate; assigned: boolean }) {
  const setAssignment = useSetAssignments();
  const canBeDefault = t.kind === "order" && t.status === "published";
  const href = t.mode === "document" ? `/documentos/documento?id=${t.id}` : `/documentos/editor?id=${t.id}`;
  return (
    <article className="relative flex gap-3.5 rounded-3xl bg-surface p-3.5 shadow-row">
      <div aria-hidden="true" className="flex h-28 w-[84px] shrink-0 flex-col gap-[5px] rounded-lg bg-canvas px-[9px] py-2.5 shadow-[inset_0_0_0_1px_var(--line)]">
        <span className="h-[5px] w-3/5 rounded-sm bg-ink" />
        {[100, 85, 70].map((w) => (
          <span key={w} className="h-[3px] rounded-sm bg-control-strong" style={{ width: `${w}%` }} />
        ))}
        <span className="mt-1.5 h-[3px] rounded-sm bg-control-strong" />
        <span className="h-[3px] w-4/5 rounded-sm bg-control-strong" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
        <div className="flex flex-col gap-1.5">
          <Link href={href} className="text-lg font-bold tracking-[-0.02em] after:absolute after:inset-0 after:rounded-3xl">
            {t.name}
          </Link>
          <div className="flex flex-wrap gap-1.5">
            <span className="inline-flex h-6 items-center rounded-full bg-card px-2.5 text-xs font-semibold">{t.mode === "document" ? "Documento" : "PDF"}</span>
            <span className={`inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold ${t.status === "published" ? "bg-mint-soft text-mint-deep" : "bg-card text-ink-secondary"}`}>{t.status === "published" ? "Publicado" : "Borrador"}</span>
          </div>
        </div>
        {t.kind !== "order" ? null : assigned ? (
          <span className="text-[13px] font-semibold text-mint-deep">Predeterminado para órdenes</span>
        ) : canBeDefault ? (
          <button type="button" disabled={setAssignment.isPending} onClick={() => setAssignment.mutate(t.id)} className="relative z-10 h-9 self-start text-[13px] font-semibold text-ink-secondary underline disabled:opacity-50">
            Usar como predeterminado
          </button>
        ) : (
          <span className="text-[13px] text-ink-muted">Sin publicar</span>
        )}
      </div>
    </article>
  );
}

function TemplateCard({ template: t, assigned }: { template: DocumentTemplate; assigned: boolean }) {
  const setAssignment = useSetAssignments();
  const canBeDefault = t.kind === "order" && t.status === "published";
  const missing = t.fields.filter((f) => !f.variable).length;
  const trigger = TEMPLATE_TRIGGERS.find((x) => x.value === t.trigger);
  return (
    <article className="flex flex-col gap-3 rounded-xl bg-card p-3.5">
      <div className="relative flex h-[196px] items-center justify-center rounded-[14px] bg-canvas">
        <div className="flex h-[170px] w-[132px] flex-col gap-[5px] rounded-[4px] bg-white px-2.5 py-3 shadow-[0_6px_18px_-8px_rgba(11,11,11,0.3)]" aria-hidden="true">
          <span className="h-1.5 w-3/5 rounded-sm bg-ink" />
          {[90, 80, 86, 70, 88, 64].map((w, i) => (
            <span key={i} className="h-[3px] rounded-sm bg-control-strong" style={{ width: `${w}%` }} />
          ))}
          {t.fields.slice(0, 3).map((f) => (
            <span key={f.id} className="h-[9px] rounded-sm border border-dashed border-mint-deep bg-mint-soft" style={{ width: `${Math.min(80, (f.w / 600) * 100 + 20)}%`, marginLeft: `${(f.x / 600) * 40}%` }} />
          ))}
        </div>
        <span className="absolute right-2.5 top-2.5">
          <StatusBadge tone={assigned ? "completed" : t.status === "published" ? "ongoing" : "pending"}>{assigned ? "Predeterminado" : t.status === "published" ? "Publicada" : "Borrador"}</StatusBadge>
        </span>
      </div>
      <div className="flex flex-col gap-0.5 px-1">
        <span className="text-[15px] font-semibold leading-tight">{t.name}</span>
        <span className="text-xs text-ink-muted">
          {t.mode === "document"
            ? "Documento escrito en el editor"
            : `PDF en blanco · ${t.pages} ${t.pages === 1 ? "página" : "páginas"} · ${t.fields.length ? `${t.fields.length} campos` : "sin campos"}${missing ? ` · ${missing} sin dato` : ""}`}
        </span>
        <span className="text-xs text-ink-secondary">
          {t.status === "draft" ? "Borrador" : assigned ? "Es el que se elige por defecto al crear una orden" : t.kind === "order" ? "Publicada: se puede elegir al crear una orden" : `Se genera ${trigger?.sentence}`}
        </span>
      </div>
      {t.kind === "order" ? (
        <Button
          size="sm"
          variant={assigned ? "accent" : "secondary"}
          icon="check"
          disabled={assigned || !canBeDefault || setAssignment.isPending}
          title={canBeDefault ? undefined : "Publícalo para poder usarlo como predeterminado"}
          onClick={() => setAssignment.mutate(t.id)}
        >
          {assigned ? "Es el predeterminado" : "Usar como predeterminado"}
        </Button>
      ) : null}
      <div className={`grid gap-1.5 ${t.mode === "document" ? "" : "grid-cols-2"}`}>
        <Link href={t.mode === "document" ? `/documentos/documento?id=${t.id}` : `/documentos/editor?id=${t.id}`} className="inline-flex h-9 items-center justify-center rounded-md bg-surface text-[13px] font-semibold shadow-row hover:bg-canvas">
          Editar
        </Link>
        {t.mode === "document" ? null : (
          <Link href={`/documentos/editor?id=${t.id}&paso=3`} className="inline-flex h-9 items-center justify-center rounded-md bg-control text-[13px] font-semibold hover:bg-control-strong">
            Probar
          </Link>
        )}
      </div>
    </article>
  );
}

/** Which template every new order prints. Changing it affects new orders only. */
function OrderTemplatePicker({ templates, assignedId, loading }: { templates: DocumentTemplate[]; assignedId: string | null; loading: boolean }) {
  const setAssignment = useSetAssignments();
  const options = templates.filter((x) => x.kind === "order" && x.status === "published");
  const current = templates.find((x) => x.id === assignedId);

  return (
    <Panel className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
      <div className="flex min-w-0 flex-col gap-0.5">
        <h2 className="font-semibold">Plantilla de la orden de servicio</h2>
        <p className="text-[13px] text-ink-muted">
          {loading ? "Cargando…" : current ? <>Cada orden nueva se imprime con <b className="text-ink">{current.name}</b>. Las órdenes ya creadas conservan su PDF; regéneralo desde su detalle.</> : "Ninguna asignada: las órdenes nuevas se crean sin PDF. Publica una plantilla de tipo “Orden de servicio” y elígela aquí."}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Plantilla de la orden de servicio"
          value={assignedId ?? ""}
          disabled={loading || setAssignment.isPending}
          onChange={(e) => setAssignment.mutate(e.target.value || null)}
          className="h-11 min-w-[240px] rounded-md bg-card px-3 text-sm font-medium"
        >
          <option value="">Sin asignar</option>
          {options.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </select>
      </div>
      {setAssignment.isError ? <p role="alert" className="w-full text-xs font-medium text-danger">No pudimos cambiar la plantilla. Intenta de nuevo.</p> : null}
    </Panel>
  );
}
