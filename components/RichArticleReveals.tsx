"use client";

import { useEffect } from "react";

/**
 * Mounts the IntersectionObserver that powers scroll-in reveal animations
 * for posts that ship body_html with `.reveal` elements.
 *
 * React strips <script> from dangerouslySetInnerHTML, so any JS that the
 * authored HTML needs has to live in a real component.
 */
export function RichArticleReveals() {
  useEffect(() => {
    const root = document.querySelector(".rich-article");
    if (!root) return;
    const els = root.querySelectorAll<HTMLElement>(".reveal");
    if (els.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    els.forEach((el, i) => {
      el.style.transitionDelay = `${Math.min(i, 6) * 60}ms`;
      io.observe(el);
    });

    return () => io.disconnect();
  }, []);

  return null;
}
