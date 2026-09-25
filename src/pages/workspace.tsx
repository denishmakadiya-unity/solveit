import { useEffect, useState } from "react";
import { Icon } from "../components/Icon";
import { Alert, Breadcrumbs, FlowPills, ToolCard, toast } from "../components/ui";
import { workspace, type RecentResult, type SavedWorkflow } from "../lib/storage";
import { formatBytes, timeAgo } from "../lib/format";
import { toolById } from "../registry/tools";
import { useConfig } from "../lib/flags";
import { clearSession } from "../lib/session";

type Tab = "recent" | "saved" | "favorites" | "searches";

export function WorkspacePage() {
  const [tab, setTab] = useState<Tab>("recent");
  const [recents, setRecents] = useState<RecentResult[]>([]);
  const [saved, setSaved] = useState<SavedWorkflow[]>([]);
  const [favs, setFavs] = useState<string[]>([]);
  const [searches, setSearches] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const load = () => { setRecents(workspace.recents()); setSaved(workspace.saved()); setFavs(workspace.favorites()); setSearches(workspace.searches()); setReady(true); };
  useEffect(() => {
    load();
    const t = new URLSearchParams(location.search).get("tab") as Tab | null;
    if (t) setTab(t);
    window.addEventListener("solveit:storage", load);
    return () => window.removeEventListener("solveit:storage", load);
  }, []);
  const tabs: { v: Tab; l: string; n: number; icon: string }[] = [
    { v: "recent", l: "Recent results", n: recents.length, icon: "history" },
    { v: "saved", l: "Saved workflows", n: saved.length, icon: "workflow" },
    { v: "favorites", l: "Favorites", n: favs.length, icon: "star" },
    { v: "searches", l: "Searches", n: searches.length, icon: "search" },
  ];
  return (
    <div className="container" style={{ paddingBlock: 36 }}>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "My Workspace" }]} />
      <div className="tool-head">
        <div><h1>My Workspace</h1><p className="lead">Your recent results, saved workflows and favorite tools. Everything is stored privately in this browser.</p></div>
        <a className="btn btn-secondary" href="/result"><Icon name="file-check" size={16} /> Latest result</a>
      </div>
      <div className="pill-tabs" role="tablist" style={{ marginBottom: 20 }}>
        {tabs.map((t) => (
          <button key={t.v} role="tab" aria-selected={tab === t.v} className="chip" aria-pressed={tab === t.v} onClick={() => setTab(t.v)}>
            <Icon name={t.icon} size={15} /> {t.l} {ready && <span className="badge" style={{ marginLeft: 2 }}>{t.n}</span>}
          </button>
        ))}
      </div>

      {tab === "recent" && (recents.length ? (
        <div className="stack">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Task</th><th>Input</th><th>Result</th><th className="num">Saved</th><th>When</th><th></th></tr></thead>
              <tbody>
                {recents.map((r) => (
                  <tr key={r.id}>
                    <td><span className="row" style={{ gap: 8, flexWrap: "nowrap" }}><Icon name={r.kind === "workflow" ? "workflow" : "zap"} size={15} /> <b>{r.title}</b></span></td>
                    <td className="muted">{r.inputName || "—"}{r.inputSize ? ` · ${formatBytes(r.inputSize)}` : ""}</td>
                    <td>{r.outputName || "—"}{r.outputSize ? ` · ${formatBytes(r.outputSize)}` : ""}</td>
                    <td className="num">{r.inputSize && r.outputSize && r.outputSize < r.inputSize ? <span className="badge ok">−{Math.round((1 - r.outputSize / r.inputSize) * 100)}%</span> : "—"}</td>
                    <td className="muted">{timeAgo(r.ts)}</td>
                    <td><a className="btn btn-ghost btn-sm" href={r.href}><Icon name="repeat2" size={14} /> Repeat</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="row">
            <button className="btn btn-ghost btn-sm" onClick={async () => { workspace.clearRecents(); await clearSession(); toast("History cleared"); }}><Icon name="trash" size={15} /> Clear history</button>
            <span className="hint">Only names and sizes are stored — never your files.</span>
          </div>
        </div>
      ) : <Empty icon="history" title="No results yet" text="When you finish a tool or workflow, it appears here so you can repeat it later." cta={["Solve a problem", "/solve"]} />)}

      {tab === "saved" && (saved.length ? (
        <div className="grid grid-2">
          {saved.map((w) => (
            <div key={w.id} className="card stack-sm">
              <div className="row between"><h3>{w.name}</h3><span className="badge">{w.input.toUpperCase()} · {w.steps.length} steps</span></div>
              <FlowPills steps={w.steps} max={6} />
              <p className="hint">Saved {timeAgo(w.ts)} · run {w.runs} time{w.runs === 1 ? "" : "s"}</p>
              <div className="row">
                <a className="btn btn-primary btn-sm" href={`/workflows/builder?saved=${w.id}`}><Icon name="play" size={14} /> Open & run</a>
                <button className="btn btn-ghost btn-sm" onClick={() => { workspace.deleteWorkflow(w.id); toast("Workflow deleted"); }}><Icon name="trash" size={14} /> Delete</button>
              </div>
            </div>
          ))}
        </div>
      ) : <Empty icon="workflow" title="No saved workflows" text="Build a workflow once and save it here to repeat it in one click." cta={["Open the builder", "/workflows/builder"]} />)}

      {tab === "favorites" && (favs.length ? (
        <div className="grid grid-3">{favs.map((id) => toolById(id)).filter(Boolean).map((t) => <ToolCard key={t!.id} tool={t!} />)}</div>
      ) : <Empty icon="star" title="No favorites yet" text="Tap “Favorite” on any tool page to pin it here." cta={["Browse tools", "/tools"]} />)}

      {tab === "searches" && (searches.length ? (
        <div className="chips">{searches.map((s) => <a key={s} className="chip" href={`/solve?q=${encodeURIComponent(s)}`}><Icon name="history" size={14} /> {s}</a>)}</div>
      ) : <Empty icon="search" title="No searches yet" text="Your recent searches and problems appear here." cta={["Search", "/search"]} />)}

      <SyncNote />
    </div>
  );
}

function SyncNote() {
  const cfg = useConfig();
  return (
    <div className="card flat row" style={{ marginTop: 32, gap: 14, flexWrap: "nowrap", alignItems: "flex-start" }}>
      <span className="tile-icon"><Icon name="lock" size={18} /></span>
      <div>
        <b>Stored on this device only</b>
        <p className="muted" style={{ fontSize: "0.92rem", marginTop: 4 }}>
          {cfg.accountsEnabled ? <>Sign in to sync your saved workflows across devices. <a href="/account">Sign in</a></> : "Your workspace stays private in this browser. Optional cloud sync with an account is planned."}
        </p>
      </div>
    </div>
  );
}

function Empty({ icon, title, text, cta }: { icon: string; title: string; text: string; cta: [string, string] }) {
  return (
    <div className="empty-state">
      <span className="tile-icon"><Icon name={icon} size={22} /></span>
      <h3>{title}</h3>
      <p style={{ marginTop: 6 }}>{text}</p>
      <div className="row" style={{ justifyContent: "center", marginTop: 16 }}><a className="btn btn-primary" href={cta[1]}>{cta[0]}</a></div>
    </div>
  );
}

export function AccountPage() {
  const cfg = useConfig();
  return (
    <div className="container narrow" style={{ paddingBlock: 48 }}>
      <div className="card pad-lg stack" style={{ maxWidth: 520, margin: "0 auto", textAlign: "center", alignItems: "center" }}>
        <span className="tile-icon lg"><Icon name="user" size={26} /></span>
        <h1 style={{ fontSize: "1.9rem" }}>{cfg.accountsEnabled ? "Sign in to SolveIt" : "Accounts are optional"}</h1>
        <p className="muted">Every tool and workflow works without an account. Your workspace is saved in this browser automatically.</p>
        {!cfg.accountsEnabled ? (
          <>
            <Alert kind="info">Sign-in with cloud sync is coming soon. We'll only ask for an email address — never a password you have to remember.</Alert>
            <div className="row" style={{ justifyContent: "center" }}>
              <a className="btn btn-primary" href="/workspace"><Icon name="folder" size={16} /> Open my workspace</a>
              <a className="btn btn-secondary" href="/contact?topic=account-waitlist">Notify me</a>
            </div>
          </>
        ) : (
          <form className="stack" style={{ width: "100%" }} onSubmit={(e) => { e.preventDefault(); toast("Sign-in is being set up. Please check back soon."); }}>
            <input className="input" type="email" required placeholder="you@example.com" aria-label="Email address" />
            <button className="btn btn-primary btn-lg btn-block" type="submit">Email me a sign-in link</button>
          </form>
        )}
        <ul style={{ textAlign: "left", margin: 0, paddingLeft: 18, color: "var(--ink-2)" }}>
          <li>Sync saved workflows across devices</li>
          <li>Keep favorites and history in one place</li>
          <li>Basic tools will always stay free and login-free</li>
        </ul>
      </div>
    </div>
  );
}

export function PricingPage() {
  const cfg = useConfig();
  const plans = [
    { name: "Free", price: "₹0", tag: "Current plan", on: true, features: ["All 38 tools", "50+ workflows", "Upload once, multi-step processing", "Browser-based privacy", "Supported by ads"] },
    { name: "Pro", price: "Coming later", tag: "Planned", features: ["Ad-free", "Higher file limits", "Batch processing", "Advanced workflows", "Cloud-synced workspace"] },
    { name: "Business", price: "Coming later", tag: "Planned", features: ["Team workspaces", "API access", "Higher limits", "Admin controls", "Priority support"] },
  ];
  return (
    <div className="container" style={{ paddingBlock: 40 }}>
      <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 32px" }}>
        <h1>Simple, free to start</h1>
        <p className="lead" style={{ margin: "12px auto 0" }}>SolveIt is free for everyone. {cfg.subscriptionEnabled ? "Upgrade for more power." : "Paid plans are planned for later and will never remove free basic tools."}</p>
      </div>
      <div className="grid grid-3">
        {plans.map((p) => (
          <div key={p.name} className={"card pad-lg stack" + (p.on ? " raised" : "")} style={p.on ? { borderColor: "var(--brand)" } : { opacity: 0.85 }}>
            <div className="row between"><h2 style={{ fontSize: "1.3rem" }}>{p.name}</h2><span className={"badge " + (p.on ? "brand" : "")}>{p.tag}</span></div>
            <div style={{ fontFamily: "var(--display)", fontSize: "2rem", fontWeight: 700 }}>{p.price}</div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }} className="stack-sm">{p.features.map((f) => <li key={f} className="row" style={{ gap: 8, flexWrap: "nowrap" }}><Icon name="check" size={16} /> {f}</li>)}</ul>
            {p.on ? <a className="btn btn-primary" href="/solve">Start solving</a> : <a className="btn btn-secondary" href="/contact?topic=pricing-waitlist">Join the waitlist</a>}
          </div>
        ))}
      </div>
    </div>
  );
}
