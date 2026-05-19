import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";

function htmlPage(title: string, body: string) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet">
  <style>
    html, body { margin:0; padding:0; background:#f8f9ff; color:#0b1c30; font-family: 'Hanken Grotesk', system-ui, sans-serif; }
    main { max-width: 560px; margin: 80px auto; padding: 32px 24px; }
    .card { background:#ffffff; border:1px solid #ccc3d7; border-radius:8px; padding:32px; }
    .eyebrow { font-family:'JetBrains Mono', monospace; font-size:11px; letter-spacing:0.08em; text-transform:uppercase; color:#4a4455; margin-bottom:12px; }
    h1 { font-size:28px; font-weight:700; letter-spacing:-0.02em; margin:0 0 12px; line-height:36px; }
    p { font-size:15px; line-height:22px; color:#4a4455; margin:0 0 16px; }
    a { color:#5300b7; font-weight:600; text-decoration:none; }
    a:hover { text-decoration:underline; }
  </style>
</head>
<body>
  <main>
    <div class="card">
      <div class="eyebrow">Aventary Morning Brief</div>
      ${body}
    </div>
  </main>
</body>
</html>`;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return new NextResponse(
      htmlPage(
        "Missing token — Aventary",
        `<h1>Missing token.</h1>
         <p>This unsubscribe link is malformed. <a href="/intelligence">Back to the brief →</a></p>`
      ),
      { status: 400, headers: { "content-type": "text/html; charset=utf-8" } }
    );
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return new NextResponse(
      htmlPage(
        "Service unavailable — Aventary",
        `<h1>Subscription service unavailable.</h1>
         <p>Try again in a moment, or email mendy@aventary.com and I'll remove you manually.</p>`
      ),
      { status: 503, headers: { "content-type": "text/html; charset=utf-8" } }
    );
  }

  const supabase = createSupabaseAdmin();

  const { data, error } = await supabase
    .from("intelligence_subscribers")
    .update({ status: "unsubscribed" })
    .eq("unsubscribe_token", token)
    .select("email")
    .maybeSingle();

  if (error) {
    // eslint-disable-next-line no-console
    console.error("[intelligence/unsubscribe]", error);
    return new NextResponse(
      htmlPage(
        "Something went wrong — Aventary",
        `<h1>Something went wrong.</h1>
         <p>Try the link again, or email mendy@aventary.com.</p>`
      ),
      { status: 500, headers: { "content-type": "text/html; charset=utf-8" } }
    );
  }

  if (!data) {
    return new NextResponse(
      htmlPage(
        "Already unsubscribed — Aventary",
        `<h1>You're already unsubscribed.</h1>
         <p>This link has already been used. <a href="/intelligence">Visit the brief on the web →</a></p>`
      ),
      { status: 200, headers: { "content-type": "text/html; charset=utf-8" } }
    );
  }

  return new NextResponse(
    htmlPage(
      "Unsubscribed — Aventary",
      `<h1>You're unsubscribed.</h1>
       <p><strong>${data.email}</strong> won't receive any more Morning Briefs by email.</p>
       <p>You can still read it on the web any time at <a href="/intelligence">aventary.com/intelligence →</a></p>`
    ),
    { status: 200, headers: { "content-type": "text/html; charset=utf-8" } }
  );
}
