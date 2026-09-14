// What import-rows is redeployed as once the move is finished. The Supabase MCP
// surface has no delete-function call, so the way to take an endpoint out of
// service is to replace its body with one that cannot do anything.
Deno.serve(() =>
  new Response(
    JSON.stringify({
      error: "gone",
      detail: "import-rows was a one-shot used to move the social/content tables on 2026-09-11. It is retired.",
    }),
    { status: 410, headers: { "Content-Type": "application/json" } },
  )
);
