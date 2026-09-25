import { clientKey, error, rateLimit, timingSafeEqual, type Ctx } from "../../../server/lib";

// Every /api/admin/* request needs "Authorization: Bearer <ADMIN_TOKEN>".
// For defense in depth, also protect /admin and /api/admin/* with Cloudflare Access.
export const onRequest = async (ctx: Ctx) => {
  const { request, env } = ctx;
  if (!env.ADMIN_TOKEN || env.ADMIN_TOKEN.length < 24) return error("Admin is not configured. Set a long ADMIN_TOKEN secret (24+ characters).", 503);
  if (!env.DB) return error("Database is not configured. Bind a D1 database named DB.", 503);
  const key = "adm:" + (await clientKey(request, env));
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token || !timingSafeEqual(token, env.ADMIN_TOKEN)) {
    if (!(await rateLimit(env, key, 10, 900))) return error("Too many attempts. Try again in 15 minutes.", 429);
    return error("Unauthorized.", 401);
  }
  try {
    return await ctx.next();
  } catch (e: any) {
    // Authenticated admins get the real reason, which makes setup problems easy to fix.
    const msg = String(e?.message || e);
    if (/no such table/i.test(msg)) return error("Database tables are missing. Open D1 → solveit → Console, paste schema.sql and click Execute.", 500);
    return error("Server error: " + msg.slice(0, 300), 500);
  }
};
