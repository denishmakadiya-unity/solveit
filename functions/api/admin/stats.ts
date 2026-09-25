import { json, type Ctx } from "../../../server/lib";

export const onRequestGet = async ({ request, env }: Ctx) => {
  const db = env.DB!;
  const days = Math.min(365, Math.max(1, Number(new URL(request.url).searchParams.get("days")) || 30));
  const since = Date.now() - days * 864e5;
  const q = (sql: string) => db.prepare(sql).bind(since);

  const [counts, sess, daily, tools, workflows, searches, clicks, missing, errors, ai] = await db.batch([
    q("SELECT e, COUNT(*) AS n FROM events WHERE ts > ? GROUP BY e"),
    q("SELECT COUNT(DISTINCT s) AS n FROM events WHERE ts > ?"),
    q(`SELECT day AS d, COUNT(DISTINCT s) AS sessions, SUM(e IN ('tool_success','workflow_success')) AS success
       FROM events WHERE ts > ? GROUP BY day ORDER BY day`),
    q(`SELECT t AS tool, SUM(e='tool_view') AS views, SUM(e='tool_start') AS starts, SUM(e='tool_success') AS success,
       SUM(e='tool_error') AS errors, SUM(e='tool_download') AS downloads FROM events WHERE ts > ? AND t IS NOT NULL GROUP BY t ORDER BY starts DESC`),
    q(`SELECT w AS workflow, SUM(e='workflow_start') AS starts, SUM(e='workflow_success') AS success, SUM(e='workflow_error') AS errors
       FROM events WHERE ts > ? AND w IS NOT NULL AND e LIKE 'workflow_%' GROUP BY w ORDER BY success DESC LIMIT 100`),
    q(`SELECT q, COUNT(*) AS n FROM events WHERE ts > ? AND e IN ('search_submit','solve_submit') AND q IS NOT NULL AND q <> '' GROUP BY q ORDER BY n DESC LIMIT 100`),
    q(`SELECT q, COUNT(*) AS n FROM events WHERE ts > ? AND e = 'search_result_click' AND q IS NOT NULL GROUP BY q`),
    q(`SELECT q, COUNT(*) AS n, MAX(ts) AS last FROM events WHERE ts > ? AND e = 'search_no_result' AND q IS NOT NULL GROUP BY q ORDER BY n DESC LIMIT 100`),
    q(`SELECT COALESCE(t, w) AS tool, COALESCE(m, '') AS meta, COUNT(*) AS n, MAX(ts) AS last FROM events
       WHERE ts > ? AND e IN ('tool_error','workflow_error') GROUP BY COALESCE(t, w), m ORDER BY n DESC LIMIT 100`),
    q(`SELECT e, m AS task, COUNT(*) AS n FROM events WHERE ts > ? AND e IN ('ai_call','ai_error') GROUP BY e, m`),
  ]);

  const c: Record<string, number> = {};
  for (const r of counts.results) c[r.e] = r.n;
  const clickMap = new Map<string, number>(clicks.results.map((r: any) => [r.q, r.n]));
  const aiRows = ai.results as { e: string; task: string; n: number }[];

  return json({
    days,
    totals: {
      sessions: sess.results[0]?.n || 0,
      pageViews: c.page_view || 0,
      toolStarts: c.tool_start || 0,
      toolSuccess: c.tool_success || 0,
      errors: (c.tool_error || 0) + (c.workflow_error || 0),
      downloads: c.tool_download || 0,
      searches: (c.search_submit || 0) + (c.solve_submit || 0),
      searchClicks: c.search_result_click || 0,
      workflowStarts: c.workflow_start || 0,
      workflowSuccess: c.workflow_success || 0,
    },
    daily: daily.results,
    tools: tools.results,
    workflows: workflows.results,
    searches: searches.results.map((r: any) => ({ ...r, clicks: clickMap.get(r.q) || 0 })),
    missing: missing.results,
    errors: errors.results,
    ai: {
      calls: aiRows.filter((r) => r.e === "ai_call").reduce((a, r) => a + r.n, 0),
      errors: aiRows.filter((r) => r.e === "ai_error").reduce((a, r) => a + r.n, 0),
      byTask: aiRows.filter((r) => r.e === "ai_call").map((r) => ({ task: r.task, n: r.n })),
    },
  });
};
