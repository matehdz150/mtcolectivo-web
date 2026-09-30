"use client";

import { setTheme, useTheme } from "@/lib/theme";

/**
 * Day and night in one switch: the knob is a sun that turns into a moon while the
 * track changes sky. The colors of the whole app spread out from where it is tapped.
 */
export function ThemeSwitch() {
  const theme = useTheme();
  const dark = theme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="Tema oscuro"
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setTheme(dark ? "light" : "dark", { x: r.left + r.width / 2, y: r.top + r.height / 2 });
      }}
      className={`relative h-[44px] w-[84px] shrink-0 overflow-hidden rounded-full transition-colors duration-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${dark ? "bg-[#1b2440]" : "bg-[#bfe3ff]"}`}
    >
      {/* stars */}
      <span aria-hidden="true" className={`absolute inset-0 transition-opacity duration-500 ${dark ? "opacity-100" : "opacity-0"}`}>
        <i className="absolute left-[14px] top-[11px] size-[3px] rounded-full bg-white" />
        <i className="absolute left-[26px] top-[26px] size-[2px] rounded-full bg-white/80" />
        <i className="absolute left-[38px] top-[13px] size-[2px] rounded-full bg-white/70" />
      </span>
      {/* cloud */}
      <span aria-hidden="true" className={`absolute bottom-[7px] right-[12px] h-[10px] w-[24px] rounded-full bg-white/90 transition-all duration-500 ${dark ? "translate-y-4 opacity-0" : "opacity-100"}`} />
      {/* knob */}
      <span className={`absolute top-[4px] flex size-[36px] items-center justify-center transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${dark ? "translate-x-[44px]" : "translate-x-[4px]"}`}>
        <svg viewBox="0 0 36 36" width="36" height="36" aria-hidden="true" className={`transition-transform duration-500 ${dark ? "rotate-[360deg]" : "rotate-0"}`}>
          <defs>
            <mask id="moon-cut">
              <rect width="36" height="36" fill="white" />
              <circle cx={dark ? 24 : 40} cy="13" r="10" fill="black" style={{ transition: "cx 500ms ease" }} />
            </mask>
          </defs>
          <g className={`origin-center transition-opacity duration-300 ${dark ? "opacity-0" : "opacity-100"}`} stroke="#f5a623" strokeWidth="2" strokeLinecap="round">
            {Array.from({ length: 8 }, (_, i) => {
              const a = (i * Math.PI) / 4;
              return <line key={i} x1={18 + Math.cos(a) * 12.5} y1={18 + Math.sin(a) * 12.5} x2={18 + Math.cos(a) * 15.5} y2={18 + Math.sin(a) * 15.5} />;
            })}
          </g>
          <circle cx="18" cy="18" r={dark ? 11 : 9} mask="url(#moon-cut)" fill={dark ? "#f4f1de" : "#ffc83d"} style={{ transition: "r 500ms ease, fill 500ms ease" }} />
        </svg>
      </span>
    </button>
  );
}
