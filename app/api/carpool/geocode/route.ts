import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

// Turns a typed address into a pin, via OpenStreetMap's Nominatim.
//
// Proxied rather than called from the browser so we can send the identifying
// User-Agent their usage policy requires, and so the endpoint can be limited to
// signed-in users. It is used a handful of times per family — once, when a
// parent sets up their stop. The reliable path is still "stand outside and tap
// Use my location"; this is the convenience option.

const ENDPOINT = "https://nominatim.openstreetmap.org/search";

export async function GET(req: NextRequest) {
  const sb = await createSupabaseServer();
  const {
    data: { user }
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "not signed in" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 3) return NextResponse.json({ error: "address too short" }, { status: 400 });

  try {
    const url = `${ENDPOINT}?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          process.env.GEOCODER_USER_AGENT || "AventaryCarpool/1.0 (+https://aventary.com)",
        Accept: "application/json"
      }
    });
    if (!res.ok) return NextResponse.json({ error: "lookup failed" }, { status: 502 });

    const results = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
    const hit = results[0];
    if (!hit) return NextResponse.json({ error: "no match" }, { status: 404 });

    return NextResponse.json({
      lat: Number(hit.lat),
      lng: Number(hit.lon),
      label: hit.display_name
    });
  } catch {
    return NextResponse.json({ error: "lookup failed" }, { status: 502 });
  }
}
