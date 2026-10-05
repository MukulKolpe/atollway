"use client";

import { useEffect, useRef, useState } from "react";

type AnimatedNumberProps = {
  value: number | undefined;
  format: (value: number) => string;
  /** Animation length in milliseconds. */
  duration?: number;
};

/**
 * A number that counts up to its new value. Respects reduced motion.
 */
export const AnimatedNumber = ({ value, format, duration = 900 }: AnimatedNumberProps) => {
  const [shown, setShown] = useState(value ?? 0);
  const from = useRef(value ?? 0);

  useEffect(() => {
    if (value === undefined) return;
    const start = from.current;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || start === value) {
      from.current = value;
      setShown(value);
      return;
    }
    const startedAt = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setShown(start + (value - start) * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
      else from.current = value;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  if (value === undefined) return <span className="text-muted-foreground">–</span>;
  return <span className="tabular-nums">{format(shown)}</span>;
};
