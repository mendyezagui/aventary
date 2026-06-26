export const runtime = "edge";

export async function GET() {
        const upstream = await fetch(
                  "https://uclyawqdeabjsrejfdlw.supabase.co/functions/v1/hype-cycle?html"
                );
        return new Response(upstream.body, {
                  status: 200,
                  headers: new Headers([
                              ["content-type", "text/html; charset=utf-8"],
                              ["cache-control", "public, max-age=300"],
                            ]),
        });
}
