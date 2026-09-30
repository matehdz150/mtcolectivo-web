import type { VehicleKind } from "@/lib/types";

import { VEHICLE_ART } from "./vehicle-art-data";

const LABELS: Record<VehicleKind, string> = { van: "Van", bus: "Autobús", car: "Camioneta", truck: "Camión" };

/** Isometric line vehicle: ink strokes over translucent white faces. */
export function VehicleArt({ kind, width = 120, className = "", label }: { kind: VehicleKind; width?: number; className?: string; label?: string }) {
  const art = VEHICLE_ART[kind];
  return (
    <span className={`block text-ink [&_.f1]:fill-white/90 [&_.f2]:fill-white/60 [&_.f3]:fill-white/30 ${className}`} style={{ width }}>
      <svg
        viewBox={art.viewBox}
        role="img"
        aria-label={label ?? LABELS[kind]}
        className="block h-auto w-full overflow-visible"
        dangerouslySetInnerHTML={{ __html: art.svg }}
      />
    </span>
  );
}

export const VEHICLE_KIND_LABELS = LABELS;
