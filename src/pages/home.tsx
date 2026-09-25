import { useEffect, useState } from "react";
import { Icon } from "../components/Icon";
import { AdSlot, FAQList, SectionHead, WorkflowCard } from "../components/ui";
import { CATEGORIES } from "../registry/categories";
import { TOOLS, toolsByCategory } from "../registry/tools";
import { WORKFLOWS } from "../registry/workflows";
import { EXAMPLE_PROMPTS, MULTILINGUAL_EXAMPLES } from "../lib/intent";
import { workspace, type RecentResult } from "../lib/storage";
import { formatBytes, timeAgo } from "../lib/format";

export function SolverBox({ initial = "", autoFocus = false, size = "lg" }: { initial?: string; autoFocus?: boolean; size?: "lg" | "md" }) {
  const [q, setQ] = useState(initial);
  const [ph, setPh] = useState(0);
  useEffect(() => setQ(initial), [initial]);
  useEffect(() => {
    const t = setInterval(() => setPh((p) => (p + 1) % MULTILINGUAL_EXAMPLES.length), 3200);
    return () => clearInterval(t);
  }, []);
  return (
    <form className="solver" action="/solve" method="get" role="search" onSubmit={(e) => { if (!q.trim()) e.preventDefault(); }}>
      <div className="solver-box">
        <Icon name="wand" size={22} className="spark" />
        <input name="q" value={q} onChange={(e) => setQ(e.target.value)} autoFocus={autoFocus} autoComplete="off" enterKeyHint="go"
          placeholder={`e.g. ${MULTILINGUAL_EXAMPLES[ph]}…`} aria-label="What do you want to get done?" maxLength={200} />
        <button className={"btn btn-primary " + (size === "lg" ? "btn-lg" : "")} type="submit">Solve It <Icon name="arrow-right" size={18} /></button>
      </div>
    </form>
  );
}

const TASKS = [
  { label: "Make a PDF smaller", href: "/tools/pdf/compress-pdf", icon: "shrink", sub: "WhatsApp, email, portals" },
  { label: "Resize a photo", href: "/tools/image/image-resizer", icon: "scaling", sub: "Exact pixels or presets" },
  { label: "Photos to one PDF", href: "/workflows/scan-to-pdf", icon: "file-image", sub: "Scans, notes, receipts" },
  { label: "Image for a website", href: "/workflows/website-image", icon: "globe", sub: "WebP, compressed, clean" },
  { label: "Calculate loan EMI", href: "/tools/calculators/emi-calculator", icon: "landmark", sub: "With yearly schedule" },
  { label: "Add or remove GST", href: "/tools/calculators/gst-calculator", icon: "receipt", sub: "CGST / SGST split" },
  { label: "Clean up JSON", href: "/workflows/api-ready-json", icon: "braces", sub: "Validate → minify" },
  { label: "Create a QR code", href: "/tools/developer/qr-code-generator", icon: "qr-code", sub: "Link, UPI, Wi-Fi" },
];

const HOME_FAQ = [
  { q: "Is SolveIt really free?", a: "Yes. Every tool and workflow is free to use without an account. The site is supported by unobtrusive ads that never cover tool controls." },
  { q: "Are my files uploaded anywhere?", a: "No, for all file tools. PDF, image, text and developer tools run entirely in your browser — your files never leave your device. Each tool page shows a “Runs in your browser” badge so you always know." },
  { q: "Can I type my problem in Hindi or Gujarati?", a: "Yes. The problem solver understands English, Hindi, Hinglish and Gujarati — for example “PDF chhota karna hai” or “photo nani karvi che”." },
  { q: "What is a workflow?", a: "A workflow chains several tools into one goal. For example, Website Image resizes, converts to WebP, compresses and removes metadata in one run — you upload the file only once." },
  { q: "Do I need to install anything?", a: "No. SolveIt works in any modern browser on phone, tablet or computer." },
];

function RecentStrip() {
  const [recents, setRecents] = useState<RecentResult[] | null>(null);
  const [saved, setSaved] = useState(0);
  useEffect(() => { setRecents(workspace.recents().slice(0, 3)); setSaved(workspace.saved().length); }, []);
  if (recents === null) return null;
  return (
    <section className="section tight">
      <div className="container">
        <SectionHead eyebrow="Recent workspace" title={recents.length ? "Pick up where you left off" : "Your workspace lives in your browser"}
          desc={recents.length ? undefined : "Results, saved workflows and favorites appear here automatically — no account needed."}
          action={<a className="btn btn-secondary" href="/workspace"><Icon name="folder" size={16} /> Open workspace{saved ? ` · ${saved} saved` : ""}</a>} />
        {recents.length > 0 && (
          <div className="grid grid-3">
            {recents.map((r) => (
              <a key={r.id} className="card tool-card" href={r.href}>
                <span className="tile-icon"><Icon name={r.kind === "workflow" ? "workflow" : "history"} size={20} /></span>
                <span style={{ minWidth: 0 }}>
                  <h3>{r.title}</h3>
                  <p>{r.outputName}{r.outputSize ? ` · ${formatBytes(r.outputSize)}` : ""} · {timeAgo(r.ts)}</p>
                </span>
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default function Home() {
  const popularWf = WORKFLOWS.filter((w) => w.popular).slice(0, 6);
  return (
    <>
      <section className="hero">
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: 18 }}>
            <span className="badge brand"><Icon name="sparkles" size={13} /> {TOOLS.length} tools · {WORKFLOWS.length} workflows · free</span>
          </div>
          <h1>What do you want to get done?</h1>
          <p className="lead">Describe your task in simple words. We'll find the right tools and create the fastest solution.</p>
          <SolverBox />
          <div className="solver-examples" aria-label="Example requests">
            {EXAMPLE_PROMPTS.map((p) => <a key={p} className="chip" href={`/solve?q=${encodeURIComponent(p)}`}>{p}</a>)}
          </div>
          <div className="trust-row">
            <span><Icon name="shield-check" size={16} /> Files stay on your device</span>
            <span><Icon name="zap" size={16} /> No sign-up</span>
            <span><Icon name="globe" size={16} /> English, हिंदी, ગુજરાતી</span>
          </div>
        </div>
      </section>

      <section className="section tight">
        <div className="container">
          <SectionHead eyebrow="Popular tasks" title="Most people come here to…" />
          <div className="grid grid-4">
            {TASKS.map((t) => (
              <a key={t.href} className="card tool-card" href={t.href}>
                <span className="tile-icon"><Icon name={t.icon} size={20} /></span>
                <span><h3>{t.label}</h3><p>{t.sub}</p></span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="section tight">
        <div className="container">
          <SectionHead eyebrow="Browse categories" title="Tools by category" desc="A focused set of high-quality tools — each one fast, private and free."
            action={<a className="btn btn-secondary" href="/tools">All tools <Icon name="arrow-right" size={16} /></a>} />
          <div className="grid grid-4">
            {CATEGORIES.map((c) => (
              <a key={c.id} className="card stack-sm" href={`/categories/${c.slug}`} style={{ padding: 18 }}>
                <span className="row between"><span className="tile-icon"><Icon name={c.icon} size={20} /></span><span className="badge">{toolsByCategory(c.id).length} tools</span></span>
                <h3 style={{ marginTop: 6 }}>{c.name}</h3>
                <p className="muted" style={{ fontSize: "0.9rem" }}>{c.short}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      <div className="container"><AdSlot id="home-mid" /></div>

      <section className="section tight">
        <div className="container">
          <SectionHead eyebrow="Popular workflows" title="Complete solutions, not just tools" desc="Each workflow chains several steps. Upload once — SolveIt does the rest."
            action={<a className="btn btn-secondary" href="/workflows">All {WORKFLOWS.length} workflows <Icon name="arrow-right" size={16} /></a>} />
          <div className="grid grid-3">{popularWf.map((w) => <WorkflowCard key={w.slug} wf={w} />)}</div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHead eyebrow="How it works" title="From problem to finished file in four steps" />
          <div className="steps-row">
            {[
              ["Describe", "Type your goal in your own words — “PDF chhota karna hai” works too."],
              ["We understand", "SolveIt picks the right tool or a multi-step workflow for your goal."],
              ["Upload once & run", "Every step runs on the same file, right in your browser."],
              ["Next best action", "Download, share, or continue with a related step in one click."],
            ].map(([t, d], i) => (
              <div key={t} className="step-card"><div className="step-num">{i + 1}</div><h3>{t}</h3><p className="muted" style={{ marginTop: 6, fontSize: "0.94rem" }}>{d}</p></div>
            ))}
          </div>
        </div>
      </section>

      <RecentStrip />

      <section className="section">
        <div className="container">
          <div className="card pad-lg" style={{ display: "grid", gap: 28, gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))", alignItems: "center" }}>
            <div className="stack">
              <span className="eyebrow">Privacy & security</span>
              <h2>Your files never leave your device</h2>
              <p className="muted">PDF, image, text and developer tools process everything locally in your browser using JavaScript. There's no upload, so there's nothing to store, leak or delete.</p>
              <div className="row"><a className="btn btn-secondary" href="/privacy">Read our privacy policy</a></div>
            </div>
            <ul className="stack-sm" style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {[
                ["shield-check", "Runs in your browser", "Clearly labeled on every tool that processes locally."],
                ["lock", "HTTPS & strict security headers", "Encrypted connections and a locked-down content policy."],
                ["eye-off", "No file contents in analytics", "We count tool usage, never what's inside your files."],
                ["user", "No account required", "Use everything without signing up."],
              ].map(([i, t, d]) => (
                <li key={t} className="row" style={{ alignItems: "flex-start", flexWrap: "nowrap", gap: 12 }}>
                  <span className="tile-icon" style={{ width: 36, height: 36, background: "var(--ok-soft)", color: "var(--ok)" }}><Icon name={i} size={18} /></span>
                  <span><b>{t}</b><br /><span className="muted" style={{ fontSize: "0.92rem" }}>{d}</span></span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="section tight">
        <div className="container narrow">
          <SectionHead title="Frequently asked questions" />
          <FAQList items={HOME_FAQ} />
        </div>
      </section>
    </>
  );
}

export { HOME_FAQ };
