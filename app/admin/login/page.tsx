"use client";
import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [bootstrapping, setBootstrapping] = useState(false);

  // Implicit-flow magic links (admin-generated, OAuth) carry the session in
  // the URL hash: #access_token=...&refresh_token=... The supabase client is
  // only created in submit(), so detectSessionInUrl normally never runs on
  // page load. Initializing here picks up the hash, sets session cookies,
  // and forwards to /admin.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.location.hash.includes("access_token=")) return;
    setBootstrapping(true);
    const sb = createSupabaseBrowser();
    sb.auth.getSession().then(({ data, error }) => {
      if (error) {
        setErr(error.message);
        setBootstrapping(false);
        return;
      }
      if (data.session) {
        const next = new URLSearchParams(window.location.search).get("next") || "/admin";
        window.history.replaceState(null, "", window.location.pathname);
        window.location.replace(next);
      } else {
        setBootstrapping(false);
      }
    });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const sb = createSupabaseBrowser();
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/admin` }
    });
    if (error) setErr(error.message);
    else setSent(true);
  }

  if (bootstrapping) {
    return (
      <div className="container-site max-w-md py-24">
        <p className="text-[color:var(--muted)]">Signing you in…</p>
      </div>
    );
  }

  return (
    <div className="container-site max-w-md py-24">
      <h1 className="text-3xl font-bold">Admin sign in</h1>
      <p className="mt-2 text-[color:var(--muted)]">
        Enter your admin email. We&apos;ll send you a magic link.
      </p>
      {sent ? (
        <p className="mt-8 border border-black/20 p-4">Check your inbox for a link.</p>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-4">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@aventary.com"
            className="w-full border border-black/20 bg-white px-4 py-3 outline-none focus:border-black"
          />
          <button className="btn btn-primary">Send magic link</button>
          {err ? <p className="text-sm text-red-600">{err}</p> : null}
        </form>
      )}
    </div>
  );
}
