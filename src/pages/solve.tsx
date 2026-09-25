import { useEffect, useRef, useState } from "react";
import { Icon } from "../components/Icon";
import { AdSlot, FlowPills, SectionHead, ToolCard, WorkflowCard, useQueryParam } from "../components/ui";
import { SolverBox } from "./home";
import { solve, MULTILINGUAL_EXAMPLES, type SolveResult } from "../lib/intent";
import { search } from "../lib/search";
import { track } from "../lib/analytics";
import { workspace } from "../lib/storage";
import { toolById } from "../registry/tools";
import { stepById, STEPS } from "../registry/steps";
import { workflowBySlug } from "../registry/workflows";
import { CATEGORIES } from "../registry/categories";
import { useConfig } from "../lib/flags";
import type { WorkflowStep } from "../registry/types";

function withTarget(href: string, r: SolveResult) {
  if (r.sizeHintKB && /compress-pdf|image-compressor/.test(href)) return `${href}?target=${r.sizeHintKB}`;
  return href;
}

export function SolutionCard({ r }: { r: SolveResult }) {
  const wf = r.workflow ? workflowBySlug(r.workflow.slug) : undefined;
  const tool = r.tool ? toolById(r.tool.id) : undefined;
  const primaryHref = wf ? `/workflows/${wf.slug}` : tool ? withTarget(r.tool!.href, r) : "/tools";
  return (
    <div className="solution" data-testid="solution">
      <div className="row between">
        <span className="row" style={{ gap: 10 }}><span className="tile-icon"><Icon name="sparkles" size={20} /></span><b style={{ fontSize: "1.05rem" }}>I understand your goal.</b></span>
        <span className={"badge " + (r.confidence === "high" ? "ok" : r.confidence === "medium" ? "brand" : "warn")}>{r.confidence === "high" ? "Strong match" : r.confidence === "medium" ? "Good match" : "Best guess"}</span>
      </div>
      <dl>
        <dt>Goal</dt>
        <dd><h2 style={{ fontSize: "1.5rem" }} data-testid="goal">{r.goal}</h2></dd>
        {wf && (<>
          <dt>Recommended workflow</dt>
          <dd className="stack-sm"><b>{wf.name}</b><FlowPills steps={wf.steps} max={8} /></dd>
        </>)}
        {tool && (<>
          <dt>{wf ? "Or use a single tool" : "Recommended tool"}</dt>
          <dd><a href={withTarget(r.tool!.href, r)} className="row" style={{ gap: 8, fontWeight: 650 }}><Icon name={tool.icon} size={18} /> {tool.name} <Icon name="arrow-right" size={15} /></a><span className="muted" style={{ fontSize: "0.9rem" }}>{tool.description}</span></dd>
        </>)}
        <dt>Expected result</dt>
        <dd>{r.expected}{r.sizeHintKB ? ` Target: ${r.sizeHintKB >= 1024 ? (r.sizeHintKB / 1024).toFixed(1) + " MB" : r.sizeHintKB + " KB"}.` : ""}</dd>
      </dl>
      <div className="row" style={{ marginTop: 22 }}>
        <a className="btn btn-primary btn-lg" href={primaryHref} data-testid="solution-cta" onClick={() => track("search_result_click", { q: r.query, meta: primaryHref })}>
          {wf ? "Start this workflow" : `Open ${tool?.name}`} <Icon name="arrow-right" size={18} />
        </a>
        {wf && <a className="btn btn-secondary btn-lg" href={`/workflows/builder?from=${wf.slug}`}><Icon name="sliders" size={17} /> Customize steps</a>}
      </div>
    </div>
  );
}

export function SolvePage() {
  const q = useQueryParam("q");
  const [r, setR] = useState<SolveResult | null | undefined>();
  useEffect(() => {
    if (q === null) return;
    if (!q.trim()) return setR(undefined);
    const res = solve(q);
    setR(res);
    workspace.addSearch(q);
    track("solve_submit", { q, meta: res?.intentId || "none" });
    if (!res || res.unsupported) track("search_no_result", { q });
  }, [q]);
  const fallback = q && (!r || r.unsupported) ? search(q) : null;
  return (
    <>
      <section className="hero" style={{ paddingBottom: 24 }}>
        <div className="container">
          <h1 style={{ fontSize: "clamp(1.8rem, 3.6vw, 2.6rem)" }}>{q ? "Here's your solution" : "What do you want to get done?"}</h1>
          <p className="lead">Type in English, Hindi, Hinglish or Gujarati. We'll recommend the fastest way to do it.</p>
          <SolverBox initial={q || ""} autoFocus={!q} />
        </div>
      </section>
      <section className="container narrow" style={{ paddingBottom: 48 }}>
        {q && r && !r.unsupported && (
          <div className="stack">
            <SolutionCard r={r} />
            {r.alternatives.length > 0 && (
              <div className="card flat">
                <h3 style={{ marginBottom: 12, fontSize: "1rem" }}>Did you mean something else?</h3>
                <div className="chips">{r.alternatives.map((a) => <a key={a.href} className="chip" href={a.href}>{a.goal} <Icon name="arrow-right" size={14} /></a>)}</div>
              </div>
            )}
          </div>
        )}
        {q && (!r || r.unsupported) && (
          <div className="stack">
            <div className="card pad-lg stack" data-testid="no-solution">
              <span className="tile-icon sun"><Icon name="search-x" size={20} /></span>
              <h2 style={{ fontSize: "1.4rem" }}>{r?.unsupported ? "We don't have a tool for this yet" : "We couldn't match that to a tool yet"}</h2>
              <p className="muted">We've noted your request. The most-requested missing tools are built first. Meanwhile, try rephrasing — for example “make PDF smaller” — or ask the AI Assistant.</p>
              <div className="row">
                <a className="btn btn-primary" href={`/assistant?q=${encodeURIComponent(q)}`}><Icon name="bot" size={17} /> Ask the AI Assistant</a>
                <a className="btn btn-secondary" href="/tools">Browse all tools</a>
                <a className="btn btn-ghost" href={`/contact?topic=tool-request&q=${encodeURIComponent(q)}`}>Request this tool</a>
              </div>
            </div>
            {r?.alternatives && r.alternatives.length > 0 && (
              <div className="card flat"><h3 style={{ marginBottom: 12, fontSize: "1rem" }}>Related tools that might help</h3>
                <div className="chips">{r.alternatives.map((a) => <a key={a.href} className="chip" href={a.href}>{a.label}</a>)}</div></div>
            )}
            {fallback && fallback.tools.length > 0 && (
              <div className="grid grid-2">{fallback.tools.slice(0, 4).map((t) => <ToolCard key={t.item.id} tool={t.item} />)}</div>
            )}
          </div>
        )}
        {!q && (
          <div className="stack">
            <SectionHead title="Try one of these" desc="Real requests in different languages — tap to see the solution." />
            <div className="grid grid-2">
              {MULTILINGUAL_EXAMPLES.map((e) => (
                <a key={e} className="card tool-card" href={`/solve?q=${encodeURIComponent(e)}`}>
                  <span className="tile-icon"><Icon name="message" size={18} /></span><span><h3 style={{ fontWeight: 600 }}>“{e}”</h3></span>
                </a>
              ))}
            </div>
            <SectionHead title="Or browse by category" />
            <div className="chips">{CATEGORIES.map((c) => <a key={c.id} className="chip" href={`/categories/${c.slug}`}><Icon name={c.icon} size={15} /> {c.name}</a>)}</div>
          </div>
        )}
        <div style={{ marginTop: 32 }}><AdSlot id="solve-bottom" /></div>
      </section>
    </>
  );
}

export function SearchPage() {
  const q = useQueryParam("q");
  const [val, setVal] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  useEffect(() => { setVal(q || ""); setRecent(workspace.searches()); }, [q]);
  const res = q ? search(q) : null;
  useEffect(() => {
    if (!q) return;
    workspace.addSearch(q);
    track("search_submit", { q, value: res ? res.tools.length + res.workflows.length : 0 });
    if (res?.empty || res?.intent?.unsupported) track("search_no_result", { q });
  }, [q]);
  const click = (href: string) => () => track("search_result_click", { q: q || "", meta: href });
  return (
    <div className="container" style={{ paddingBlock: 32 }}>
      <form action="/search" method="get" role="search" className="solver" style={{ margin: "0 0 28px", maxWidth: "none" }}>
        <div className="solver-box" style={{ boxShadow: "var(--shadow)" }}>
          <Icon name="search" size={20} className="spark" />
          <input name="q" value={val} onChange={(e) => setVal(e.target.value)} placeholder="Search tools, workflows or describe a problem" aria-label="Search" autoFocus={!q} />
          <button className="btn btn-primary" type="submit">Search</button>
        </div>
      </form>
      {!q && (
        <div className="stack">
          {recent.length > 0 && (<><h3>Recent searches</h3><div className="chips">{recent.map((s) => <a key={s} className="chip" href={`/search?q=${encodeURIComponent(s)}`}><Icon name="history" size={14} /> {s}</a>)}</div></>)}
          <h3>Popular searches</h3>
          <div className="chips">{["pdf", "compress image", "emi", "qr code", "json", "resize photo", "gst", "password"].map((s) => <a key={s} className="chip" href={`/search?q=${encodeURIComponent(s)}`}>{s}</a>)}</div>
        </div>
      )}
      {q && res && (
        <div className="stack" style={{ gap: 32 }}>
          <h1 style={{ fontSize: "1.6rem" }}>Results for “{q}”</h1>
          {res.intent && !res.intent.unsupported && res.intent.confidence !== "low" && (
            <a className="card row" href={`/solve?q=${encodeURIComponent(q)}`} onClick={click("/solve")} style={{ background: "var(--brand-soft)", borderColor: "transparent", gap: 14, flexWrap: "nowrap" }}>
              <span className="tile-icon" style={{ background: "var(--surface)" }}><Icon name="wand" size={20} /></span>
              <span style={{ flex: 1 }}><b>Looks like you want to: {res.intent.goal.toLowerCase()}</b><br /><span className="muted" style={{ fontSize: "0.9rem" }}>See the recommended solution</span></span>
              <Icon name="arrow-right" />
            </a>
          )}
          {res.tools.length > 0 && (
            <section><h2 style={{ fontSize: "1.2rem", marginBottom: 14 }}>Tools <span className="muted" style={{ fontWeight: 500 }}>({res.tools.length})</span></h2>
              <div className="grid grid-3" data-testid="search-tools">{res.tools.map((t) => <span key={t.item.id} onClick={click(t.href)}><ToolCard tool={t.item} /></span>)}</div></section>
          )}
          {res.workflows.length > 0 && (
            <section><h2 style={{ fontSize: "1.2rem", marginBottom: 14 }}>Workflows <span className="muted" style={{ fontWeight: 500 }}>({res.workflows.length})</span></h2>
              <div className="grid grid-3">{res.workflows.map((w) => <span key={w.item.slug} onClick={click(w.href)}><WorkflowCard wf={w.item} /></span>)}</div></section>
          )}
          {res.problems.length > 0 && (
            <section><h2 style={{ fontSize: "1.2rem", marginBottom: 14 }}>Problems we solve</h2>
              <div className="stack-sm">{res.problems.map((p) => <a key={p.href} className="card row between" href={p.href} onClick={click(p.href)} style={{ padding: 14 }}><span>“{p.text}”</span><Icon name="arrow-right" size={16} /></a>)}</div></section>
          )}
          {res.guides.length > 0 && (
            <section><h2 style={{ fontSize: "1.2rem", marginBottom: 14 }}>Guides</h2>
              <div className="stack-sm">{res.guides.map((g) => <a key={g.href} className="card" href={g.href} style={{ padding: 14 }}><b>{g.item.title}</b><br /><span className="muted" style={{ fontSize: "0.9rem" }}>{g.item.description}</span></a>)}</div></section>
          )}
          {res.empty && (
            <div className="empty-state" data-testid="search-empty">
              <span className="tile-icon"><Icon name="search-x" size={22} /></span>
              <h3>No results for “{q}”</h3>
              <p style={{ marginTop: 6 }}>We've recorded this search to help decide which tools to build next.</p>
              <div className="row" style={{ justifyContent: "center", marginTop: 16 }}>
                <a className="btn btn-primary" href={`/assistant?q=${encodeURIComponent(q)}`}>Ask the AI Assistant</a>
                <a className="btn btn-secondary" href="/tools">Browse all tools</a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── AI Assistant ──
type Msg = { role: "user" | "assistant"; text: string; plan?: { goal: string; steps: WorkflowStep[]; input?: string; slug?: string; toolHref?: string; toolName?: string } };

function encodeSteps(steps: WorkflowStep[]) {
  return steps.map((s) => s.step).join(",");
}

export function AssistantPage() {
  const cfg = useConfig();
  const initialQ = useQueryParam("q");
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "assistant", text: "Hi! Tell me what you want to get done — in English, Hindi, Hinglish or Gujarati. I'll turn it into a ready-to-run workflow." }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const asked = useRef(false);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [msgs.length]);
  useEffect(() => { if (initialQ && !asked.current) { asked.current = true; ask(initialQ); } }, [initialQ]);

  const ask = async (text: string) => {
    const t = text.trim();
    if (!t) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", text: t }]);
    setBusy(true);
    track("solve_submit", { q: t, meta: "assistant" });
    const local = solve(t);
    let reply: Msg;
    if (local && !local.unsupported && local.confidence !== "low") {
      const wf = local.workflow ? workflowBySlug(local.workflow.slug) : undefined;
      reply = {
        role: "assistant", text: "I understand your goal.",
        plan: { goal: local.goal, steps: wf?.steps || [], input: wf?.input, slug: wf?.slug, toolHref: local.tool?.href, toolName: local.tool?.name },
      };
    } else if (cfg.aiEnabled && cfg.aiAvailable) {
      try {
        const res = await fetch("/api/ai", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ task: "plan", text: t, steps: STEPS.map((s) => ({ id: s.id, name: s.name, accepts: s.accepts })) }) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        const plan = JSON.parse(data.output);
        const steps: WorkflowStep[] = (plan.steps || []).filter((s: any) => stepById(s.step)).map((s: any) => ({ step: s.step, params: s.params || undefined }));
        reply = steps.length
          ? { role: "assistant", text: plan.reply || "I understand your goal.", plan: { goal: plan.goal || "Your custom workflow", steps, input: plan.input } }
          : { role: "assistant", text: plan.reply || "I couldn't build a workflow for this with the current tools. I've recorded the request." };
        if (!steps.length) track("search_no_result", { q: t });
      } catch {
        reply = { role: "assistant", text: "AI mode is busy right now. Try describing the task with a file type and a goal, like “make my PDF smaller for email”." };
      }
    } else {
      track("search_no_result", { q: t });
      reply = local?.unsupported
        ? { role: "assistant", text: "SolveIt doesn't have a tool for that yet — I've recorded your request so the team can prioritize it. Here's what might help in the meantime:", plan: local.alternatives[0] ? { goal: local.alternatives[0].goal, steps: [], toolHref: local.alternatives[0].href, toolName: local.alternatives[0].label } : undefined }
        : { role: "assistant", text: "I'm not sure yet. Try mentioning the file type (PDF, photo, JSON, text) and what you want — smaller, resized, converted, merged. For example: “photo ko Instagram ke liye square banana hai”." };
    }
    setMsgs((m) => [...m, reply]);
    setBusy(false);
  };

  return (
    <div className="container narrow" style={{ paddingBlock: 32 }}>
      <div className="row between" style={{ marginBottom: 20 }}>
        <div><h1 style={{ fontSize: "2rem" }}>AI Assistant</h1><p className="muted" style={{ marginTop: 6 }}>Natural-language problem solving and workflow generation.</p></div>
        <span className={"badge " + (cfg.aiAvailable ? "brand" : "ok")}>{cfg.aiAvailable ? "Smart matching + AI" : "Smart matching (on-device)"}</span>
      </div>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="stack" style={{ padding: 20, maxHeight: "60vh", minHeight: 320, overflowY: "auto" }} aria-live="polite">
          {msgs.map((m, i) => (
            <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "92%" }}>
              <div style={{ padding: "12px 14px", borderRadius: 14, background: m.role === "user" ? "var(--brand)" : "var(--surface-2)", color: m.role === "user" ? "var(--brand-contrast)" : "var(--ink)" }}>
                {m.role === "assistant" && m.plan ? <b>{m.text}</b> : m.text}
                {m.plan && (
                  <div className="stack-sm" style={{ marginTop: 10 }} data-testid="assistant-plan">
                    <div><span className="muted" style={{ fontSize: "0.85rem" }}>Goal</span><br /><b>{m.plan.goal}</b></div>
                    {m.plan.steps.length > 0 && (<><span className="muted" style={{ fontSize: "0.85rem" }}>Recommended</span><FlowPills steps={m.plan.steps} max={8} /></>)}
                    <div className="row" style={{ marginTop: 6 }}>
                      {m.plan.steps.length > 0 && (
                        <a className="btn btn-primary btn-sm" href={m.plan.slug ? `/workflows/builder?from=${m.plan.slug}` : `/workflows/builder?steps=${encodeSteps(m.plan.steps)}${m.plan.input ? `&input=${m.plan.input}` : ""}`}>Create This Workflow <Icon name="arrow-right" size={14} /></a>
                      )}
                      {m.plan.slug && <a className="btn btn-secondary btn-sm" href={`/workflows/${m.plan.slug}`}>Run it now</a>}
                      {m.plan.toolHref && <a className="btn btn-ghost btn-sm" href={m.plan.toolHref}>Open {m.plan.toolName}</a>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          {busy && <div className="muted row" style={{ gap: 8 }}><Icon name="loader" className="spin" size={16} /> Thinking…</div>}
          <div ref={endRef} />
        </div>
        <form className="row" style={{ borderTop: "1px solid var(--line)", padding: 12, flexWrap: "nowrap" }} onSubmit={(e) => { e.preventDefault(); ask(input); }}>
          <input className="input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="e.g. Mare image website ma use karvi che ane size pan ochhi joiye" aria-label="Message" maxLength={300} />
          <button className="btn btn-primary" type="submit" disabled={busy || !input.trim()} aria-label="Send"><Icon name="send" size={17} /></button>
        </form>
      </div>
      <div className="chips" style={{ marginTop: 16 }}>
        {["Mare image website ma use karvi che ane size pan ochhi joiye", "Exam form ke liye photo 50kb se kam", "Merge 3 PDFs and make it small for email", "Clean this JSON for my API"].map((s) => (
          <button key={s} className="chip" type="button" onClick={() => ask(s)}>{s}</button>
        ))}
      </div>
      {!cfg.aiAvailable && <p className="hint" style={{ marginTop: 16 }}><Icon name="shield-check" size={13} /> Requests are matched on-device. Deterministic tasks never need an AI call.</p>}
    </div>
  );
}

