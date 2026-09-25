import { useEffect, useMemo, useState, type ComponentType } from "react";
import { Icon } from "../components/Icon";
import { AdSlot, Alert, Breadcrumbs, FAQList, ProcessingBadge, SectionHead, ToolCard, WorkflowCard, downloadBlob, toast } from "../components/ui";
import { FileRow } from "../components/files";
import { CATEGORIES, categoryById, categoryBySlug } from "../registry/categories";
import { TOOLS, toolHref, toolsByCategory } from "../registry/tools";
import { STEPS } from "../registry/steps";
import { WORKFLOWS, workflowsForTool } from "../registry/workflows";
import type { CategoryId, ToolDefinition } from "../registry/types";
import { workspace } from "../lib/storage";
import { track } from "../lib/analytics";
import { useConfig } from "../lib/flags";
import { getSession, clearSession, sessionToFiles } from "../lib/session";
import { makeZip } from "../lib/zip";
import { formatBytes, timeAgo } from "../lib/format";

export function AllToolsPage() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<CategoryId | "all">("all");
  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    return TOOLS.filter((t) => (cat === "all" || t.category === cat) && (!n || (t.name + " " + t.description + " " + t.keywords.join(" ")).toLowerCase().includes(n)));
  }, [q, cat]);
  const popular = TOOLS.filter((t) => t.popular);
  const recent = TOOLS.filter((t) => t.isNew);
  return (
    <div className="container" style={{ paddingBlock: 36 }}>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "All Tools" }]} />
      <div className="tool-head">
        <div>
          <h1>All tools</h1>
          <p className="lead">{TOOLS.length} carefully built tools. Not sure which one you need? <a href="/solve">Describe your problem</a> instead.</p>
        </div>
      </div>
      <div className="stack" style={{ marginBottom: 28 }}>
        <label className="header-search" style={{ height: 48, maxWidth: 520, width: "100%" }}>
          <Icon name="search" size={18} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter tools…" aria-label="Filter tools" />
        </label>
        <div className="chips">
          <button className="chip" aria-pressed={cat === "all"} onClick={() => setCat("all")}>All ({TOOLS.length})</button>
          {CATEGORIES.map((c) => <button key={c.id} className="chip" aria-pressed={cat === c.id} onClick={() => setCat(c.id)}><Icon name={c.icon} size={15} /> {c.name}</button>)}
        </div>
      </div>
      {!q && cat === "all" && (
        <section style={{ marginBottom: 40 }}>
          <SectionHead title="Popular tools" />
          <div className="grid grid-3">{popular.map((t) => <ToolCard key={t.id} tool={t} />)}</div>
        </section>
      )}
      {(q || cat !== "all") ? (
        list.length ? <div className="grid grid-3" data-testid="tool-list">{list.map((t) => <ToolCard key={t.id} tool={t} />)}</div> : (
          <div className="empty-state"><h3>No tools match “{q}”</h3><p style={{ marginTop: 6 }}>Try the <a href={`/solve?q=${encodeURIComponent(q)}`}>problem solver</a> instead.</p></div>
        )
      ) : (
        CATEGORIES.map((c) => (
          <section key={c.id} style={{ marginBottom: 36 }}>
            <SectionHead title={c.name} desc={c.short} action={<a href={`/categories/${c.slug}`} className="btn btn-ghost btn-sm">View category <Icon name="arrow-right" size={14} /></a>} />
            <div className="grid grid-3">{toolsByCategory(c.id).map((t) => <ToolCard key={t.id} tool={t} />)}</div>
          </section>
        ))
      )}
      {!q && cat === "all" && recent.length > 0 && (
        <section><SectionHead title="Recently added" /><div className="grid grid-3">{recent.map((t) => <ToolCard key={t.id} tool={t} />)}</div></section>
      )}
    </div>
  );
}

export function CategoryPage({ slug }: { slug: string }) {
  const c = categoryBySlug(slug)!;
  const tools = toolsByCategory(c.id);
  const [q, setQ] = useState("");
  const shown = tools.filter((t) => !q || (t.name + t.description).toLowerCase().includes(q.toLowerCase()));
  const stepIds = STEPS.filter((s) => s.toolSlug?.startsWith(c.id + "/") || (c.id === "image" && s.accepts.includes("image")) || (c.id === "pdf" && s.accepts.includes("pdf"))).map((s) => s.id);
  const wfs = workflowsForTool(stepIds, 6);
  const others = CATEGORIES.filter((x) => x.id !== c.id).slice(0, 4);
  return (
    <div className="container" style={{ paddingBlock: 36 }}>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "All Tools", href: "/tools" }, { label: c.name }]} />
      <div className="tool-head">
        <div className="row" style={{ gap: 16, alignItems: "flex-start", flexWrap: "nowrap" }}>
          <span className="tile-icon lg"><Icon name={c.icon} size={26} /></span>
          <div><h1>{c.name} Tools</h1><p className="lead">{c.intro}</p></div>
        </div>
      </div>
      {tools.length > 4 && (
        <label className="header-search" style={{ height: 46, maxWidth: 440, width: "100%", marginBottom: 20 }}>
          <Icon name="search" size={17} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${c.name.toLowerCase()} tools`} aria-label="Search tools in this category" />
        </label>
      )}
      <section style={{ marginBottom: 40 }}>
        <SectionHead title="Popular tools" />
        <div className="grid grid-3">{shown.map((t) => <ToolCard key={t.id} tool={t} />)}</div>
      </section>
      {wfs.length > 0 && (
        <section style={{ marginBottom: 40 }}>
          <SectionHead title="Popular workflows" desc="Multi-step solutions that use these tools." />
          <div className="grid grid-3">{wfs.map((w) => <WorkflowCard key={w.slug} wf={w} />)}</div>
        </section>
      )}
      <AdSlot id={`cat-${c.id}`} />
      <section className="section tight" style={{ maxWidth: 860 }}>
        <SectionHead title="FAQ" />
        <FAQList items={c.faq} />
      </section>
      <section>
        <SectionHead title="Related categories" />
        <div className="chips">{others.map((o) => <a key={o.id} className="chip" href={`/categories/${o.slug}`}><Icon name={o.icon} size={15} /> {o.name}</a>)}</div>
      </section>
    </div>
  );
}

function FavoriteButton({ id }: { id: string }) {
  const [fav, setFav] = useState(false);
  useEffect(() => setFav(workspace.favorites().includes(id)), [id]);
  return (
    <button className="btn btn-secondary btn-sm" aria-pressed={fav} onClick={() => { const v = workspace.toggleFavorite(id); setFav(v); toast(v ? "Added to favorites" : "Removed from favorites"); }}>
      <Icon name="star" size={15} className="" /> {fav ? "Favorited" : "Favorite"}
    </button>
  );
}

export function ToolPage({ tool, Comp }: { tool: ToolDefinition; Comp: ComponentType<{ tool: ToolDefinition }> }) {
  const cfg = useConfig();
  const c = categoryById(tool.category);
  useEffect(() => { track("tool_view", { tool: tool.id }); }, []);
  const stepIds = STEPS.filter((s) => s.toolSlug?.endsWith("/" + tool.id)).map((s) => s.id);
  const related = workflowsForTool(stepIds, 4);
  const siblings = toolsByCategory(tool.category).filter((t) => t.id !== tool.id);
  const disabled = cfg.disabledTools.includes(tool.id);
  return (
    <div className="container" style={{ paddingBlock: 28 }}>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: c.name, href: `/categories/${c.slug}` }, { label: tool.name }]} />
      <div className="tool-head">
        <div style={{ maxWidth: 720 }}>
          <h1 style={{ fontSize: "clamp(1.9rem, 3.4vw, 2.6rem)" }}>{tool.name}</h1>
          <p className="lead">{tool.description}</p>
        </div>
        <div className="row"><ProcessingBadge mode={tool.processingMode === "hybrid" ? "client" : tool.processingMode} /><FavoriteButton id={tool.id} /></div>
      </div>
      <div className="tool-layout">
        <div className="stack" style={{ gap: 28, minWidth: 0 }}>
          <div className="tool-shell" data-testid="tool-shell">
            {disabled ? <Alert kind="warn">This tool is temporarily unavailable while we improve it. Please try again later or use a related tool.</Alert> : <Comp tool={tool} />}
          </div>
          <AdSlot id={`tool-${tool.id}`} />
          <section>
            <h2 style={{ fontSize: "1.35rem", marginBottom: 14 }}>How to use {tool.name}</h2>
            <div className="steps-row">
              {tool.howTo.map((h, i) => <div key={i} className="step-card" style={{ padding: 18 }}><div className="step-num">{i + 1}</div><p>{h}</p></div>)}
            </div>
          </section>
          {related.length > 0 && (
            <section>
              <h2 style={{ fontSize: "1.35rem", marginBottom: 14 }}>Related workflows</h2>
              <div className="grid grid-2">{related.map((w) => <WorkflowCard key={w.slug} wf={w} />)}</div>
            </section>
          )}
          <section>
            <h2 style={{ fontSize: "1.35rem", marginBottom: 14 }}>Frequently asked questions</h2>
            <FAQList items={tool.faq} />
          </section>
          <section className="prose">
            <h2 style={{ fontSize: "1.35rem", marginTop: 0 }}>About this {c.name.toLowerCase().includes("calcul") ? "calculator" : "tool"}</h2>
            <p>{tool.intro}</p>
            <p>
              {tool.processingMode === "client"
                ? `${tool.name} runs entirely in your web browser. Your ${tool.category === "pdf" ? "documents" : tool.category === "image" ? "photos" : "data"} are processed on your own device and are never uploaded to our servers, which makes it safe for personal and business files.`
                : `${tool.name} works on-device by default. When AI mode is available and you choose it, your text is sent over an encrypted connection for processing and is not stored.`}
            </p>
          </section>
        </div>
        <aside className="side-stack" aria-label="Related">
          <div className="card">
            <h3 style={{ fontSize: "0.95rem", marginBottom: 12 }}>More in {c.name}</h3>
            <div className="stack-sm">
              {siblings.slice(0, 6).map((t) => <a key={t.id} href={toolHref(t)} className="row" style={{ gap: 10, color: "var(--ink)", flexWrap: "nowrap" }}><Icon name={t.icon} size={16} /> {t.name}</a>)}
            </div>
          </div>
          <div className="card" style={{ background: "var(--brand-soft)", borderColor: "transparent" }}>
            <h3 style={{ fontSize: "0.95rem" }}>Not the right tool?</h3>
            <p className="muted" style={{ fontSize: "0.9rem", margin: "6px 0 12px" }}>Describe what you want to do and we'll find the fastest way.</p>
            <a className="btn btn-primary btn-sm" href="/solve"><Icon name="wand" size={15} /> Solve a problem</a>
          </div>
          <AdSlot id={`tool-side-${tool.id}`} format="rectangle" />
        </aside>
      </div>
    </div>
  );
}

export function ResultPage() {
  const [s, setS] = useState<{ files: File[]; source: string; ts: number } | null | undefined>();
  useEffect(() => { getSession().then((x) => setS(x ? { files: sessionToFiles(x), source: x.source, ts: x.ts } : null)); }, []);
  const kind = s?.files[0]?.type.startsWith("image/") ? "image" : s?.files[0]?.type === "application/pdf" ? "pdf" : "text";
  const next = WORKFLOWS.filter((w) => w.input === kind).slice(0, 6);
  return (
    <div className="container narrow" style={{ paddingBlock: 36 }}>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "My Workspace", href: "/workspace" }, { label: "Latest result" }]} />
      <h1 style={{ fontSize: "2rem", marginBottom: 20 }}>Your latest result</h1>
      {s === undefined ? <p className="muted">Loading…</p> : s === null ? (
        <div className="empty-state"><span className="tile-icon"><Icon name="history" size={22} /></span><h3>No recent result in this browser</h3><p style={{ marginTop: 6 }}>Results are kept on your device for 6 hours after you finish a tool or workflow.</p><div className="row" style={{ justifyContent: "center", marginTop: 16 }}><a className="btn btn-primary" href="/solve">Solve a problem</a></div></div>
      ) : (
        <div className="stack">
          <section className="result">
            <div className="result-head"><Icon name="circle-check" size={20} /> From {s.source} · {timeAgo(s.ts)}</div>
            <div className="result-body">
              <div className="file-list" style={{ marginTop: 0 }}>
                {s.files.map((f, i) => <FileRow key={i} file={f} extra={<button className="btn btn-ghost btn-sm" onClick={() => downloadBlob(f, f.name)}><Icon name="download" size={15} /> Save</button>} />)}
              </div>
              <div className="row">
                <button className="btn btn-primary btn-lg" onClick={async () => s.files.length === 1 ? downloadBlob(s.files[0], s.files[0].name) : downloadBlob(await makeZip(s.files.map((f) => ({ name: f.name, blob: f }))), "solveit-results.zip")}>
                  <Icon name="download" /> Download {s.files.length > 1 ? `all (${formatBytes(s.files.reduce((a, f) => a + f.size, 0))})` : ""}
                </button>
                <button className="btn btn-ghost" onClick={async () => { await clearSession(); setS(null); toast("Result cleared from this device"); }}><Icon name="trash" size={16} /> Clear from device</button>
              </div>
            </div>
            <div className="next-actions">
              <h3>What would you like to do next?</h3>
              <div className="chips">{next.map((w) => <a key={w.slug} className="chip" href={`/workflows/${w.slug}`}><Icon name="arrow-right" size={15} /> {w.name}</a>)}</div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
