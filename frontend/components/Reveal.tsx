"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "./Reveal.module.css";

/**
 * The one motion primitive: a subtle fade + slide-in when the element scrolls
 * into view.
 *
 * The reveal class is toggled imperatively on the node (no React state, no
 * re-render). Resilience: the hidden-then-shown styling lives inside
 * `@media (scripting: enabled) and (prefers-reduced-motion: no-preference)`, so
 * with JS disabled or reduced motion requested the content is simply visible —
 * never trapped behind an animation that can't run.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    const shownClass = styles.shown;
    if (!el || !shownClass) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add(shownClass);
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={[styles.reveal, className].filter(Boolean).join(" ")}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
