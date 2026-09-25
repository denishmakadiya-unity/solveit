import { useEffect, useState, type ReactNode } from "react";
import { Icon } from "./Icon";
import type { FAQ as FAQT, ToolDefinition, Workflow } from "../registry/types";
import { toolHref } from "../registry/tools";
import { stepById } from "../registry/steps";
import { categoryById } from "../registry/categories";
import { useConfig } from "../lib/flags";
import { ADSENSE_CLIENT } from "../config";
import { track } from "../lib/analytics";

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg className="logo-mark" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id="lg-s" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4d74ff" />
          <stop offset="1" stopColor="#2240d8" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#lg-s)" />
      <path d="M9.5 16.5l4.2 4.2 8.8-9.4" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="24" cy="8" r="2.6" fill="#ffb020" />
    </svg>
  );
}

export function Logo() {
  return (
    <a href="/" className="logo" aria-label="SolveIt home">
      <LogoMark />
      <span>Solve<b>It</b></span>
    </a>
  );
}

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="breadcrumbs">
      {items.map((it, i) => (
        <span key={i} className="row" style={{ gap: 6 }}>
          {i > 0 && <Icon name="chevron-right" size={14} />}
          {it.href ? <a href={it.href}>{it.label}</a> : <span aria-current="page" style={{ color: "var(--ink-2)" }}>{it.label}</span>}
        </span>
      ))}
    </nav>
  );
}

export function FAQList({ items }: { items: FAQT[] }) {
  return (
    <div className="faq">
      {items.map((f, i) => (
        <details key={i}>
          <summary>{f.q}</summary>
          <p>{f.a}</p>
        </details>
      ))}
    </div>
  );
}

export function ToolCard({ tool, compact }: { tool: ToolDefinition; compact?: boolean }) {
  const cat = categoryById(tool.category);
  return (
    <a className="card tool-card" href={toolHref(tool)} data-tool={tool.id}>
      <span className={"tile-icon" + (tool.category === "calculators" || tool.category === "business" ? " sun" : "")}>
        <Icon name={tool.icon} size={20} />
      </span>
      <span style={{ minWidth: 0 }}>
        <h3>
          {tool.name}
          {tool.isNew && <span className="badge new" style={{ marginLeft: 8, verticalAlign: 2 }}>New</span>}
        </h3>
        {!compact && <p>{tool.description}</p>}
        {compact && <p>{cat.name}</p>}
      </span>
    </a>
  );
}

export function FlowPills({ steps, max = 6 }: { steps: { step: string }[]; max?: number }) {
  const shown = steps.slice(0, max);
  return (
    <div className="flow" aria-label="Steps">
      {shown.map((s, i) => (
        <span key={i} className="row" style={{ gap: 6 }}>
          {i > 0 && <span className="arrow"><Icon name="arrow-right" size={13} /></span>}
          <span className="step-pill">{stepById(s.step)?.name || s.step}</span>
        </span>
      ))}
      {steps.length > max && <span className="muted" style={{ fontSize: "0.82rem" }}>+{steps.length - max}</span>}
    </div>
  );
}

export function WorkflowCard({ wf }: { wf: Workflow }) {
  return (
    <a className="card stack-sm" href={`/workflows/${wf.slug}`} style={{ padding: 18 }}>
      <span className="row" style={{ gap: 12, flexWrap: "nowrap" }}>
        <span className="tile-icon"><Icon name={wf.icon} size={20} /></span>
        <span style={{ minWidth: 0 }}>
          <h3 style={{ fontSize: "1rem" }}>{wf.name}</h3>
          <span className="muted" style={{ fontSize: "0.84rem" }}>{wf.inputLabel} → {wf.output}</span>
        </span>
      </span>
      <p className="muted" style={{ fontSize: "0.9rem" }}>{wf.goal}</p>
      <FlowPills steps={wf.steps} max={4} />
    </a>
  );
}

export function ProcessingBadge({ mode }: { mode: "client" | "server" | "hybrid" | "ai" }) {
  if (mode === "server" || mode === "ai")
    return <span className="proc-badge server"><Icon name="lock" size={14} /> Secure server processing</span>;
  return <span className="proc-badge"><Icon name="shield-check" size={14} /> Runs in your browser</span>;
}

export function Alert({ kind = "info", children }: { kind?: "info" | "err" | "warn" | "ok"; children: ReactNode }) {
  const icon = kind === "err" ? "alert" : kind === "warn" ? "alert" : kind === "ok" ? "circle-check" : "info";
  return (
    <div className={`alert ${kind}`} role={kind === "err" ? "alert" : "status"}>
      <Icon name={icon} size={17} />
      <div>{children}</div>
    </div>
  );
}

export function Field({ label, hint, children, htmlFor }: { label: string; hint?: ReactNode; children: ReactNode; htmlFor?: string }) {
  return (
    <label className="field" htmlFor={htmlFor}>
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

export function NumberInput({ id, value, onChange, min, max, step, suffix, prefix }: {
  id: string; value: number | string; onChange: (v: string) => void; min?: number; max?: number; step?: number | string; suffix?: string; prefix?: string;
}) {
  const input = (
    <input id={id} className="input" type="number" inputMode="decimal" value={value} min={min} max={max} step={step ?? "any"}
      onChange={(e) => onChange(e.target.value)} />
  );
  if (!suffix && !prefix) return input;
  return (
    <div className="input-group">
      {prefix && <span className="addon">{prefix}</span>}
      {input}
      {suffix && <span className="addon">{suffix}</span>}
    </div>
  );
}

export function Seg<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; label: string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button type="button" className="toggle" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} />;
}

let toastTimer: any;
export function toast(msg: string) {
  if (typeof document === "undefined") return;
  let el = document.getElementById("toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.className = "toast";
    el.setAttribute("role", "status");
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el && (el.hidden = true), 2200);
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast("Copied to clipboard");
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); toast("Copied to clipboard"); } catch { toast("Select the text and copy it manually"); }
    ta.remove();
  }
}

export function CopyButton({ text, label = "Copy", className = "btn btn-secondary btn-sm" }: { text: string; label?: string; className?: string }) {
  return (
    <button type="button" className={className} onClick={() => copyText(text)} disabled={!text}>
      <Icon name="copy" size={15} /> {label}
    </button>
  );
}

export function downloadBlob(blob: Blob, name: string, tool?: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
  track("tool_download", { tool });
}

// Ads are served by AdSense Auto ads (script in <head>, added at build time from ADSENSE_CLIENT).
// A manual unit renders only when a real numeric ad-unit ID is passed as `unit`.
export function AdSlot({ unit, format = "horizontal" }: { id?: string; unit?: string; format?: "horizontal" | "rectangle" }) {
  const cfg = useConfig();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const ok = mounted && cfg.adsEnabled && !!ADSENSE_CLIENT && !!unit && /^\d+$/.test(unit);
  useEffect(() => {
    if (!ok) return;
    try { const w = window as any; (w.adsbygoogle = w.adsbygoogle || []).push({}); } catch { /* ad blockers */ }
  }, [ok]);
  if (!ok) return null;
  return (
    <aside className="ad-slot" aria-label="Advertisement">
      <span className="ad-label">Advertisement</span>
      <ins className="adsbygoogle" style={{ display: "block", width: "100%" }} data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={unit} data-ad-format={format === "rectangle" ? "rectangle" : "auto"} data-full-width-responsive="true" />
    </aside>
  );
}

export function SectionHead({ eyebrow, title, desc, action }: { eyebrow?: string; title: string; desc?: string; action?: ReactNode }) {
  return (
    <div className="section-head">
      <div>
        {eyebrow && <div className="eyebrow" style={{ marginBottom: 6 }}>{eyebrow}</div>}
        <h2>{title}</h2>
        {desc && <p>{desc}</p>}
      </div>
      {action}
    </div>
  );
}

export function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}

export function useQueryParam(name: string) {
  const [v, setV] = useState<string | null>(null);
  useEffect(() => {
    setV(new URLSearchParams(location.search).get(name));
  }, [name]);
  return v;
}
