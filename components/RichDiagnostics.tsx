"use client";

import { useEffect } from "react";

/**
 * Client-side behavior for the rich /diagnostics page (pages.body_html).
 * React strips <script> from dangerouslySetInnerHTML, so the authored page's
 * JS lives here: scroll-in reveals, the hero integrity gauge, and the
 * lead-capture form wired to /api/contact with source='diagnostics'.
 */
export function RichDiagnostics() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".rich-diag");
    if (!root) return;

    // --- staggered scroll reveals ---
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, i) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            setTimeout(() => el.classList.add("in"), (i % 6) * 70);
            io.unobserve(el);
          }
        });
      },
      { threshold: 0.12 }
    );
    root.querySelectorAll<HTMLElement>(".rev").forEach((el) => io.observe(el));

    // --- hero gauge: count 100 -> 58, fill bar, set band ---
    const target = 58;
    const num = root.querySelector<HTMLElement>("#gnum");
    const bar = root.querySelector<HTMLElement>("#gbar");
    const band = root.querySelector<HTMLElement>("#band");
    let gaugeTimer: ReturnType<typeof setInterval> | null = null;
    if (num && bar && band) {
      let v = 100;
      gaugeTimer = setInterval(() => {
        v -= 2;
        if (v <= target) {
          v = target;
          if (gaugeTimer) clearInterval(gaugeTimer);
        }
        num.textContent = String(v);
      }, 28);
      setTimeout(() => {
        bar.style.width = target + "%";
      }, 350);
      band.textContent =
        target >= 80 ? "Tight" : target >= 60 ? "Leaking" : target >= 40 ? "Unreliable" : "Fiction";
    }

    // --- gate form -> /api/contact (source='diagnostics') ---
    const nameInput = root.querySelector<HTMLInputElement>("#rd-name");
    const emailInput = root.querySelector<HTMLInputElement>("#rd-email");
    const btn = root.querySelector<HTMLButtonElement>("#rd-btn");
    const status = root.querySelector<HTMLElement>("#rd-status");

    const setStatus = (msg: string, ok: boolean) => {
      if (!status) return;
      status.style.display = "block";
      status.style.color = ok ? "var(--good)" : "var(--signal)";
      status.textContent = msg;
    };

    const submit = async () => {
      const name = nameInput?.value.trim() ?? "";
      const email = emailInput?.value.trim() ?? "";
      if (!name) { setStatus("Add your first name so the kit email isn't rude.", false); nameInput?.focus(); return; }
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setStatus("That email doesn't look right.", false); emailInput?.focus(); return; }
      if (!btn) return;
      btn.disabled = true;
      btn.textContent = "Sending…";
      try {
        const res = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            email,
            message: "Requested the Revenue Leak Detection Kit",
            source: "diagnostics"
          })
        });
        if (!res.ok) throw new Error(String(res.status));
        btn.textContent = "Sent ✓";
        setStatus("Check your inbox — the X-Ray instructions are on the way.", true);
      } catch {
        btn.disabled = false;
        btn.textContent = "Send the kit →";
        setStatus("Something broke on our end. Try again or email us directly.", false);
      }
    };

    const onClick = () => void submit();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Enter") void submit(); };
    btn?.addEventListener("click", onClick);
    emailInput?.addEventListener("keydown", onKey);
    nameInput?.addEventListener("keydown", onKey);

    return () => {
      io.disconnect();
      if (gaugeTimer) clearInterval(gaugeTimer);
      btn?.removeEventListener("click", onClick);
      emailInput?.removeEventListener("keydown", onKey);
      nameInput?.removeEventListener("keydown", onKey);
    };
  }, []);

  return null;
}
