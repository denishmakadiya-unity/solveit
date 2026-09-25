import { clean, clientKey, getSettings, logEvent, rateLimit, readJson, type Ctx } from "../../server/lib";

const ALLOWED = new Set([
  "tool_view", "tool_start", "tool_success", "tool_error", "tool_download", "search_submit", "search_result_click", "search_no_result",
  "workflow_start", "workflow_success", "workflow_error", "workflow_step_added", "workflow_step_removed", "related_tool_click", "page_view", "solve_submit",
]);
const ID = /^[a-z0-9-]{1,60}$/;

// Anonymous product analytics. Never receives file contents or typed text (search queries only).
export const onRequestPost = async ({ request, env, waitUntil }: Ctx) => {
  const ok = new Response(null, { status: 204 });
  if (!env.DB) return ok;
  const body = await readJson<any>(request, 4_000).catch(() => null);
  if (!body || !ALLOWED.has(body.e)) return ok;
  const settings = await getSettings(env);
  if (!settings.flags.analyticsEnabled) return ok;
  if (!(await rateLimit(env, "t:" + (await clientKey(request, env)), 300, 600))) return ok;
  await logEvent(env, body.e, {
    t: typeof body.t === "string" && ID.test(body.t) ? body.t : undefined,
    w: typeof body.w === "string" && ID.test(body.w) ? body.w : undefined,
    q: clean(body.q, 120)?.toLowerCase(),
    v: Number.isFinite(body.v) ? Math.max(0, Math.min(1e9, Math.round(body.v))) : undefined,
    m: clean(body.m, 80),
    p: clean(body.p, 120),
    s: typeof body.s === "string" ? body.s.slice(0, 40) : undefined,
  });
  // Opportunistic housekeeping: keep 180 days of events, drop expired rate-limit rows.
  if (Math.random() < 0.01) {
    const job = env.DB.batch([
      env.DB.prepare("DELETE FROM events WHERE ts < ?").bind(Date.now() - 180 * 864e5),
      env.DB.prepare("DELETE FROM rate_limits WHERE exp < ?").bind(Date.now()),
    ]).catch(() => {});
    waitUntil ? waitUntil(job) : await job;
  }
  return ok;
};
