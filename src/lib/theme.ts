"use client";

import { useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

const KEY = "mtc:theme";
const EVENT = "mtc:theme-change";

function read(): Theme {
  try {
    return window.localStorage.getItem(KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function subscribe(on: () => void) {
  window.addEventListener(EVENT, on);
  window.addEventListener("storage", on);
  return () => {
    window.removeEventListener(EVENT, on);
    window.removeEventListener("storage", on);
  };
}

/** The saved theme ("light" while the page is still hydrating). */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, read, () => "light");
}

/**
 * Switches the theme. With the View Transitions API the new colors spread out as a circle
 * from `origin` (the switch that was tapped); without it the change is instant.
 */
export function setTheme(next: Theme, origin?: { x: number; y: number }) {
  const apply = () => {
    try {
      window.localStorage.setItem(KEY, next);
    } catch {
      /* the choice just will not survive a reload */
    }
    document.documentElement.dataset.theme = next;
    window.dispatchEvent(new Event(EVENT));
  };

  const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };
  if (!doc.startViewTransition || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    apply();
    return;
  }
  const x = origin?.x ?? window.innerWidth / 2;
  const y = origin?.y ?? 0;
  document.documentElement.style.setProperty("--vt-x", `${x}px`);
  document.documentElement.style.setProperty("--vt-y", `${y}px`);
  doc.startViewTransition(apply);
}

/** Runs before the first paint so a dark page never flashes white. */
export const THEME_BOOT_SCRIPT = `try{document.documentElement.dataset.theme=localStorage.getItem("${KEY}")==="dark"?"dark":"light"}catch(e){}`;
