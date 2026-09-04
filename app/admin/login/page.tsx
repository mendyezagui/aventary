"use client";
import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";

/** Centred column the sign-in card sits in, shared by every state below. */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col justify-center py-16 md:py-24">
      {children}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-black/10 bg-white p-8 soft-lift md:p-10">{children}</div>
  );
}

function Mark() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="26"
      height="26"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinejoin="round"
      aria-hidden="true"
      className="mb-6"
    >
      <path d="M12 3.5 L19.5 20.5 L4.5 20.5 Z" />
      <path d="M12 3.5 L12 13.5" />
    </svg>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);

  // Implicit-flow magic links (admin generate_link, OAuth) carry the session
  // in the URL hash: #access_token=...&refresh_token=... Parse them and call
  // setSession to write the auth cookies, then forward to /admin.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.location.hash.includes("access_token=")) return;
    const params = new URLSearchParams(window.location.hash.substring(1));
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    if (!access_token || !refresh_token) return;
    setBootstrapping(true);
    const sb = createSupabaseBrowser();
    sb.auth
      .setSession({ access_token, refresh_token })
      .then((res: { error: { message: string } | null }) => {
        if (res.error) {
          setErr(res.error.message);
          setBootstrapping(false);
          return;
        }
        const next = new URLSearchParams(window.location.search).get("next") || "/admin";
        window.history.replaceState(null, "", window.location.pathname);
        window.location.replace(next);
      });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setPending(true);
    const sb = createSupabaseBrowser();
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/admin` }
    });
    setPending(false);
    if (error) setErr(error.message);
    else setSent(true);
  }

  if (bootstrapping) {
    return (
      <Shell>
        <Card>
          <Mark />
          <h1 className="font-heading text-2xl font-bold">Signing you in…</h1>
          <p className="mt-2 text-sm text-[color:var(--muted)]">One moment.</p>
        </Card>
      </Shell>
    );
  }

  return (
    <Shell>
      <Card>
        <Mark />
        <h1 className="font-heading text-3xl font-bold tracking-tight">Admin sign in</h1>

        {sent ? (
          <>
            <p className="mt-3 leading-relaxed text-[color:var(--muted)]">
              We sent a magic link to <span className="font-medium text-black">{email}</span>.
              Open it on this device to finish signing in.
            </p>
            <button
              type="button"
              onClick={() => setSent(false)}
              className="btn btn-ghost mt-8"
            >
              Use a different email
            </button>
          </>
        ) : (
          <>
            <p className="mt-3 leading-relaxed text-[color:var(--muted)]">
              Enter your admin email and we&apos;ll send you a magic link.
            </p>
            <form onSubmit={submit} className="mt-8 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium">Email</span>
                <input
                  type="email"
                  required
                  autoFocus
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@aventary.com"
                  className="w-full rounded-lg border border-black/20 bg-white px-4 py-3 outline-none transition-colors focus:border-black"
                />
              </label>
              <button className="btn btn-primary w-full" disabled={pending}>
                {pending ? "Sending…" : "Send magic link"}
              </button>
              {err ? (
                <p role="alert" className="text-sm text-red-600">
                  {err}
                </p>
              ) : null}
            </form>
          </>
        )}
      </Card>

      <p className="mt-6 text-center text-xs text-[color:var(--muted)]">
        Access is limited to allowlisted Aventary admins.
      </p>
    </Shell>
  );
}
