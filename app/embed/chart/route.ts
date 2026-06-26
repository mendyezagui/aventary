export const runtime = "edge";

export async function GET() {
          return new Response(null, {
                      status: 302,
                      headers: { Location: "https://uclyawqdeabjsrejfdlw.supabase.co/functions/v1/hype-cycle?html" },
          });
}
