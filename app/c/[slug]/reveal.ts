// Taking a reader to the passage an answer came from.
//
// There are two shapes of client page and the jump works differently in each.
// An inline document (the lcla model) is part of this page, so the target is an
// ordinary element. A full document (mode:"document") lives inside DocFrame's
// iframe, and a plain `#id` link cannot reach into one — so the frame registers
// itself here and this measures the target's position inside it and scrolls the
// OUTER page, which is the one that actually scrolls.
//
// Both paths end the same way: a brief highlight on the target. Landing
// somewhere mid-document with no indication of what you were sent to look at is
// disorienting, and the flash is what makes the link feel like a citation
// rather than a scroll.

/** How far above the target to stop, so it is not flush against the viewport edge. */
const HEADROOM = 28;
const FLASH_MS = 1900;

let frame: HTMLIFrameElement | null = null;

/** DocFrame calls this on mount and passes null on unmount. */
export function registerDocFrame(el: HTMLIFrameElement | null) {
  frame = el;
}

const gentle = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * Highlight with inline styles rather than a class. Half of these targets are
 * inside the iframe, whose document carries the proposal's own stylesheet and
 * knows nothing about this site's — a class would simply do nothing there.
 */
function flash(el: HTMLElement) {
  const before = el.getAttribute("style");
  el.style.transition = "background-color .3s ease, box-shadow .3s ease";
  el.style.backgroundColor = "rgba(14,107,104,.13)";
  el.style.boxShadow = "0 0 0 7px rgba(14,107,104,.13)";
  el.style.borderRadius = "3px";
  window.setTimeout(() => {
    if (before === null) el.removeAttribute("style");
    else el.setAttribute("style", before);
  }, FLASH_MS);
}

/**
 * Scroll to an anchor and highlight it. False when the id is not in the
 * document — which is the check that matters, because the id comes from a model
 * and an invented one must show the reader nothing rather than a dead link.
 */
export function revealAnchor(id: string): boolean {
  const behavior: ScrollBehavior = gentle() ? "auto" : "smooth";

  const own = document.getElementById(id);
  if (own) {
    window.scrollTo({ top: window.scrollY + own.getBoundingClientRect().top - HEADROOM, behavior });
    flash(own);
    return true;
  }

  const inner = frame?.contentDocument?.getElementById(id);
  if (!frame || !inner) return false;

  // DocFrame sizes the iframe to its whole document, so nothing scrolls inside
  // it and the target's viewport position IS its offset from the document top.
  // The scrollY term is belt and braces for a frame that has not been sized yet.
  const withinDoc =
    inner.getBoundingClientRect().top + (frame.contentWindow?.scrollY ?? 0);
  const top = window.scrollY + frame.getBoundingClientRect().top + withinDoc - HEADROOM;
  window.scrollTo({ top, behavior });
  flash(inner);
  return true;
}
