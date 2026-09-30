import type { VehicleKind } from "@/lib/types";

import { VEHICLE_ART } from "./vehicle-art-data";

const LABELS: Record<VehicleKind, string> = {
  car: "Auto",
  suv: "Camioneta",
  minivan: "Minivan",
  van: "Van",
  microbus: "Van grande",
  midibus: "Midibús",
  bus: "Autobús",
};

/** Order shown in the picker: smallest to biggest. */
export const VEHICLE_KINDS: VehicleKind[] = ["car", "suv", "minivan", "van", "microbus", "midibus", "bus"];

/** Drawing width that keeps every illustration visually the same size. */
export const VEHICLE_ART_WIDTH: Record<VehicleKind, number> = { car: 1, suv: 1, minivan: 0.95, van: 1, microbus: 1.1, midibus: 1.15, bus: 1.15 };

/** Isometric line vehicle: ink strokes over translucent white faces. */
export function VehicleArt({ kind, width = 120, className = "", label }: { kind: VehicleKind; width?: number; className?: string; label?: string }) {
  const art = VEHICLE_ART[kind];
  return (
    <span className={`block text-ink [&_.f1]:fill-surface/90 [&_.f2]:fill-surface/60 [&_.f3]:fill-surface/30 ${className}`} style={{ width }}>
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
