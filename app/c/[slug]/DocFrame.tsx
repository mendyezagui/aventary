"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { registerDocFrame } from "./reveal";

// Renders a full, standalone client document in an isolated iframe (srcDoc), so
// the document's own <style> is fully sandboxed from the site and vice-versa.
// Auto-sizes to the document's height so it reads as one continuous page.
//
// WHY THIS CHECKS WHICH DOCUMENT IT IS SHOWING
//
// On 2026-09-15 /c/myef rendered Brown Bag Direct's proposal, and on a later
// load Prime Rock's, while the rest of the page — title, Ask panel, anchors —
// was correctly MYEF's. The stored documents were verified clean and the
// server's signed-out render was correct and stable, so the wrong document was
// arriving at this iframe and nowhere else. The mechanism was never reproduced:
// in-app links, browser back and forward, and a prefetching index were all
// tested and all correct.
//
// KNOW WHAT THIS CHECK COVERS. The stamp is written from the CURRENT slug, so
// it matches whatever HTML is handed to this component. It therefore catches
// exactly one thing: a frame still holding a document stamped on an earlier
// render — element reuse across two clients' pages. It cannot catch the server
// resolving the wrong document; that is checked where it can be, against the
// row's own slug in lib/client-pages.ts.
//
// The real remedy is upstream of both: the shelf links to a document with a
// plain <a>, so opening one is a full page load with no client state carried
// in from the last. This stays as the net under that.
//
// A mismatch reloads the frame once. If it survives that, the document is not
// shown at all: a blank panel and a note to reload beats silently handing
// somebody another client's pricing.

/** Marks the document with the slug it belongs to, for the check below. */
const STAMP = "cp-doc-slug";

function stamp(html: string, slug: string) {
  const meta = `<meta name="${STAMP}" content="${slug.replace(/"/g, "&quot;")}">`;
  // After <head> where there is one; otherwise at the very start, which still
  // parses into the head and still gets found.
  return /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, (m) => m + meta) : meta + html;
}

type Verdict = "checking" | "ok" | "mismatch";

export function DocFrame({ html, title, slug }: { html: string; title: string; slug: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [nonce, setNonce] = useState(0);
  const [verdict, setVerdict] = useState<Verdict>("checking");
  const retried = useRef(false);

  const resize = useCallback(() => {
    const el = ref.current;
    try {
      const doc = el?.contentDocument;
      if (el && doc) el.style.height = doc.documentElement.scrollHeight + "px";
    } catch {
      /* srcDoc is same-origin; ignore if the read ever fails */
    }
  }, []);

  /** Is the document in the frame the one this page is for? */
  const verify = useCallback(() => {
    const doc = ref.current?.contentDocument;
    if (!doc) return;
    const seen = doc.querySelector(`meta[name="${STAMP}"]`)?.getAttribute("content");
    // No stamp at all means the frame has not parsed our srcDoc yet — say
    // nothing rather than failing a document that is merely still loading.
    if (seen == null) return;
    if (seen === slug) {
      setVerdict("ok");
      return;
    }
    console.error(`client page /c/${slug} rendered the document for "${seen}" — reloading the frame`);
    if (!retried.current) {
      retried.current = true;
      setVerdict("checking");
      setNonce((n) => n + 1); // new key below → a brand-new iframe element
      return;
    }
    setVerdict("mismatch");
  }, [slug]);

  const onLoad = useCallback(() => {
    verify();
    resize();
  }, [verify, resize]);

  // The Ask panel's "Read more here" has to scroll to a heading inside this
  // frame, and cannot reach one through a `#id` link. Handing the element over
  // is what lets reveal.ts measure across the boundary.
  useEffect(() => {
    registerDocFrame(ref.current);
    return () => registerDocFrame(null);
  }, [nonce]);

  // The frame can be narrowed without the window changing size — the Ask rail
  // opens a gutter beside it — and a narrower document is a taller one. Height
  // changes are this component's own doing and would loop, so only width counts.
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    let width = el.clientWidth;
    const ro = new ResizeObserver(() => {
      if (el.clientWidth === width) return;
      width = el.clientWidth;
      resize();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [resize, nonce]);

  useEffect(() => {
    window.addEventListener("resize", resize);
    // A couple of delayed passes catch late web-font reflow, and double as the
    // check for a frame whose load event we somehow missed.
    const t1 = setTimeout(onLoad, 300);
    const t2 = setTimeout(onLoad, 1200);
    return () => {
      window.removeEventListener("resize", resize);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [resize, onLoad, nonce]);

  if (verdict === "mismatch") {
    return (
      <div className="cp-doc-mismatch" role="alert">
        <p>This page could not confirm it was showing the right document, so it has not shown one.</p>
        <p>Reload the page. If it happens again, tell Mendy — do not work from a document you reached this way.</p>
      </div>
    );
  }

  return (
    <iframe
      key={`${slug}:${nonce}`}
      ref={ref}
      className="cp-doc"
      title={title}
      srcDoc={stamp(html, slug)}
      onLoad={onLoad}
      scrolling="no"
    />
  );
}
