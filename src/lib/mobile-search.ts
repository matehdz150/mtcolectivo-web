"use client";

import { useEffect, useState } from "react";

/** The search button of the phone's top bar announces itself with this event. */
export const SEARCH_EVENT = "mtc:search";

/**
 * Phone: the search field of a screen stays hidden until the top bar's search button is tapped.
 * Returns whether it was opened; the field (with `id`) is focused when it opens.
 */
export function useMobileSearch(id: string) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const on = () => {
      setOpen(true);
      // the field becomes visible on the next paint
      setTimeout(() => document.getElementById(id)?.focus(), 50);
    };
    window.addEventListener(SEARCH_EVENT, on);
    return () => window.removeEventListener(SEARCH_EVENT, on);
  }, [id]);

  return open;
}
