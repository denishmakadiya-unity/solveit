import { error, type Ctx } from "../../server/lib";

// Applies to every /api/* request: method allow-list, same-origin check for writes, security headers.
export const onRequest = async (ctx: Ctx) => {
  const { request } = ctx;
  const method = request.method.toUpperCase();
  if (!["GET", "POST", "PUT", "OPTIONS"].includes(method)) return error("Method not allowed.", 405);
  if (method === "OPTIONS") return new Response(null, { status: 204 });

  if (method !== "GET") {
    const origin = request.headers.get("origin");
    const host = new URL(request.url).host;
    if (origin && new URL(origin).host !== host) return error("Cross-origin requests are not allowed.", 403);
    const ct = request.headers.get("content-type") || "";
    if (!ct.includes("application/json") && !ct.includes("text/plain")) return error("Unsupported content type.", 415);
  }

  let res: Response;
  try {
    res = await ctx.next();
  } catch (e: any) {
    res = error(e?.status ? e.message : "Something went wrong. Please try again.", e?.status || 500);
  }
  const out = new Response(res.body, res);
  out.headers.set("x-content-type-options", "nosniff");
  out.headers.set("x-robots-tag", "noindex");
  if (!out.headers.has("cache-control")) out.headers.set("cache-control", "no-store");
  return out;
};
