"use client";

import { useCallback, useState } from "react";

/**
 * Lets an element play its exit animation before it is removed:
 * `close()` turns `closing` on (add the `is-closing` class), then calls `done` when it has finished.
 */
export function useAnimatedClose(done: () => void, ms = 180) {
  const [closing, setClosing] = useState(false);
  const close = useCallback(() => {
    if (closing) return;
    setClosing(true);
    setTimeout(() => {
      done();
      setClosing(false);
    }, ms);
  }, [closing, done, ms]);
  return [closing, close] as const;
}
