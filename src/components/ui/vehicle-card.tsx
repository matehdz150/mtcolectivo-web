import type { VehicleKind } from "@/lib/types";

import { Icon, type IconName } from "./icon";
import { ProgressBar } from "./meters";
import { Tag } from "./misc";
import { VehicleArt } from "./vehicle-art";

export interface VehicleCardProps {
  code: string;
  kind: VehicleKind;
  driver: string;
  plates: string;
  model: string;
  tag: string;
  progressLabel: string;
  progressStatus: string;
  progress: number;
  stats: { icon: IconName; label: string; value: string }[];
  featured?: boolean;
}

/** Fleet unit card: illustration, identity, owner tag, usage and stats. */
export function VehicleCard(p: VehicleCardProps) {
  return (
    <article
      className={`flex flex-col gap-3.5 rounded-xl p-4 ${p.featured ? "bg-[linear-gradient(165deg,var(--mint)_0%,var(--mint-soft)_62%,var(--surface)_100%)] [&_.text-ink-muted]:text-on-mint" : "bg-card"}`}
    >
      <div className="flex min-h-24 items-start justify-between">
        <VehicleArt kind={p.kind} width={132} />
        <button
          type="button"
          aria-label={`Abrir ${p.code}`}
          className={`flex size-9 items-center justify-center rounded-md ${p.featured ? "bg-white/55 text-on-mint" : "bg-control hover:bg-control-strong"}`}
        >
          <Icon name="expand" />
        </button>
      </div>
      <div className="flex flex-col gap-1">
        <div className="text-2xl font-bold leading-tight tracking-[-0.02em]">{p.code}</div>
        <div className="flex items-center justify-between gap-2 text-sm font-medium">
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <Icon name="idCard" size={15} />
            <span className="truncate">{p.driver}</span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-normal text-ink-muted">
            <Icon name="phone" size={13} />
            {p.plates}
          </span>
        </div>
        <div className="text-xs text-ink-muted">{p.model}</div>
      </div>
      <div>
        <Tag>{p.tag}</Tag>
      </div>
      <ProgressBar value={p.progress} start={p.progressLabel} end={p.progressStatus} />
      <dl className="grid grid-cols-3 gap-2 text-xs">
        {p.stats.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5 text-ink-secondary">
            <dt className="text-ink-muted">
              <Icon name={s.icon} size={14} />
              <span className="sr-only">{s.label}</span>
            </dt>
            <dd className="tabular-nums">{s.value}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}
