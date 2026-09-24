"use client";

import { useState, type FormEvent } from "react";

export default function TrainingInquiryForm() {
  const [status, setStatus] = useState<"idle" | "submitting" | "sent" | "error">("idle");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Training inquiry",
          message: data.get("message"),
          email: data.get("email"),
          source: "training"
        })
      });
      if (!response.ok) throw new Error("Submission failed");
      form.reset();
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div role="status" className="rounded-3xl border border-outline-variant/50 bg-surface p-6">
        <p className="font-headline text-2xl font-bold mb-3">Thanks. We got it.</p>
        <p className="text-on-surface-variant mb-4">Want to talk it through? Grab a time.</p>
        <a href="https://calendly.com/mendy-aventary" className="inline-flex items-center rounded-full bg-primary text-on-primary px-6 py-3 font-bold">Open Mendy&apos;s calendar</a>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-5">
      <label className="block text-sm font-medium">
        <span className="block mb-2">The thing you&apos;re stuck on</span>
        <textarea name="message" required maxLength={5000} rows={5} className="w-full border border-outline-variant/40 rounded-xl bg-surface px-4 py-3 outline-none focus:border-primary" />
      </label>
      <label className="block text-sm font-medium">
        <span className="block mb-2">Where should I send the answer? (email)</span>
        <input name="email" type="email" required maxLength={200} className="w-full border border-outline-variant/40 rounded-xl bg-surface px-4 py-3 outline-none focus:border-primary" />
      </label>
      <button type="submit" disabled={status === "submitting"} className="w-fit rounded-full bg-primary text-on-primary px-7 py-4 font-bold disabled:opacity-60">
        {status === "submitting" ? "Sending…" : "Send it"}
      </button>
      {status === "error" && <p role="alert" className="text-sm text-red-700">That didn&apos;t go through. Please try again.</p>}
    </form>
  );
}
