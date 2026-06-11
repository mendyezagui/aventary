"use client";

import { useState } from "react";

export default function ContactForm({ source = "contact" }: { source?: string }) {
  const [status, setStatus] = useState<"idle" | "submitting" | "ok" | "err">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg(null);
    const fd = new FormData(e.currentTarget);
    const payload = Object.fromEntries(fd.entries());
    (payload as any).source = source;

    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      setStatus("ok");
      (e.target as HTMLFormElement).reset();
    } else {
      const j = await res.json().catch(() => ({}));
      setErrorMsg(j.error ?? "Something went wrong.");
      setStatus("err");
    }
  }

  if (status === "ok") {
    return (
      <div>
        <div className="text-accent font-label font-semibold text-xs tracking-[0.22em] uppercase mb-2">Thanks</div>
        <h3 className="font-headline text-2xl font-bold mb-2">We'll be in touch.</h3>
        <p className="text-on-surface-variant">
          We reply within 24 hours. In the meantime, feel free to{" "}
          <a className="text-accent underline" href="/appointments">book a call</a>.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      <div className="grid sm:grid-cols-2 gap-5">
        <Field name="name" label="Name" required />
        <Field name="email" label="Email" type="email" required />
      </div>
      <div className="grid sm:grid-cols-2 gap-5">
        <Field name="company" label="Company" />
        <Field name="phone" label="Phone" />
      </div>
      <label className="block text-sm font-medium">
        <span className="block mb-2">How can we help?</span>
        <textarea
          name="message"
          required
          rows={6}
          className="w-full border border-outline-variant/40 rounded-xl px-4 py-3 outline-none focus:border-primary"
        />
      </label>
      <button
        className="bg-primary text-on-primary px-8 py-4 rounded-[2px] font-label font-semibold text-xs tracking-[0.16em] uppercase w-fit hover:opacity-90 transition flex items-center gap-2"
        disabled={status === "submitting"}
      >
        {status === "submitting" ? "Sending…" : "Send message"}
        <span className="material-symbols-outlined">arrow_forward</span>
      </button>
      {errorMsg ? <p className="text-sm text-red-600">{errorMsg}</p> : null}
    </form>
  );
}

function Field({
  name, label, type = "text", required = false
}: { name: string; label: string; type?: string; required?: boolean }) {
  return (
    <label className="block text-sm font-medium">
      <span className="block mb-2">
        {label}{required ? " *" : ""}
      </span>
      <input
        type={type}
        name={name}
        required={required}
        className="w-full border border-outline-variant/40 rounded-xl px-4 py-3 outline-none focus:border-primary"
      />
    </label>
  );
}
