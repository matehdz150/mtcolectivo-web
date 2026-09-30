/**
 * MTC Design System icons: 24px grid, 1.8px round strokes, currentColor.
 * Strings are path data, `c` circles and `r` rects.
 */
type Shape = string | { c: [number, number, number] } | { r: [number, number, number, number, number?] };

const ICONS = {
  pin: ["M12 21s-6.5-6-6.5-11.5a6.5 6.5 0 0 1 13 0C18.5 15 12 21 12 21Z", { c: [12, 9.5, 2.4] }],
  box: ["M4 8.5 12 4l8 4.5v7L12 20l-8-4.5z", "M4 8.5 12 13l8-4.5", "M12 13v7"],
  search: [{ c: [11, 11, 6.5] }, "m20 20-4.2-4.2"],
  calendar: [{ r: [4, 5.5, 16, 14.5, 3] }, "M4 10h16", "M8.5 3.5v4", "M15.5 3.5v4"],
  refresh: ["M19.5 12a7.5 7.5 0 1 1-2.2-5.3", "M19.5 4.5v4h-4"],
  plus: ["M12 5v14", "M5 12h14"],
  x: ["m6 6 12 12", "M18 6 6 18"],
  arrowLeft: ["M19 12H5", "m11 6-6 6 6 6"],
  arrowRight: ["M5 12h14", "m13 6 6 6-6 6"],
  menu: ["M5 8h14", "M5 12h14", "M5 16h14"],
  expand: ["M14 5h5v5", "M10 19H5v-5", "m19 5-6 6", "m5 19 6-6"],
  sparkle: ["M12 3.5v4", "M12 16.5v4", "M3.5 12h4", "M16.5 12h4", "m6 6 2.6 2.6", "m15.4 15.4 2.6 2.6", "m6 18 2.6-2.6", "m15.4 8.6 2.6-2.6"],
  grid: [{ r: [4.5, 4.5, 6, 6, 1.5] }, { r: [13.5, 4.5, 6, 6, 1.5] }, { r: [4.5, 13.5, 6, 6, 1.5] }, { r: [13.5, 13.5, 6, 6, 1.5] }],
  help: [{ c: [12, 12, 8.5] }, "M9.7 9.6a2.4 2.4 0 0 1 4.6.9c0 1.6-2.3 2.1-2.3 3.5", "M12 16.8h.01"],
  truck: ["M3 7h11v9H3z", "M14 10h4l3 3v3h-7", { c: [7, 17.5, 1.8] }, { c: [17, 17.5, 1.8] }],
  van: ["M3 16V8.5A1.5 1.5 0 0 1 4.5 7H16l4.5 4.5V16", "M3 16h17.5", "M16 7v4.5h4.5", { c: [7, 17, 1.8] }, { c: [16.5, 17, 1.8] }],
  bus: [{ r: [3, 5, 18, 12, 2.5] }, "M3 11h18", "M8 5v6", "M13 5v6", { c: [7.5, 17.5, 1.8] }, { c: [16.5, 17.5, 1.8] }],
  car: ["M3.5 15.5v-3l2-4.5h9l3.5 4.5h2.5v3", "M3.5 15.5h17", "M7 12.5h11", { c: [7.5, 16, 1.8] }, { c: [16.5, 16, 1.8] }],
  users: [{ c: [9, 8.5, 3.2] }, "M3.5 19a5.5 5.5 0 0 1 11 0", "M15.5 5.6a3 3 0 0 1 0 5.8", "M17.5 14a5 5 0 0 1 3 5"],
  file: ["M6 3.5h8l4 4V20.5H6z", "M14 3.5v4h4", "M9 12h6", "M9 15.5h6"],
  clock: [{ c: [12, 12, 8.5] }, "M12 7.5V12l3 2"],
  dollar: ["M12 3.5v17", "M16 7.5c-.6-1.4-2.1-2-4-2-2.3 0-4 1.1-4 3s1.8 2.6 4 3.1 4 1.2 4 3.3-1.8 3.1-4 3.1c-2 0-3.6-.8-4.2-2.3"],
  idCard: [{ r: [3.5, 5.5, 17, 13, 2.5] }, { c: [9, 11, 2] }, "M6 16a3.2 3.2 0 0 1 6 0", "M14.5 10h3", "M14.5 13.5h3"],
  phone: [{ r: [7, 3.5, 10, 17, 2.2] }, "M11 17.5h2"],
  clip: ["m19 11.5-7.1 7.1a4.5 4.5 0 0 1-6.4-6.4l7.4-7.4a3 3 0 0 1 4.2 4.2l-7.3 7.3a1.5 1.5 0 0 1-2.1-2.1l6.6-6.6"],
  route: [{ c: [6, 18, 2] }, { c: [18, 6, 2] }, "M8 18h7.5a3 3 0 0 0 0-6h-7a3 3 0 0 1 0-6H16"],
  chevronDown: ["m7 10 5 5 5-5"],
  check: ["m5 12.5 4.5 4.5L19 7.5"],
  weight: ["M6.5 9h11l2 11h-15z", { c: [12, 5.5, 2.2] }],
  stop: [{ c: [12, 12, 8.5] }, { c: [12, 12, 3] }],
  mail: [{ r: [3, 5, 18, 14, 3] }, "m4 7 8 6 8-6"],
  lock: [{ r: [4.5, 10.5, 15, 10, 2.5] }, "M8 10.5V7.5a4 4 0 0 1 8 0v3"],
  eye: ["M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z", { c: [12, 12, 3] }],
  eyeOff: ["M10.6 5.1A10.6 10.6 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-2.2 3.1", "M6.6 6.6A17 17 0 0 0 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6", "M9.9 9.9a3 3 0 0 0 4.2 4.2", "m2 2 20 20"],
} satisfies Record<string, Shape[]>;

export type IconName = keyof typeof ICONS;

type IconProps = {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  /** Only when the icon stands alone and carries meaning. */
  label?: string;
  className?: string;
};

export function Icon({ name, size = 16, strokeWidth = 1.8, label, className }: IconProps) {
  const shapes: Shape[] = ICONS[name];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className ?? ""}`}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {shapes.map((shape, i) => {
        if (typeof shape === "string") return <path key={i} d={shape} />;
        if ("c" in shape) return <circle key={i} cx={shape.c[0]} cy={shape.c[1]} r={shape.c[2]} />;
        const [x, y, w, h, rx = 0] = shape.r;
        return <rect key={i} x={x} y={y} width={w} height={h} rx={rx} />;
      })}
    </svg>
  );
}
