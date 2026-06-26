export const runtime = "edge";

export async function GET() {
    const res = await fetch(
    "https://uclyawqdeabjsrejfdlw.supabase.co/functions/v1/hype-cycle?html"
  );
  return new Response(await res.text(), {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=300",
    },
    });
}
