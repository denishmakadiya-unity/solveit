import { useEffect, useState } from "react";
import { Icon } from "../components/Icon";
import { AdSlot, Alert, Breadcrumbs, FAQList, Field, SectionHead } from "../components/ui";
import { GUIDES, guideBySlug } from "../registry/guides";
import { TOOLS } from "../registry/tools";
import { WORKFLOWS } from "../registry/workflows";
import { CATEGORIES } from "../registry/categories";
import { SITE, LIMITS } from "../config";

export function GuidesPage() {
  return (
    <div className="container" style={{ paddingBlock: 36 }}>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Guides" }]} />
      <div className="tool-head"><div><h1>Guides</h1><p className="lead">Practical, no-fluff tutorials for everyday digital tasks.</p></div></div>
      <div className="grid grid-2">
        {GUIDES.map((g) => (
          <a key={g.slug} className="card stack-sm" href={`/guides/${g.slug}`} style={{ padding: 22 }}>
            <span className="row" style={{ gap: 8 }}><span className="badge brand">{g.tag}</span><span className="muted" style={{ fontSize: "0.85rem" }}>{g.readMins} min read</span></span>
            <h2 style={{ fontSize: "1.2rem" }}>{g.title}</h2>
            <p className="muted" style={{ fontSize: "0.94rem" }}>{g.description}</p>
          </a>
        ))}
      </div>
    </div>
  );
}

export function GuidePage({ slug }: { slug: string }) {
  const g = guideBySlug(slug)!;
  const more = GUIDES.filter((x) => x.slug !== slug).slice(0, 3);
  const date = new Date(g.date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  return (
    <div className="container narrow" style={{ paddingBlock: 36 }}>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Guides", href: "/guides" }, { label: g.title }]} />
      <article className="prose" style={{ maxWidth: "none" }}>
        <span className="badge brand">{g.tag}</span>
        <h1 style={{ margin: "12px 0 10px" }}>{g.title}</h1>
        <p className="muted">Updated {date} · {g.readMins} min read</p>
        <p className="lead" style={{ marginTop: 18 }}>{g.description}</p>
        {g.sections.map((s) => (
          <section key={s.h}>
            <h2>{s.h}</h2>
            {s.p.map((p, i) => <p key={i}>{p}</p>)}
            {s.list && <ul>{s.list.map((l) => <li key={l}>{l}</li>)}</ul>}
          </section>
        ))}
      </article>
      <div className="card row between" style={{ marginTop: 28, background: "var(--brand-soft)", borderColor: "transparent" }}>
        <b>Ready to try it?</b><a className="btn btn-primary" href={g.cta.href}>{g.cta.label} <Icon name="arrow-right" size={16} /></a>
      </div>
      <div style={{ marginTop: 28 }}><AdSlot id={`guide-${g.slug}`} /></div>
      <SectionHead title="More guides" />
      <div className="stack-sm">{more.map((m) => <a key={m.slug} className="card" href={`/guides/${m.slug}`} style={{ padding: 14 }}><b>{m.title}</b></a>)}</div>
    </div>
  );
}

const HELP: { h: string; items: { q: string; a: string }[] }[] = [
  { h: "Getting started", items: [
    { q: "How do I find the right tool?", a: "Type what you want to do into “Solve a Problem” — for example “make my PDF smaller for email”. SolveIt recommends a tool or a complete workflow. You can also browse All Tools." },
    { q: "Do I need an account?", a: "No. Every tool works without signing in. Your recent results, saved workflows and favorites are kept in your browser." },
    { q: "Which languages can I type in?", a: "The interface is in English. The problem solver also understands Hindi, Hinglish and Gujarati, in both native script and Roman letters." },
  ] },
  { h: "Files & privacy", items: [
    { q: "Are my files uploaded?", a: "No. PDF, image, text, developer, security and calculator tools run in your browser. Look for the green “Runs in your browser” badge. Only AI mode (when available and chosen) sends text to a server." },
    { q: "What are the file size limits?", a: `Images up to ${LIMITS.imageMaxMB} MB each, PDFs up to ${LIMITS.pdfMaxMB} MB, and up to ${LIMITS.maxFiles} files at once. Very large files depend on your device's memory.` },
    { q: "How long are results kept?", a: "Your latest result stays on your device for up to 6 hours so the next tool can reuse it (“upload once”). You can clear it any time from My Workspace." },
  ] },
  { h: "Troubleshooting", items: [
    { q: "My PDF says it's password-protected.", a: "Open it in your PDF app, remove the password (or print to a new PDF), then try again. SolveIt can't open encrypted PDFs." },
    { q: "Compression didn't make my PDF smaller.", a: "Digital PDFs with mostly text are already small. Use Balanced or Strong mode — or a target size — for scanned documents and image-heavy files." },
    { q: "The download button doesn't work on my phone.", a: "Some in-app browsers (like those inside social apps) block downloads. Open SolveIt in Chrome or Safari and try again, or use the Share button." },
    { q: "Background remover left parts of the background.", a: "Increase the tolerance slider. The current version works best with plain, solid backgrounds such as studio shots, white walls or paper." },
  ] },
];

export function HelpPage() {
  return (
    <div className="container narrow" style={{ paddingBlock: 36 }}>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Help & FAQ" }]} />
      <h1>Help & FAQ</h1>
      <p className="lead" style={{ marginTop: 10 }}>Quick answers to common questions. Can't find yours? <a href="/contact">Contact us</a>.</p>
      <div className="stack" style={{ gap: 36, marginTop: 32 }}>
        {HELP.map((s) => <section key={s.h}><h2 style={{ fontSize: "1.3rem", marginBottom: 14 }}>{s.h}</h2><FAQList items={s.items} /></section>)}
      </div>
    </div>
  );
}

export function AboutPage() {
  return (
    <div className="container narrow" style={{ paddingBlock: 36 }}>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "About Us" }]} />
      <article className="prose" style={{ maxWidth: "none" }}>
        <span className="eyebrow">About SolveIt</span>
        <h1 style={{ margin: "10px 0 16px" }}>Stop searching for the right tool. Tell us what you need.</h1>
        <p className="lead">Most tool websites give you hundreds of buttons and leave you to figure out which ones to press, in what order. SolveIt starts from your problem instead.</p>
        <h2>Our mission</h2>
        <p>Make everyday digital tasks — shrinking a PDF for a portal, preparing a photo for Instagram, calculating an EMI — take seconds, for everyone, in the language they think in.</p>
        <h2>What we believe</h2>
        <ul>
          <li><b>Problem first.</b> You describe the goal; we find the tools and the order.</li>
          <li><b>Private by default.</b> If a task can run in your browser, it does. Your files stay on your device.</li>
          <li><b>Quality over quantity.</b> {TOOLS.length} tools that work reliably beat hundreds that don't.</li>
          <li><b>Free first.</b> Basic tools are free with no sign-up, supported by ads that never get in the way.</li>
          <li><b>Built on real demand.</b> We add new tools based on what people actually search for.</li>
        </ul>
        <h2>By the numbers</h2>
      </article>
      <div className="stat-grid" style={{ marginTop: 8 }}>
        <div className="stat"><div className="k">Tools</div><div className="v">{TOOLS.length}</div></div>
        <div className="stat"><div className="k">Workflows</div><div className="v">{WORKFLOWS.length}</div></div>
        <div className="stat"><div className="k">Categories</div><div className="v">{CATEGORIES.length}</div></div>
        <div className="stat"><div className="k">Languages understood</div><div className="v">4</div></div>
      </div>
      <div className="row" style={{ marginTop: 28 }}><a className="btn btn-primary" href="/solve">Solve a problem</a><a className="btn btn-secondary" href="/contact">Get in touch</a></div>
    </div>
  );
}

const TOPICS: Record<string, string> = {
  support: "Help with a tool", "tool-request": "Request a new tool", feedback: "Feedback or idea", bug: "Report a problem",
  business: "Business or partnership", "account-waitlist": "Notify me about accounts", "pricing-waitlist": "Notify me about Pro plans",
};

export function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", topic: "support", message: "", website: "" });
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [err, setErr] = useState("");
  const [t0] = useState(() => Date.now());
  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    const topic = sp.get("topic"), q = sp.get("q");
    setForm((f) => ({ ...f, topic: topic && TOPICS[topic] ? topic : f.topic, message: q ? `I was looking for a tool to: ${q}` : f.message }));
  }, []);
  const set = (k: keyof typeof form) => (e: any) => setForm({ ...form, [k]: e.target.value });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (form.message.trim().length < 10) return setErr("Please write a message of at least 10 characters.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email)) return setErr("Please enter a valid email address so we can reply.");
    setState("sending");
    try {
      const res = await fetch("/api/contact", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...form, elapsed: Date.now() - t0 }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't send your message.");
      setState("sent");
    } catch (e: any) {
      setState("error");
      setErr(`${e.message} You can also email us at ${SITE.supportEmail}.`);
    }
  };
  return (
    <div className="container narrow" style={{ paddingBlock: 36 }}>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Contact Us" }]} />
      <h1>Contact us</h1>
      <p className="lead" style={{ marginTop: 10 }}>Questions, feedback or a tool you wish existed? We read every message and usually reply within two working days.</p>
      <div className="card pad-lg" style={{ marginTop: 24 }}>
        {state === "sent" ? (
          <div className="stack" style={{ alignItems: "center", textAlign: "center" }} data-testid="contact-sent">
            <span className="tile-icon lg" style={{ background: "var(--ok-soft)", color: "var(--ok)" }}><Icon name="circle-check" size={26} /></span>
            <h2>Message sent</h2>
            <p className="muted">Thanks, {form.name || "friend"}! We'll reply to {form.email}.</p>
            <a className="btn btn-secondary" href="/">Back to home</a>
          </div>
        ) : (
          <form className="stack" onSubmit={submit} noValidate>
            <div className="form-grid">
              <Field label="Your name" htmlFor="cn"><input id="cn" className="input" value={form.name} onChange={set("name")} maxLength={80} autoComplete="name" /></Field>
              <Field label="Email" htmlFor="ce"><input id="ce" className="input" type="email" required value={form.email} onChange={set("email")} maxLength={120} autoComplete="email" /></Field>
            </div>
            <Field label="Topic" htmlFor="ct"><select id="ct" className="select" value={form.topic} onChange={set("topic")}>{Object.entries(TOPICS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
            <Field label="Message" htmlFor="cm"><textarea id="cm" className="textarea" required value={form.message} onChange={set("message")} maxLength={4000} style={{ minHeight: 150 }} /></Field>
            <div aria-hidden="true" style={{ position: "absolute", left: -9999, width: 1, height: 1, overflow: "hidden" }}>
              <label>Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} /></label>
            </div>
            {err && <Alert kind="err">{err}</Alert>}
            <div className="row"><button className="btn btn-primary btn-lg" type="submit" disabled={state === "sending"}>{state === "sending" ? "Sending…" : "Send message"}</button>
              <span className="hint">Please don't include passwords or sensitive personal data.</span></div>
          </form>
        )}
      </div>
    </div>
  );
}

function Legal({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="container narrow" style={{ paddingBlock: 36 }}>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: title }]} />
      <article className="prose" style={{ maxWidth: "none" }}>
        <h1>{title}</h1>
        <p className="muted" style={{ marginTop: 8 }}>Last updated: {updated}</p>
        {children}
      </article>
    </div>
  );
}

export function PrivacyPage() {
  return (
    <Legal title="Privacy Policy" updated="25 September 2026">
      <p className="lead">The short version: the tools you use on SolveIt process your files inside your own browser. We never see them.</p>
      <h2>1. How files are processed</h2>
      <p><b>In your browser (most tools).</b> PDF, image, text, calculator, developer, security and data tools run entirely on your device using JavaScript. Files you choose are read locally and results are created locally. They are not uploaded to SolveIt or anyone else. These tools are labeled “Runs in your browser”.</p>
      <p><b>On a server (AI mode only).</b> The AI Writing tools and the AI Assistant work on-device by default. If AI mode is available and you choose it, the text you submit is sent over an encrypted connection to our server and to our AI provider to generate the response. It is not used to train models and is not stored by SolveIt after the response is returned. These tools show “Secure server processing” when AI mode is active.</p>
      <h2>2. Information stored in your browser</h2>
      <p>To power My Workspace, we store in your browser's local storage: names and sizes of recent results (not the files), saved workflows, favorites, recent searches and your theme choice. Your latest result file is kept in your browser's IndexedDB for up to 6 hours so the next tool can reuse it. You can clear all of this from My Workspace or your browser settings.</p>
      <h2>3. Usage analytics</h2>
      <p>We record anonymous product events such as “tool opened”, “tool completed”, “search submitted” and the search text, together with a random per-visit session ID. We use this to improve tools and to decide which new tools to build. Analytics never include file contents, file names or text you paste into tools. If your browser sends a Global Privacy Control signal, analytics are disabled.</p>
      <h2>4. Contact form</h2>
      <p>If you contact us, we store your name, email, topic and message to reply to you. We delete messages after 24 months unless we're required to keep them longer.</p>
      <h2>5. Advertising</h2>
      <p>SolveIt is free and supported by advertising. When ads are enabled, our advertising partner (Google AdSense) may use cookies to show and measure ads, including personalized ads where permitted. You can manage ad personalization at adssettings.google.com. Ads are never placed over tool controls.</p>
      <h2>6. Hosting and security</h2>
      <p>SolveIt is served over HTTPS through Cloudflare's global network. We use strict security headers, rate limiting and input validation. Server logs may include IP addresses for security purposes and are kept for a short period.</p>
      <h2>7. Your rights</h2>
      <p>You can ask us to access or delete any personal data we hold about you (for example, a contact form message). Contact us at {SITE.supportEmail}. If you are in India, this policy is intended to comply with the Digital Personal Data Protection Act, 2023.</p>
      <h2>8. Children</h2>
      <p>SolveIt is not directed at children under 13, and we don't knowingly collect their personal data.</p>
      <h2>9. Changes</h2>
      <p>We'll update this page when our practices change and revise the date above.</p>
    </Legal>
  );
}

export function TermsPage() {
  return (
    <Legal title="Terms of Service" updated="25 September 2026">
      <p className="lead">By using SolveIt you agree to these terms. Please read them carefully.</p>
      <h2>1. The service</h2>
      <p>SolveIt provides online tools and workflows for working with files, text and numbers. Basic tools are free and don't require an account. We may add, change or remove features at any time.</p>
      <h2>2. Acceptable use</h2>
      <ul>
        <li>Only process files and content you have the right to use.</li>
        <li>Don't use SolveIt for anything illegal, to infringe others' rights, or to create misleading documents.</li>
        <li>Don't attempt to disrupt, overload, scrape or reverse-engineer the service or its APIs.</li>
        <li>Don't try to bypass rate limits or security controls.</li>
      </ul>
      <h2>3. Your content</h2>
      <p>You keep all rights to your files and text. Because most processing happens in your browser, we don't receive your files. For AI mode, you grant us the limited right to process the submitted text only to return your result.</p>
      <h2>4. Results and accuracy</h2>
      <p>Tools are provided “as is”. We work hard to make results accurate, but we can't guarantee that every output is error-free or suitable for your purpose. Calculators provide estimates — confirm financial, tax or legal figures with a qualified professional. Always keep a copy of your original files.</p>
      <h2>5. Limitation of liability</h2>
      <p>To the maximum extent permitted by law, SolveIt is not liable for indirect or consequential losses, lost data or lost profits arising from use of the service. Our total liability for any claim is limited to ₹1,000.</p>
      <h2>6. Advertising and third parties</h2>
      <p>The service may display ads and link to third-party sites. We're not responsible for third-party content or practices.</p>
      <h2>7. Future paid plans</h2>
      <p>If we introduce paid plans, their terms will be shown clearly before purchase. Free basic tools will remain available.</p>
      <h2>8. Governing law</h2>
      <p>These terms are governed by the laws of India. Courts at the location of SolveIt's registered office will have jurisdiction.</p>
      <h2>9. Contact</h2>
      <p>Questions about these terms? Email {SITE.supportEmail}.</p>
    </Legal>
  );
}

export function NotFoundPage() {
  return (
    <div className="container narrow" style={{ paddingBlock: 64, textAlign: "center" }}>
      <div style={{ fontFamily: "var(--display)", fontSize: "5rem", fontWeight: 800, color: "var(--brand)", lineHeight: 1 }}>404</div>
      <h1 style={{ fontSize: "2rem", marginTop: 12 }}>This page doesn't exist</h1>
      <p className="lead" style={{ margin: "12px auto 28px" }}>The link may be broken or the page may have moved. Tell us what you were trying to do and we'll find the right tool.</p>
      <form action="/solve" method="get" className="solver" style={{ marginTop: 0 }}>
        <div className="solver-box"><Icon name="wand" size={20} className="spark" /><input name="q" placeholder="What do you want to get done?" aria-label="What do you want to get done?" /><button className="btn btn-primary">Solve It</button></div>
      </form>
      <div className="row" style={{ justifyContent: "center", marginTop: 24 }}>
        <a className="btn btn-secondary" href="/"><Icon name="home" size={16} /> Home</a>
        <a className="btn btn-secondary" href="/tools"><Icon name="grid" size={16} /> All tools</a>
      </div>
    </div>
  );
}
