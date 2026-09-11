"use client";

import { useCallback, useEffect, useRef } from "react";

// Renders a full, standalone client document in an isolated iframe (srcDoc), so
// the document's own <style> is fully sandboxed from the site and vice-versa.
// Auto-sizes to the document's height so it reads as one continuous page.
export function DocFrame({ html, title }: { html: string; title: string }) {
  const ref = useRef<HTMLIFrameElement>(null);

  const resize = useCallback(() => {
    const el = ref.current;
    try {
      const doc = el?.contentDocument;
      if (el && doc) el.style.height = doc.documentElement.scrollHeight + "px";
    } catch {
      /* srcDoc is same-origin; ignore if the read ever fails */
    }
  }, []);

  useEffect(() => {
    window.addEventListener("resize", resize);
    // A couple of delayed passes catch late web-font reflow.
    const t1 = setTimeout(resize, 300);
    const t2 = setTimeout(resize, 1200);
    return () => {
      window.removeEventListener("resize", resize);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [resize]);

  return (
    <iframe
      ref={ref}
      className="cp-doc"
      title={title}
      srcDoc={html}
      onLoad={resize}
      scrolling="no"
    />
  );
}
