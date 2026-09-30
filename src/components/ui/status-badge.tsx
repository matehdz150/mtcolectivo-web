import type { ReactNode } from "react";

export type BadgeTone = "completed" | "pending" | "ongoing" | "delayed" | "text";

const TONES: Record<BadgeTone, string> = {
  completed: "bg-mint text-on-mint",
  pending: "bg-control text-ink-secondary",
  ongoing: "bg-control-strong text-ink",
  delayed: "bg-danger-soft text-danger",
  text: "h-auto px-0 bg-transparent text-ink text-[13px]",
};

/** Status as a word; the tone only reinforces it. */
export function StatusBadge({ tone, children }: { tone: BadgeTone; children: ReactNode }) {
  return <span className={`inline-flex h-6 items-center whitespace-nowrap rounded-full px-3 text-xs font-semibold ${TONES[tone]}`}>{children}</span>;
}
