"use client";

import Link from "next/link";
import { useState } from "react";

import { FilterTabs } from "@/components/ui/filter-tabs";
import { Icon } from "@/components/ui/icon";
import { IconTile } from "@/components/ui/icon-tile";
import { ErrorState, PageHeader, Panel, Skeleton } from "@/components/ui/misc";
import { StatusBadge } from "@/components/ui/status-badge";
import { shortDate, time12 } from "@/lib/format";
import { useGeneratedDocuments, useTemplates } from "@/lib/queries";
import { TEMPLATE_TRIGGERS } from "@/lib/template-vars";
import type { DocumentTemplate } from "@/lib/types";

type Filter = "all" | "published" | "draft";

export default function DocumentsPage() {
  const templates = useTemplates();
  const documents = useGeneratedDocuments();
  const [filter, setFilter] = useState<Filter>("all");
  const list = templates.data ?? [];
  const visible = list.filter((t) => filter === "all" || t.status === filter);

  return (
    <>
      <PageHeader
        title="Documentos"
        subtitle="Plantillas PDF que la app llena con los datos de cada orden"
        actions={
          <Link href="/documentos/editor" className="inline-flex h-11 items-center gap-2 rounded-md bg-ink px-[18px] text-sm font-semibold text-surface hover:bg-ink-secondary">
            <Icon name="plus" size={16} strokeWidth={2} />
            Agregar PDF
          </Link>
        }
      />

      <ol aria-label="Cómo funciona" className="grid gap-3 md:grid-cols-3">
        {(
          [
            ["file", "1 · Sube tu PDF", "El contrato, la orden o el recibo que ya usas, tal cual."],
            ["pin", "2 · Marca dónde va cada dato", "Coloca campos sobre la hoja y di qué dato de la orden llevan."],
            ["check", "3 · Revisa y publica", "Pruébalo con una orden real; después se genera solo."],
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

      {templates.isPending ? (
        <Skeleton rows={4} />
      ) : templates.isError ? (
        <ErrorState message="No pudimos cargar las plantillas." onRetry={() => templates.refetch()} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {visible.map((t) => (
            <TemplateCard key={t.id} template={t} />
          ))}
        </div>
      )}

      <Panel className="flex flex-col gap-1.5 px-5 py-4">
        <h2 className="mb-1 font-semibold">Generados recientemente</h2>
        {documents.isPending ? (
          <span className="text-sm text-ink-muted">Cargando…</span>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-[13px]">
              <thead>
                <tr className="text-left text-xs text-ink-muted">
                  <th className="px-2.5 py-2 font-semibold">Documento</th>
                  <th className="px-2.5 py-2 font-semibold">Orden</th>
                  <th className="px-2.5 py-2 font-semibold">Cliente</th>
                  <th className="px-2.5 py-2 font-semibold">Generado</th>
                  <th className="px-2.5 py-2 font-semibold">Enviado por</th>
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
                      {shortDate(d.createdAt.slice(0, 10))} · {time12(d.createdAt.slice(11, 16))}
                    </td>
                    <td className="px-2.5 py-2 text-ink-secondary">{d.channel}</td>
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

function TemplateCard({ template: t }: { template: DocumentTemplate }) {
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
          <StatusBadge tone={t.status === "published" ? "completed" : "pending"}>{t.status === "published" ? "Publicada" : "Borrador"}</StatusBadge>
        </span>
      </div>
      <div className="flex flex-col gap-0.5 px-1">
        <span className="text-[15px] font-semibold leading-tight">{t.name}</span>
        <span className="text-xs text-ink-muted">
          {t.pages} {t.pages === 1 ? "página" : "páginas"} · {t.fields.length ? `${t.fields.length} campos` : "sin campos"}
          {missing ? ` · ${missing} sin dato` : ""}
        </span>
        <span className="text-xs text-ink-secondary">{t.status === "draft" ? "Borrador" : `Se genera ${trigger?.sentence}`}</span>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <Link href={`/documentos/editor?id=${t.id}`} className="inline-flex h-9 items-center justify-center rounded-md bg-surface text-[13px] font-semibold shadow-row hover:bg-canvas">
          Editar
        </Link>
        <Link href={`/documentos/editor?id=${t.id}&paso=3`} className="inline-flex h-9 items-center justify-center rounded-md bg-control text-[13px] font-semibold hover:bg-control-strong">
          Probar
        </Link>
      </div>
    </article>
  );
}
