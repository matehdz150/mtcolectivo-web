/**
 * The login's map motif: a faint street grid, a white avenue and the
 * mint route from pick-up to destination (Zapopan → Amatitán).
 */
export function RouteMap() {
  return (
    <div aria-hidden="true" className="relative aspect-[592/330] w-full">
      <svg viewBox="0 0 592 330" className="absolute inset-0 size-full overflow-visible">
        <g fill="none" stroke="rgba(11,11,11,0.08)" strokeWidth="1">
          <path d="M0 36 H592 M0 104 H592 M0 182 H592 M0 262 H592 M0 318 H592" />
          <path d="M56 0 V330 M168 0 V330 M296 0 V330 M414 0 V330 M520 0 V330" />
          <path d="M0 150 L140 0 M360 330 L592 150" />
        </g>
        <path d="M-20 262 C 140 240, 250 150, 612 76" fill="none" stroke="rgba(11,11,11,0.07)" strokeWidth="18" strokeLinecap="round" />
        <path d="M-20 262 C 140 240, 250 150, 612 76" fill="none" stroke="#fff" strokeWidth="14" strokeLinecap="round" opacity="0.85" />
        <path d="M-20 262 C 140 240, 250 150, 612 76" fill="none" stroke="rgba(11,11,11,0.14)" strokeWidth="1" strokeDasharray="8 8" />
        <path d="M72 292 L168 292 L168 224 C 250 186, 360 128, 490 96" fill="none" stroke="var(--mint)" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
        <path d="M72 292 L168 292 L168 224 C 250 186, 360 128, 490 96" fill="none" stroke="var(--mint-deep)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="72" cy="292" r="8" fill="#fff" stroke="var(--ink)" strokeWidth="3" />
        <path d="M490 96 c-11 -13 -16 -21 -16 -28 a16 16 0 0 1 32 0 c0 7 -5 15 -16 28 z" fill="var(--mint-deep)" stroke="#fff" strokeWidth="2" />
        <circle cx="490" cy="68" r="5.5" fill="#fff" />
      </svg>
      <MapLabel className="left-[4.7%] top-[93%] bg-surface shadow-float">Zapopan · 1:00 p. m.</MapLabel>
      <MapLabel className="left-[33%] top-[53%] bg-ink text-surface">Van 14 asignada · 12 pasajeros</MapLabel>
      <MapLabel className="left-[64%] top-[33%] bg-surface shadow-float">Amatitán · regreso 8:00 p. m.</MapLabel>
    </div>
  );
}

function MapLabel({ className, children }: { className: string; children: string }) {
  return (
    <span className={`absolute inline-flex h-[30px] items-center whitespace-nowrap rounded-full px-3 text-xs font-semibold ${className}`}>
      {children}
    </span>
  );
}

/** Small version of the route for the mobile header. */
export function RouteMapCompact() {
  return (
    <svg aria-hidden="true" viewBox="0 0 390 332" preserveAspectRatio="xMaxYMax slice" className="absolute inset-0 size-full">
      <g fill="none" stroke="rgba(11,11,11,0.07)" strokeWidth="1">
        <path d="M0 150 H390 M0 226 H390 M0 296 H390" />
        <path d="M120 120 V332 M250 120 V332 M340 120 V332" />
      </g>
      <path d="M-10 300 C 120 280, 220 210, 400 170" fill="none" stroke="#fff" strokeWidth="10" strokeLinecap="round" opacity="0.85" />
      <path d="M200 296 L250 296 L250 250 C 290 232, 320 214, 350 206" fill="none" stroke="var(--mint-deep)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="200" cy="296" r="6" fill="#fff" stroke="var(--ink)" strokeWidth="2.5" />
      <path d="M350 206 c-8 -10 -12 -15 -12 -20 a12 12 0 0 1 24 0 c0 5 -4 10 -12 20 z" fill="var(--mint-deep)" stroke="#fff" strokeWidth="1.5" />
      <circle cx="350" cy="186" r="4" fill="#fff" />
    </svg>
  );
}
