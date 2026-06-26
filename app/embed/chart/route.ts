import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET() {
      const res = await fetch(
              "https://uclyawqdeabjsrejfdlw.supabase.co/functions/v1/hype-cycle?html"
            );
      const html = await res.text();
      return new NextResponse(html, {
              status: 200,
              headers: {
                        "Content-Type": "text/html; charset=utf-8",
                        "Cache-Control": "public, max-age=300",
              },
      });
}
