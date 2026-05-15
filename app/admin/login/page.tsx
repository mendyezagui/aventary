      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/admin` }

import { useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const sb = createSupabaseBrowser();
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/admin` }
    });
    if (error) setErr(error.message);
    else setSent(true);
  }

  return (
    <div className="container-site max-w-md py-24">
      <h1 className="text-3xl font-bold">Admin sign in</h1>
      <p className="mt-2 text-[color:var(--muted)]">
        Enter your admin email. We'll send you a magic link.
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
