"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Scroll-reveal wrapper. Renders a <div> that fades + rises into view the first
 * time it enters the viewport. Progressive-enhancement by design:
 *
 *  - SSR / no-JS: children render fully visible (the .av-reveal hidden state is
 *    only applied client-side, after mount).
 *  - prefers-reduced-motion: we never add the animating class, so content just
 *    appears — no motion, no layout shift.
 *
 * Mirrors the IntersectionObserver pattern already used in RichArticleReveals,
 * so no animation dependency is added to the bundle.
 */
export function Reveal({
  children,
  delay = 0,
  className = ""
}: {
  children: ReactNode;
  /** stagger, in ms */
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respect the user's motion preference — leave content as-is.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Move to the hidden pre-animation state now that JS is confirmed present.
    el.classList.add("av-reveal");
    if (delay) el.style.transitionDelay = `${delay}ms`;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);

    return () => io.disconnect();
  }, [delay]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
