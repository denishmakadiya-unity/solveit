import { useEffect, useState } from "react";
import { Icon } from "../components/Icon";
import { Alert, Field, Toggle, toast } from "../components/ui";
import { TOOLS, toolById, toolHref } from "../registry/tools";
import { WORKFLOWS } from "../registry/workflows";
import { CATEGORIES } from "../registry/categories";
import { TEMPLATE_CATEGORIES, workflowsForAudience } from "../registry/templates";
import { GUIDES } from "../registry/guides";
import { ADSENSE_CLIENT, DEFAULT_FLAGS, SITE, type FeatureFlags } from "../config";
import { num, timeAgo } from "../lib/format";

type Stats = {
  days: number;
  totals: Record<string, number>;
  daily: { d: string; sessions: number; success: number }[];
  tools: { tool: string; views: number; starts: number; success: number; errors: number; downloads: number }[];
  workflows: { workflow: string; starts: number; success: number; errors: number }[];
  searches: { q: string; n: number; clicks: number }[];
  missing: { q: string; n: number; last: number }[];
  errors: { tool: string; meta: string; n: number; last: number }[];
  ai: { calls: number; errors: number; byTask: { task: string; n: number }[] };
};
type Settings = { flags: FeatureFlags; disabledTools: string[]; adsenseClient: string; aiConfigured?: boolean };
type Message = { id: number; ts: number; name: string; email: string; topic: string; message: string };

const SECTIONS = [
  ["overview", "Overview", "chart"], ["tools", "Tool Management", "grid"], ["categories", "Categories", "layers"], ["workflows", "Workflows", "workflow"],
  ["templates", "Templates", "book"], ["search", "Search Analytics", "search"], ["missing", "Missing Tools", "search-x"], ["seo", "SEO", "globe"],
  ["ads", "Ads", "megaphone"], ["revenue", "Revenue", "rupee"], ["ai", "AI Usage", "bot"], ["errors", "Errors", "alert"], ["messages", "Messages", "mail"],
  ["flags", "Feature Flags", "toggle"], ["settings", "Settings", "settings"],
] as const;
type Section = (typeof SECTIONS)[number][0];

function sample(): { stats: Stats; settings: Settings; messages: Message[] } {
  const now = Date.now();
  const tools = TOOLS.map((t, i) => { const v = Math.round(4000 / (i + 1.4)); const s = Math.round(v * 0.62); return { tool: t.id, views: v, starts: Math.round(v * 0.7), success: s, errors: Math.round(s * 0.02), downloads: Math.round(s * 0.85) }; });
  return {
    stats: {
      days: 30,
      totals: { sessions: 18420, pageViews: 52310, toolStarts: 21240, toolSuccess: 19870, errors: 312, downloads: 16420, searches: 7340, searchClicks: 5120, workflowStarts: 3120, workflowSuccess: 2890 },
      daily: Array.from({ length: 30 }, (_, i) => ({ d: new Date(now - (29 - i) * 864e5).toISOString().slice(0, 10), sessions: Math.round(420 + i * 11 + Math.sin(i) * 60), success: Math.round(430 + i * 12 + Math.cos(i) * 50) })),
      tools,
      workflows: WORKFLOWS.slice(0, 12).map((w, i) => ({ workflow: w.slug, starts: Math.round(900 / (i + 1)), success: Math.round(840 / (i + 1)), errors: Math.round(8 / (i + 1)) })),
      searches: [["compress pdf", 812, 740], ["pdf chhota karna hai", 403, 371], ["resize photo", 390, 322], ["emi calculator", 344, 330], ["photo 50kb", 287, 240], ["jpg to pdf", 266, 250], ["qr code upi", 198, 180]].map(([q, n, c]) => ({ q: q as string, n: n as number, clicks: c as number })),
      missing: [["heic to pdf", 4281], ["pdf to word", 2980], ["video compressor", 1760], ["unlock pdf", 940], ["mp3 cutter", 610]].map(([q, n], i) => ({ q: q as string, n: n as number, last: now - i * 3600e3 })),
      errors: [{ tool: "compress-pdf", meta: "This PDF is password-protected.", n: 120, last: now - 3e6 }, { tool: "image-converter", meta: "Your browser can't save WebP.", n: 18, last: now - 9e6 }],
      ai: { calls: 0, errors: 0, byTask: [] },
    },
    settings: { flags: { ...DEFAULT_FLAGS }, disabledTools: [], adsenseClient: "", aiConfigured: false },
    messages: [{ id: 1, ts: now - 7200e3, name: "Sample user", email: "user@example.com", topic: "tool-request", message: "Please add HEIC to PDF — my iPhone photos don't work." }],
  };
}

function Bars({ data, k }: { data: { d: string; [k: string]: any }[]; k: string }) {
  const max = Math.max(1, ...data.map((x) => x[k]));
  return (
    <div>
      <div className="spark-bars" role="img" aria-label={`Daily ${k}`}>{data.map((x) => <i key={x.d} title={`${x.d}: ${x[k]}`} style={{ height: `${(x[k] / max) * 100}%` }} />)}</div>
      <div className="row between muted" style={{ fontSize: "0.76rem", marginTop: 4 }}><span>{data[0]?.d}</span><span>{data[data.length - 1]?.d}</span></div>
    </div>
  );
}

export function AdminPage() {
  const [token, setToken] = useState("");
  const [authed, setAuthed] = useState(false);
  const [demo, setDemo] = useState(false);
  const [err, setErr] = useState("");
  const [sec, setSec] = useState<Section>("overview");
  const [days, setDays] = useState(30);
  const [stats, setStats] = useState<Stats>();
  const [settings, setSettings] = useState<Settings>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  // "boot" is true until we know whether a saved session exists — avoids flashing the sign-in form on refresh.
  const [boot, setBoot] = useState(true);

  useEffect(() => {
    const h = location.hash.slice(1);
    if (SECTIONS.some(([id]) => id === h)) setSec(h as Section);
    let t = "";
    try { t = sessionStorage.getItem("solveit:admin") || ""; } catch { /* ignore */ }
    if (t) { setToken(t); login(t).finally(() => setBoot(false)); } else setBoot(false);
  }, []);
  const go = (id: Section) => { setSec(id); try { history.replaceState(null, "", "#" + id); } catch { /* ignore */ } };

  const api = async (path: string, init?: RequestInit, t = token) => {
    const res = await fetch(`/api/admin/${path}`, { ...init, headers: { ...(init?.headers || {}), authorization: `Bearer ${t}`, "content-type": "application/json" } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data.error || `Request failed (${res.status})`), { status: res.status });
    return data;
  };
  const loadAll = async (t = token, d = days) => {
    setLoading(true);
    try {
      const [s, st, m] = await Promise.all([api(`stats?days=${d}`, undefined, t), api("settings", undefined, t), api("messages", undefined, t)]);
      setStats(s); setSettings(st); setMessages(m.messages || []);
    } finally { setLoading(false); }
  };
  const login = async (t: string) => {
    setErr("");
    try {
      await loadAll(t);
      setAuthed(true);
      try { sessionStorage.setItem("solveit:admin", t); } catch { /* ignore */ }
    } catch (e: any) {
      setErr(e.status === 401 ? "That admin token isn't valid." : e.status === 404 || e instanceof TypeError ? "The admin API isn't reachable. Check that the latest deploy succeeded and the D1 database is bound as DB." : e.message);
      try { sessionStorage.removeItem("solveit:admin"); } catch { /* ignore */ }
    }
  };
  const deleteMessage = async (id: number) => {
    if (!window.confirm("Delete this message?")) return;
    setMessages((list) => list.filter((m) => m.id !== id));
    if (demo) return;
    try { await api("messages", { method: "POST", body: JSON.stringify({ delete: id }) }); toast("Message deleted"); } catch (e: any) { toast(e.message); loadAll(); }
  };
  const exportCsv = () => {
    const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = [["Tool", "Views", "Starts", "Success", "Errors", "Downloads"], ...TOOLS.map((t) => { const s = stats?.tools.find((x) => x.tool === t.id); return [t.name, s?.views ?? 0, s?.starts ?? 0, s?.success ?? 0, s?.errors ?? 0, s?.downloads ?? 0]; })];
    const url = URL.createObjectURL(new Blob([rows.map((r) => r.map(esc).join(",")).join("\n")], { type: "text/csv" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `solveit-tools-${days}d.csv` });
    a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const useDemo = () => { const s = sample(); setStats(s.stats); setSettings(s.settings); setMessages(s.messages); setDemo(true); setAuthed(true); };
  const saveSettings = async (next: Settings) => {
    setSettings(next);
    if (demo) return toast("Sample mode — settings aren't saved");
    try { await api("settings", { method: "PUT", body: JSON.stringify(next) }); toast("Settings saved"); } catch (e: any) { toast(e.message); }
  };

  if (boot && !authed) {
    return (
      <div className="container narrow" style={{ paddingBlock: 96, textAlign: "center" }} aria-busy="true">
        <Icon name="repeat2" size={28} className="spin" />
        <p className="muted" style={{ marginTop: 12 }}>Loading dashboard…</p>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="container narrow" style={{ paddingBlock: 56 }}>
        <div className="card pad-lg stack" style={{ maxWidth: 460, margin: "0 auto" }}>
          <span className="tile-icon lg"><Icon name="lock" size={24} /></span>
          <h1 style={{ fontSize: "1.7rem" }}>Admin dashboard</h1>
          <p className="muted">Enter the admin token you set as <code>ADMIN_TOKEN</code> in Cloudflare. For stronger protection, also put <code>/admin</code> and <code>/api/admin/*</code> behind Cloudflare Access.</p>
          <form className="stack" onSubmit={(e) => { e.preventDefault(); login(token); }}>
            <input className="input" type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Admin token" aria-label="Admin token" autoComplete="current-password" />
            <button className="btn btn-primary" type="submit" disabled={!token}>Sign in</button>
          </form>
          {err && <Alert kind="err">{err}</Alert>}
          <button className="btn btn-ghost btn-sm" onClick={useDemo}>Preview with sample data</button>
        </div>
      </div>
    );
  }

  const T = stats!.totals;
  const completion = T.toolStarts ? (T.toolSuccess / T.toolStarts) * 100 : 0;
  return (
    <div className="container" style={{ paddingBlock: 28 }}>
      <div className="row between" style={{ marginBottom: 20 }}>
        <div><h1 style={{ fontSize: "1.8rem" }}>Admin</h1><p className="muted">Real usage and search data — the roadmap for new tools.</p></div>
        <div className="row">
          {demo && <span className="badge warn">Sample data</span>}
          <select className="select" style={{ width: 150 }} value={days} onChange={(e) => { const d = +e.target.value; setDays(d); if (!demo) loadAll(token, d); }} aria-label="Period">
            <option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option>
          </select>
          {!demo && <button className="btn btn-secondary btn-sm" onClick={() => loadAll()} disabled={loading}><Icon name="repeat2" size={14} /> Refresh</button>}
          <button className="btn btn-ghost btn-sm" onClick={() => { try { sessionStorage.removeItem("solveit:admin"); } catch { /* */ } location.reload(); }}><Icon name="logout" size={14} /> Sign out</button>
        </div>
      </div>
      <div className="admin-shell">
        <nav className="admin-nav" aria-label="Admin sections">
          {SECTIONS.map(([id, label, icon]) => <button key={id} aria-current={sec === id} onClick={() => go(id)}><Icon name={icon} size={16} /> {label}</button>)}
        </nav>
        <div className="stack" style={{ minWidth: 0 }}>
          {sec === "overview" && (
            <>
              <div className="stat-grid">
                {[["Visitors", T.sessions], ["Page views", T.pageViews], ["Tool starts", T.toolStarts], ["Successful completions", T.toolSuccess], ["Completion rate", `${num(completion, 1)}%`], ["Errors", T.errors], ["Downloads", T.downloads], ["Searches", T.searches], ["Search clicks", T.searchClicks], ["Workflow runs", T.workflowSuccess]].map(([k, v]) => (
                  <div key={k as string} className="stat"><div className="k">{k}</div><div className="v">{typeof v === "number" ? v.toLocaleString("en-IN") : v}</div></div>
                ))}
              </div>
              <div className="grid grid-2">
                <div className="card"><h3 style={{ marginBottom: 12 }}>Daily visitors</h3><Bars data={stats!.daily} k="sessions" /></div>
                <div className="card"><h3 style={{ marginBottom: 12 }}>Daily successful completions</h3><Bars data={stats!.daily} k="success" /></div>
              </div>
              <div className="grid grid-2">
                <div className="card"><h3 style={{ marginBottom: 12 }}>Top workflows</h3><SimpleTable rows={stats!.workflows.slice(0, 6).map((w) => [w.workflow, w.success])} head={["Workflow", "Runs"]} /></div>
                <div className="card"><h3 style={{ marginBottom: 12 }}>Missing-tool searches</h3><SimpleTable rows={stats!.missing.slice(0, 6).map((m) => [m.q, m.n])} head={["Search", "Count"]} /></div>
              </div>
            </>
          )}
          {sec === "tools" && settings && (
            <div className="card">
              <div className="row between"><h3 style={{ marginBottom: 6 }}>Tool management</h3><button className="btn btn-secondary btn-sm" onClick={exportCsv}><Icon name="download" size={14} /> Export CSV</button></div>
              <p className="hint" style={{ marginBottom: 12 }}>Turn a tool off to show a “temporarily unavailable” notice without redeploying. Tools are added in <code>src/registry/tools.ts</code>.</p>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Tool</th><th className="num">Views</th><th className="num">Starts</th><th className="num">Success</th><th className="num">Errors</th><th className="num">Downloads</th><th>Enabled</th></tr></thead>
                  <tbody>
                    {TOOLS.map((t) => {
                      const s = stats!.tools.find((x) => x.tool === t.id);
                      const on = !settings.disabledTools.includes(t.id);
                      return (
                        <tr key={t.id}>
                          <td><a href={toolHref(t)} target="_blank" rel="noopener">{t.name}</a></td>
                          <td className="num">{s?.views ?? 0}</td><td className="num">{s?.starts ?? 0}</td><td className="num">{s?.success ?? 0}</td><td className="num">{s?.errors ?? 0}</td><td className="num">{s?.downloads ?? 0}</td>
                          <td><Toggle label={`${t.name} enabled`} checked={on} onChange={(v) => saveSettings({ ...settings, disabledTools: v ? settings.disabledTools.filter((x) => x !== t.id) : [...settings.disabledTools, t.id] })} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {sec === "categories" && (
            <div className="card"><h3 style={{ marginBottom: 12 }}>Categories</h3>
              <SimpleTable head={["Category", "URL", "Tools", "Starts"]} rows={CATEGORIES.map((c) => [c.name, `/categories/${c.slug}`, TOOLS.filter((t) => t.category === c.id).length, stats!.tools.filter((x) => toolById(x.tool)?.category === c.id).reduce((a, x) => a + x.starts, 0)])} />
              <p className="hint" style={{ marginTop: 10 }}>Categories are defined in <code>src/registry/categories.ts</code>.</p></div>
          )}
          {sec === "workflows" && (
            <div className="card"><h3 style={{ marginBottom: 12 }}>Workflows ({WORKFLOWS.length})</h3>
              <SimpleTable head={["Workflow", "Input", "Steps", "Starts", "Success", "Errors"]} rows={WORKFLOWS.map((w) => { const s = stats!.workflows.find((x) => x.workflow === w.slug); return [w.name, w.inputLabel, w.steps.length, s?.starts ?? 0, s?.success ?? 0, s?.errors ?? 0]; })} />
              <p className="hint" style={{ marginTop: 10 }}>Add workflows in <code>src/registry/workflows.ts</code> — no redesign needed.</p></div>
          )}
          {sec === "templates" && (
            <div className="card"><h3 style={{ marginBottom: 12 }}>Templates</h3>
              <SimpleTable head={["Audience", "Templates", "URL"]} rows={TEMPLATE_CATEGORIES.map((c) => [c.name, workflowsForAudience(c.id).length, `/templates/${c.id}`])} /></div>
          )}
          {sec === "search" && (
            <div className="card"><h3 style={{ marginBottom: 12 }}>Top searches</h3>
              <SimpleTable head={["Query", "Searches", "Result clicks", "Click rate"]} rows={stats!.searches.map((s) => [s.q, s.n, s.clicks, `${num((s.clicks / Math.max(1, s.n)) * 100, 1)}%`])} /></div>
          )}
          {sec === "missing" && (
            <div className="card">
              <h3 style={{ marginBottom: 6 }}>Missing tool intelligence</h3>
              <p className="hint" style={{ marginBottom: 12 }}>What people searched for but couldn't find. This is your roadmap.</p>
              {stats!.missing.length === 0 ? <p className="muted">No unmatched searches yet.</p> : (
                <div className="stack-sm">
                  {stats!.missing.map((m) => (
                    <div key={m.q} className="row between card flat" style={{ padding: 14 }}>
                      <div><b>{m.q}</b><div className="hint">Searches: {m.n.toLocaleString("en-IN")} · last {timeAgo(m.last)}</div></div>
                      <button className="btn btn-soft btn-sm" onClick={() => { navigator.clipboard?.writeText(`New tool request: "${m.q}" — ${m.n} searches`).catch(() => {}); toast("Tool request copied — add it to your backlog"); }}><Icon name="plus" size={14} /> Create tool</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {sec === "seo" && (
            <div className="card stack">
              <h3>SEO</h3>
              <div className="stat-grid">
                {[["Tool pages", TOOLS.length], ["Category pages", CATEGORIES.length], ["Workflow pages", WORKFLOWS.length], ["Template pages", TEMPLATE_CATEGORIES.length], ["Guides", GUIDES.length]].map(([k, v]) => <div key={k as string} className="stat"><div className="k">{k}</div><div className="v">{v}</div></div>)}
              </div>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                <li>Sitemap: <a href="/sitemap.xml" target="_blank" rel="noopener">/sitemap.xml</a> — submit it in Google Search Console.</li>
                <li>Every page has a unique title, meta description, canonical URL and Open Graph tags.</li>
                <li>Breadcrumb, FAQ, SoftwareApplication, HowTo and Article structured data are included.</li>
                <li>Utility pages (search, workspace, admin) are marked <code>noindex</code>.</li>
              </ul>
            </div>
          )}
          {sec === "ads" && settings && (
            <div className="card stack">
              <h3>Ads</h3>
              <div className="row between"><span>Show ads</span><Toggle label="Ads enabled" checked={settings.flags.adsEnabled} onChange={(v) => saveSettings({ ...settings, flags: { ...settings.flags, adsEnabled: v } })} /></div>
              <Field label="Google AdSense publisher ID" htmlFor="ads" hint="Looks like ca-pub-1234567890123456. Ads only appear after AdSense approves your site.">
                <div className="row" style={{ flexWrap: "nowrap" }}>
                  <input id="ads" className="input" defaultValue={settings.adsenseClient} placeholder="ca-pub-…" onBlur={(e) => { const v = e.target.value.trim(); if (v === settings.adsenseClient) return; if (v && !/^ca-pub-\d{10,20}$/.test(v)) return toast("Enter a valid ca-pub ID"); saveSettings({ ...settings, adsenseClient: v }); }} />
                </div>
              </Field>
              <Alert kind="info">Ad slots sit below tools and between sections — never over upload controls or next to download buttons. <code>ads.txt</code> is generated automatically from <code>ADSENSE_CLIENT</code> in <code>src/config.ts</code>.</Alert>
            </div>
          )}
          {sec === "revenue" && (
            <div className="card stack">
              <h3>Revenue</h3>
              <p className="muted">Ad revenue is reported by Google AdSense. Open your AdSense dashboard for earnings, RPM and top pages.</p>
              <div className="stat-grid">
                <div className="stat"><div className="k">Monetized page views ({days}d)</div><div className="v">{T.pageViews.toLocaleString("en-IN")}</div></div>
                <div className="stat"><div className="k">Subscriptions</div><div className="v">{settings?.flags.subscriptionEnabled ? "On" : "Off"}</div></div>
              </div>
              <a className="btn btn-secondary" href="https://adsense.google.com/" target="_blank" rel="noopener"><Icon name="external" size={15} /> Open AdSense</a>
            </div>
          )}
          {sec === "ai" && (
            <div className="card stack">
              <h3>AI usage</h3>
              <div className="stat-grid">
                <div className="stat"><div className="k">AI calls</div><div className="v">{stats!.ai.calls}</div></div>
                <div className="stat"><div className="k">AI errors</div><div className="v">{stats!.ai.errors}</div></div>
                <div className="stat"><div className="k">API key</div><div className="v" style={{ fontSize: "1.1rem" }}>{settings?.aiConfigured ? "Configured" : "Not set"}</div></div>
              </div>
              {stats!.ai.byTask.length > 0 && <SimpleTable head={["Task", "Calls"]} rows={stats!.ai.byTask.map((t) => [t.task, t.n])} />}
              <p className="hint">AI mode is used only for non-deterministic tasks. Set <code>ANTHROPIC_API_KEY</code> as a secret in Cloudflare to enable it.</p>
            </div>
          )}
          {sec === "errors" && (
            <div className="card"><h3 style={{ marginBottom: 12 }}>Errors</h3>
              {stats!.errors.length ? <SimpleTable head={["Tool", "Message", "Count", "Last seen"]} rows={stats!.errors.map((e) => [e.tool || "—", e.meta || "—", e.n, timeAgo(e.last)])} /> : <p className="muted">No errors recorded.</p>}</div>
          )}
          {sec === "messages" && (
            <div className="card"><h3 style={{ marginBottom: 12 }}>Contact messages ({messages.length})</h3>
              {messages.length === 0 ? <p className="muted">No messages yet.</p> : (
                <div className="stack-sm">{messages.map((m) => (
                  <div key={m.id} className="card flat" style={{ padding: 14 }}>
                    <div className="row between"><b>{m.name || "Anonymous"} · <a href={`mailto:${m.email}`}>{m.email}</a></b><span className="hint">{timeAgo(m.ts)} · {m.topic}</span></div>
                    <p style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{m.message}</p>
                    <div className="row" style={{ marginTop: 10 }}>
                      <a className="btn btn-soft btn-sm" href={`mailto:${m.email}?subject=${encodeURIComponent("Re: your message to SolveIt")}`}><Icon name="mail" size={14} /> Reply</a>
                      <button className="btn btn-ghost btn-sm" onClick={() => deleteMessage(m.id)}>Delete</button>
                    </div>
                  </div>
                ))}</div>
              )}</div>
          )}
          {sec === "flags" && settings && (
            <div className="card stack">
              <h3>Feature flags</h3>
              {(Object.keys(DEFAULT_FLAGS) as (keyof FeatureFlags)[]).map((k) => (
                <div key={k} className="row between" style={{ paddingBlock: 6, borderBottom: "1px solid var(--line)" }}>
                  <span><code>{k}</code><br /><span className="hint">{FLAG_HELP[k]}</span></span>
                  <Toggle label={k} checked={settings.flags[k]} onChange={(v) => saveSettings({ ...settings, flags: { ...settings.flags, [k]: v } })} />
                </div>
              ))}
            </div>
          )}
          {sec === "settings" && (
            <div className="card stack">
              <h3>Settings &amp; setup status</h3>
              <SimpleTable head={["Item", "Status", "Where to change it"]} rows={[
                ["Admin token", demo ? "—" : "✅ Working", "Cloudflare → Workers & Pages → solveit → Settings → Variables and Secrets → ADMIN_TOKEN (Secret)"],
                ["Database (D1)", demo ? "—" : "✅ Connected", "wrangler.jsonc → d1_databases → database_id"],
                ["AI key", settings?.aiConfigured ? "✅ Set" : "⚪ Not set (AI mode off)", "Variables and Secrets → ANTHROPIC_API_KEY (Secret)"],
                ["AdSense ID", ADSENSE_CLIENT ? "✅ " + ADSENSE_CLIENT : "⚪ Not set", "src/config.ts → ADSENSE_CLIENT"],
                ["Show ads", settings?.flags.adsEnabled ? "✅ On" : "⚪ Off", "Admin → Ads"],
                ["Site URL", SITE.url, "src/config.ts → SITE.url"],
                ["Support email", SITE.supportEmail, "src/config.ts → SITE.supportEmail"],
              ]} />
              <div className="row">
                <a className="btn btn-secondary btn-sm" href="/ads.txt" target="_blank" rel="noopener"><Icon name="external" size={14} /> ads.txt</a>
                <a className="btn btn-secondary btn-sm" href="/sitemap.xml" target="_blank" rel="noopener"><Icon name="external" size={14} /> sitemap.xml</a>
                <a className="btn btn-secondary btn-sm" href="https://search.google.com/search-console" target="_blank" rel="noopener"><Icon name="external" size={14} /> Search Console</a>
                <a className="btn btn-secondary btn-sm" href="https://dash.cloudflare.com/" target="_blank" rel="noopener"><Icon name="external" size={14} /> Cloudflare</a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const FLAG_HELP: Record<keyof FeatureFlags, string> = {
  adsEnabled: "Show ad slots (requires an AdSense ID).",
  subscriptionEnabled: "Show paid plans. Keep off at launch.",
  aiCreditsEnabled: "Limit AI mode with credits. Keep off at launch.",
  affiliateEnabled: "Allow affiliate links in content.",
  businessPlansEnabled: "Show business plans.",
  accountsEnabled: "Show Sign in. Basic tools never require login.",
  mandatoryLogin: "Must stay off — tools are always login-free.",
  aiEnabled: "Allow AI mode when an API key is configured.",
  analyticsEnabled: "Record anonymous product analytics.",
};

function SimpleTable({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead><tr>{head.map((h, i) => <th key={h} className={i > 0 && typeof rows[0]?.[i] === "number" ? "num" : ""}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={typeof c === "number" ? "num" : ""}>{typeof c === "number" ? c.toLocaleString("en-IN") : c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

