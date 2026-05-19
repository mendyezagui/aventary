import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdmin } from "@/lib/supabase/server";

const Schema = z.object({
  email: z.string().email().max(254).transform((e) => e.trim().toLowerCase()),
  source: z.string().max(64).optional()
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid email" }, { status: 400 });
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "subscribe service not configured" },
      { status: 503 }
    );
  }

  const supabase = createSupabaseAdmin();

  // Upsert by email — re-subscribing flips status back to active and
  // refreshes the unsubscribe_token so old unsubscribe links stop working.
  const { error } = await supabase.from("intelligence_subscribers").upsert(
    {
      email: parsed.data.email,
      status: "active",
      source: parsed.data.source ?? "intelligence_page",
      unsubscribe_token: crypto.randomUUID()
    },
    { onConflict: "email" }
  );

  if (error) {
    // eslint-disable-next-line no-console
    console.error("[intelligence/subscribe]", error);
    return NextResponse.json({ error: "could not save subscription" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
