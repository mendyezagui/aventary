// Static health check.
//
// Something — almost certainly an uptime monitor — polls /api/status a few
// thousand times a day. With no route here, every one of those hits fell
// through to Next's 404 handler, which renders through a function and bills
// Fluid Active CPU on each poll (it was the single largest CPU consumer in the
// Vercel observability panel).
//
// `force-static` makes Vercel evaluate this once at build time and serve the
// response from the edge cache, so the constant polling costs no function
// invocation at all. Returning 200 also means a health check pointed here now
// passes instead of erroring on the old 404.
export const dynamic = "force-static";

export function GET() {
  return Response.json({ status: "ok" });
}
