import { useEffect, useMemo, useState } from "react";
import { Icon } from "../components/Icon";
import { AdSlot, Alert, Breadcrumbs, Field, FlowPills, ProcessingBadge, SectionHead, ToolCard, WorkflowCard, toast } from "../components/ui";
import { WorkflowRunner } from "../components/WorkflowRunner";
import { WORKFLOWS, workflowBySlug } from "../registry/workflows";
import { compatibleSteps, stepById, stepOutputKind } from "../registry/steps";
import { TEMPLATE_CATEGORIES, templateCategoryById, workflowsForAudience } from "../registry/templates";
import { toolById } from "../registry/tools";
import type { ItemKind, Workflow, WorkflowStep } from "../registry/types";
import { workspace } from "../lib/storage";
import { track } from "../lib/analytics";

const KINDS: { value: ItemKind; label: string; icon: string }[] = [
  { value: "image", label: "Images", icon: "image" }, { value: "pdf", label: "PDF", icon: "file-text" },
  { value: "json", label: "JSON", icon: "braces" }, { value: "csv", label: "CSV", icon: "table" }, { value: "text", label: "Text", icon: "type" },
];

export function WorkflowsPage() {
  const [kind, setKind] = useState<ItemKind | "all">("all");
  const [q, setQ] = useState("");
  const list = WORKFLOWS.filter((w) => (kind === "all" || w.input === kind) && (!q || (w.name + w.goal + w.keywords.join(" ")).toLowerCase().includes(q.toLowerCase())));
  return (
    <div className="container" style={{ paddingBlock: 36 }}>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Workflows" }]} />
      <div className="tool-head">
        <div><h1>Workflows</h1><p className="lead">{WORKFLOWS.length} ready-made solutions for common goals. Each one chains several tools — you upload once and every step runs automatically.</p></div>
        <a className="btn btn-primary" href="/workflows/builder"><Icon name="plus" size={17} /> Build your own</a>
      </div>
      <div className="stack" style={{ marginBottom: 24 }}>
        <label className="header-search" style={{ height: 46, maxWidth: 480, width: "100%" }}>
          <Icon name="search" size={17} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a workflow (e.g. whatsapp, instagram, api)" aria-label="Filter workflows" />
        </label>
        <div className="chips">
          <button className="chip" aria-pressed={kind === "all"} onClick={() => setKind("all")}>All</button>
          {KINDS.map((k) => <button key={k.value} className="chip" aria-pressed={kind === k.value} onClick={() => setKind(k.value)}><Icon name={k.icon} size={15} /> {k.label} ({WORKFLOWS.filter((w) => w.input === k.value).length})</button>)}
        </div>
      </div>
      {list.length ? <div className="grid grid-3" data-testid="workflow-list">{list.map((w) => <WorkflowCard key={w.slug} wf={w} />)}</div>
        : <div className="empty-state"><h3>No workflows match</h3><p style={{ marginTop: 6 }}><a href="/workflows/builder">Build a custom workflow</a> instead.</p></div>}
    </div>
  );
}

export function WorkflowDetailPage({ slug }: { slug: string }) {
  const w = workflowBySlug(slug)!;
  const related = WORKFLOWS.filter((x) => x.slug !== w.slug && x.input === w.input).slice(0, 3);
  const tools = [...new Set(w.steps.map((s) => stepById(s.step)?.toolSlug?.split("/")[1]).filter(Boolean) as string[])].map((id) => toolById(id)!).filter(Boolean);
  return (
    <div className="container" style={{ paddingBlock: 28 }}>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Workflows", href: "/workflows" }, { label: w.name }]} />
      <div className="tool-head">
        <div style={{ maxWidth: 760 }}>
          <span className="eyebrow">{w.steps.length}-step workflow · {w.inputLabel} input</span>
          <h1 style={{ fontSize: "clamp(1.9rem, 3.4vw, 2.6rem)", marginTop: 6 }}>{w.name}</h1>
          <p className="lead">{w.goal} {w.description}</p>
        </div>
        <ProcessingBadge mode="client" />
      </div>
      <div className="card flat" style={{ marginBottom: 20, display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))" }}>
        <div><div className="label">Goal</div><div>{w.goal}</div></div>
        <div><div className="label">Steps</div><FlowPills steps={w.steps} max={8} /></div>
        <div><div className="label">Output</div><div>{w.output}</div></div>
      </div>
      <div className="tool-layout">
        <div className="stack" style={{ gap: 28, minWidth: 0 }}>
          <div className="tool-shell"><WorkflowRunner name={w.name} steps={w.steps} input={w.input} multiple={w.multiple} slug={w.slug} /></div>
          <AdSlot id={`wf-${w.slug}`} />
          {tools.length > 0 && (
            <section><h2 style={{ fontSize: "1.3rem", marginBottom: 14 }}>Tools used in this workflow</h2><div className="grid grid-2">{tools.map((t) => <ToolCard key={t.id} tool={t} />)}</div></section>
          )}
        </div>
        <aside className="side-stack">
          <div className="card">
            <h3 style={{ fontSize: "0.95rem", marginBottom: 12 }}>Similar workflows</h3>
            <div className="stack-sm">{related.map((r) => <a key={r.slug} href={`/workflows/${r.slug}`} className="row" style={{ gap: 10, flexWrap: "nowrap", color: "var(--ink)" }}><Icon name={r.icon} size={16} /> {r.name}</a>)}</div>
          </div>
          <div className="card" style={{ background: "var(--brand-soft)", borderColor: "transparent" }}>
            <h3 style={{ fontSize: "0.95rem" }}>Need different settings?</h3>
            <p className="muted" style={{ fontSize: "0.9rem", margin: "6px 0 12px" }}>Change sizes, formats or add steps in the builder.</p>
            <a className="btn btn-primary btn-sm" href={`/workflows/builder?from=${w.slug}`}><Icon name="sliders" size={15} /> Customize</a>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ParamEditor({ step, onChange }: { step: WorkflowStep; onChange: (p: Record<string, any>) => void }) {
  const d = stepById(step.step)!;
  const p = { ...d.defaults, ...(step.params || {}) };
  if (!d.params.length) return <p className="hint" style={{ gridColumn: "2 / -1" }}>No settings needed for this step.</p>;
  return (
    <div className="tl-config">
      {d.params.map((pr) => {
        const id = `p-${step.step}-${pr.key}`;
        if (pr.type === "select") return <Field key={pr.key} label={pr.label} htmlFor={id}><select id={id} className="select" value={p[pr.key]} onChange={(e) => onChange({ ...p, [pr.key]: e.target.value })}>{pr.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></Field>;
        if (pr.type === "boolean") return <label key={pr.key} className="check"><input type="checkbox" checked={!!p[pr.key]} onChange={(e) => onChange({ ...p, [pr.key]: e.target.checked })} /> {pr.label}</label>;
        if (pr.type === "number") return (
          <Field key={pr.key} label={pr.label} htmlFor={id}>
            <div className="input-group"><input id={id} className="input" type="number" min={pr.min} max={pr.max} value={p[pr.key]} onChange={(e) => onChange({ ...p, [pr.key]: e.target.value === "" ? "" : +e.target.value })} />{pr.unit && <span className="addon">{pr.unit}</span>}</div>
          </Field>
        );
        return <Field key={pr.key} label={pr.label} htmlFor={id}><input id={id} className="input" value={p[pr.key]} placeholder={pr.placeholder} onChange={(e) => onChange({ ...p, [pr.key]: e.target.value })} /></Field>;
      })}
    </div>
  );
}

export function BuilderPage() {
  const [name, setName] = useState("My workflow");
  const [input, setInput] = useState<ItemKind>("image");
  const [steps, setSteps] = useState<WorkflowStep[]>([{ step: "resize", params: { width: 1200, height: 1200, fit: "inside", background: "#ffffff" } }, { step: "convert", params: { format: "webp", quality: 82 } }, { step: "strip-metadata" }]);
  const [savedId, setSavedId] = useState<string>();
  const [from, setFrom] = useState<string>();
  const [open, setOpen] = useState<number | null>(null);
  const [dragI, setDragI] = useState<number | null>(null);

  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    const f = sp.get("from"), s = sp.get("saved"), st = sp.get("steps"), inp = sp.get("input") as ItemKind | null;
    if (f && workflowBySlug(f)) {
      const w = workflowBySlug(f)!;
      setName(`${w.name} (custom)`); setInput(w.input); setSteps(JSON.parse(JSON.stringify(w.steps))); setFrom(w.slug);
    } else if (s) {
      const w = workspace.saved().find((x) => x.id === s);
      if (w) { setName(w.name); setInput(w.input); setSteps(w.steps); setSavedId(w.id); }
    } else if (st) {
      const list = st.split(",").filter((x) => stepById(x)).map((x) => ({ step: x }));
      const kind = inp && KINDS.some((k) => k.value === inp) ? inp : (stepById(list[0]?.step)?.accepts[0] as ItemKind) || "image";
      setInput(kind); setSteps(list); setName("Assistant workflow");
    }
  }, []);

  // Kind flowing into each step, and validity.
  const chain = useMemo(() => {
    let k: string = input;
    return steps.map((s) => {
      const d = stepById(s.step);
      const ok = !!d && d.accepts.includes(k as ItemKind);
      const inK = k;
      if (ok) k = stepOutputKind(s.step, k);
      return { ok, inK, outK: k };
    });
  }, [steps, input]);
  const endKind = chain.length ? chain[chain.length - 1].outK : input;
  const invalid = chain.findIndex((c) => !c.ok);
  const palette = compatibleSteps(endKind);

  const add = (id: string) => { setSteps([...steps, { step: id }]); setOpen(steps.length); track("workflow_step_added", { meta: id }); };
  const remove = (i: number) => { setSteps(steps.filter((_, k) => k !== i)); setOpen(null); track("workflow_step_removed", { meta: steps[i].step }); };
  const moveStep = (i: number, j: number) => {
    if (j < 0 || j >= steps.length) return;
    const a = steps.slice(); const [x] = a.splice(i, 1); a.splice(j, 0, x); setSteps(a); setOpen(null);
  };
  const save = () => {
    const w = workspace.saveWorkflow({ id: savedId, name: name.trim() || "My workflow", input, steps, from });
    setSavedId(w.id);
    toast("Workflow saved to My Workspace");
  };

  return (
    <div className="container" style={{ paddingBlock: 28 }}>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Workflows", href: "/workflows" }, { label: "Builder" }]} />
      <div className="tool-head">
        <div><h1 style={{ fontSize: "clamp(1.8rem, 3.2vw, 2.4rem)" }}>Workflow Builder</h1><p className="lead">Chain tools together. Add, reorder and configure steps, then run them on one upload.</p></div>
        <div className="row"><button className="btn btn-secondary" onClick={save}><Icon name="save" size={16} /> Save workflow</button></div>
      </div>
      <div className="tool-layout" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)" }}>
        <div className="stack">
          <div className="card stack">
            <div className="form-grid">
              <Field label="Workflow name" htmlFor="wn"><input id="wn" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} /></Field>
              <Field label="Start with" htmlFor="wi">
                <select id="wi" className="select" value={input} onChange={(e) => { setInput(e.target.value as ItemKind); setSteps([]); setOpen(null); }}>
                  {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
                </select>
              </Field>
            </div>
          </div>
          <div className="card stack">
            <div className="row between"><h3>Steps</h3><span className="muted" style={{ fontSize: "0.88rem" }}>Output: <b>{endKind.toUpperCase()}</b></span></div>
            {steps.length === 0 && <div className="empty-state" style={{ padding: 24 }}>Add your first step from the list below.</div>}
            <ol className="timeline" style={{ listStyle: "none", padding: 0, margin: 0 }} data-testid="builder-steps">
              {steps.map((s, i) => {
                const d = stepById(s.step)!;
                return (
                  <li key={i} className={"tl-step" + (chain[i].ok ? "" : " failed")} draggable
                    onDragStart={() => setDragI(i)} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (dragI !== null) moveStep(dragI, i); setDragI(null); }}>
                    <span className="n" title="Drag to reorder" style={{ cursor: "grab" }}>{i + 1}</span>
                    <div style={{ minWidth: 0 }}>
                      <div className="t">{d.name}</div>
                      <div className="d">{chain[i].ok ? d.short : `Can't take ${chain[i].inK.toUpperCase()} here — move or remove this step.`}</div>
                    </div>
                    <div className="controls">
                      <button className="btn btn-ghost btn-sm btn-icon" aria-label={`Configure ${d.name}`} aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}><Icon name="settings" size={16} /></button>
                      <button className="btn btn-ghost btn-sm btn-icon" aria-label={`Move ${d.name} up`} disabled={i === 0} onClick={() => moveStep(i, i - 1)}><Icon name="chevron-up" size={16} /></button>
                      <button className="btn btn-ghost btn-sm btn-icon" aria-label={`Move ${d.name} down`} disabled={i === steps.length - 1} onClick={() => moveStep(i, i + 1)}><Icon name="chevron-down" size={16} /></button>
                      <button className="btn btn-ghost btn-sm btn-icon" aria-label={`Remove ${d.name}`} onClick={() => remove(i)}><Icon name="trash" size={16} /></button>
                    </div>
                    {open === i && <ParamEditor step={s} onChange={(p) => setSteps(steps.map((x, k) => (k === i ? { ...x, params: p } : x)))} />}
                  </li>
                );
              })}
            </ol>
            <div>
              <div className="label" style={{ marginBottom: 8 }}>Add step <span className="muted" style={{ fontWeight: 400 }}>(works with {endKind.toUpperCase()})</span></div>
              <div className="palette" data-testid="palette">
                {palette.map((p) => (
                  <button key={p.id} type="button" onClick={() => add(p.id)}>
                    <span className="tile-icon" style={{ width: 32, height: 32, borderRadius: 9 }}><Icon name={p.icon} size={16} /></span>
                    <span><b style={{ fontSize: "0.9rem" }}>{p.name}</b><small>{p.short}</small></span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="stack">
          <div className="card stack">
            <h3>Preview & run</h3>
            {invalid >= 0 ? <Alert kind="warn">Step {invalid + 1} doesn't accept {chain[invalid].inK.toUpperCase()}. Reorder or remove it to run.</Alert> : steps.length > 0 && <FlowPills steps={steps} max={10} />}
            {invalid < 0 && steps.length > 0
              ? <WorkflowRunner name={name} steps={steps} input={input} multiple={input === "image" || input === "pdf"} savedId={savedId} slug={from ? `custom-${from}` : undefined} onSaved={() => setSavedId(workspace.saved()[0]?.id)} />
              : steps.length === 0 && <p className="muted">Add steps to preview and run your workflow.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

export function TemplatesPage() {
  return (
    <div className="container" style={{ paddingBlock: 36 }}>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Templates" }]} />
      <div className="tool-head"><div><h1>Templates</h1><p className="lead">Ready-made recipes for common goals, grouped by who you are. Each template shows the goal, the steps and the output.</p></div></div>
      <div className="stack" style={{ gap: 40 }}>
        {TEMPLATE_CATEGORIES.map((c) => {
          const wfs = workflowsForAudience(c.id).slice(0, 3);
          return (
            <section key={c.id}>
              <SectionHead title={c.name} desc={c.intro} action={<a className="btn btn-ghost btn-sm" href={`/templates/${c.id}`}>All {c.name.toLowerCase()} templates <Icon name="arrow-right" size={14} /></a>} />
              <div className="grid grid-3">{wfs.map((w) => <TemplateCard key={w.slug} w={w} />)}</div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function TemplateCard({ w }: { w: Workflow }) {
  return (
    <a className="card stack-sm" href={`/workflows/${w.slug}`} style={{ padding: 18 }}>
      <span className="row" style={{ gap: 10 }}><span className="tile-icon"><Icon name={w.icon} size={18} /></span><h3 style={{ fontSize: "1rem" }}>{w.name}</h3></span>
      <dl className="kv" style={{ marginTop: 6 }}>
        <dt>Goal</dt><dd style={{ fontWeight: 400 }}>{w.goal}</dd>
        <dt>Steps</dt><dd><FlowPills steps={w.steps} max={4} /></dd>
        <dt>Output</dt><dd>{w.output}</dd>
      </dl>
    </a>
  );
}

export function TemplateCategoryPage({ id }: { id: string }) {
  const c = templateCategoryById(id)!;
  const wfs = workflowsForAudience(c.id);
  return (
    <div className="container" style={{ paddingBlock: 36 }}>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Templates", href: "/templates" }, { label: c.name }]} />
      <div className="tool-head">
        <div className="row" style={{ gap: 16, alignItems: "flex-start", flexWrap: "nowrap" }}>
          <span className="tile-icon lg"><Icon name={c.icon} size={26} /></span>
          <div><h1>Templates for {c.name}</h1><p className="lead">{c.intro}</p></div>
        </div>
      </div>
      <SectionHead title={`${wfs.length} templates`} />
      <div className="grid grid-3" style={{ marginBottom: 40 }}>{wfs.map((w) => <TemplateCard key={w.slug} w={w} />)}</div>
      <SectionHead title="Handy tools" />
      <div className="grid grid-3">{c.tools.map((t) => toolById(t)).filter(Boolean).map((t) => <ToolCard key={t!.id} tool={t!} />)}</div>
      <div style={{ marginTop: 32 }} className="chips">{TEMPLATE_CATEGORIES.filter((x) => x.id !== c.id).map((x) => <a key={x.id} className="chip" href={`/templates/${x.id}`}><Icon name={x.icon} size={15} /> {x.name}</a>)}</div>
    </div>
  );
}

