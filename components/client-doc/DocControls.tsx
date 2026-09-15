"use client";

import { useEffect, useState } from "react";

// The section rail: jump to a section, and open or close all of them.
//
// The collapsing itself is native <details>, so it works with JavaScript
// disabled and needs nothing from this file. What lives here is only the part
// that genuinely cannot be markup: knowing which section the reader is looking
// at, and the two bulk controls.
//
// The one behaviour worth calling out is the click handler. Following a link to
// a section that is closed would otherwise scroll a reader to a heading with
// nothing under it — browsers are only now growing the auto-expand behaviour
// that would fix this, so the nav opens the target itself rather than depending
// on which browser the client happens to be reading in.

type Item = { id: string; index: number; title: string };

export function DocControls({ sections, numbered }: { sections: Item[]; numbered: boolean }) {
  const [active, setActive] = useState(sections[0]?.id ?? "");
  const [allOpen, setAllOpen] = useState(true);

  useEffect(() => {
    const els = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (!els.length) return;

    // -45% bottom margin puts the trigger line just above the middle of the
    // viewport, so a section reads as current once its heading has settled into
    // place rather than the instant its top edge appears.
    const obs = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort(
          (a, b) => a.boundingClientRect.top - b.boundingClientRect.top
        )[0];
        if (hit) setActive(hit.target.id);
      },
      { rootMargin: "-88px 0px -45% 0px", threshold: 0 }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [sections]);

  const setAll = (open: boolean) => {
    for (const s of sections) {
      const el = document.getElementById(s.id);
      if (el instanceof HTMLDetailsElement) el.open = open;
    }
    setAllOpen(open);
  };

  const jump = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    if (el instanceof HTMLDetailsElement) el.open = true;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    // Keep the address bar honest, without the jump a bare hash change causes.
    history.replaceState(null, "", `#${id}`);
    setActive(id);
  };

  return (
    <nav className="avd-rail" aria-label="Sections">
      <p className="avd-rail-head">Contents</p>
      <ol className="avd-rail-list">
        {sections.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              onClick={(e) => jump(e, s.id)}
              aria-current={active === s.id ? "true" : undefined}
            >
              {numbered ? <span className="avd-rail-n">{String(s.index).padStart(2, "0")}</span> : null}
              <span className="avd-rail-t">{s.title}</span>
            </a>
          </li>
        ))}
      </ol>
      <button type="button" className="avd-rail-toggle" onClick={() => setAll(!allOpen)}>
        {allOpen ? "Collapse all" : "Expand all"}
      </button>
    </nav>
  );
}
