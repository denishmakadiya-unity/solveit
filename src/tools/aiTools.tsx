import { useEffect, useState } from "react";
import { Icon } from "../components/Icon";
import { Alert, CopyButton, Field, ProcessingBadge, Seg } from "../components/ui";
import { Processing } from "../components/files";
import { useConfig } from "../lib/flags";
import { useRunner, type ToolProps } from "./common";

type Mode = "local" | "ai";

async function callAI(task: string, payload: Record<string, any>): Promise<string> {
  const res = await fetch("/api/ai", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ task, ...payload }) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "AI mode is temporarily unavailable. Switch to on-device mode.");
  return data.output as string;
}

function ModeSwitch({ mode, setMode }: { mode: Mode; setMode: (m: Mode) => void }) {
  const cfg = useConfig();
  const available = cfg.aiEnabled && cfg.aiAvailable;
  useEffect(() => { if (!available && mode === "ai") setMode("local"); }, [available]);
  return (
    <div className="row between">
      <Seg<Mode> label="Processing mode" value={mode} onChange={(m) => (m === "ai" && !available ? undefined : setMode(m))}
        options={[{ value: "local", label: "On-device" }, { value: "ai", label: available ? "AI mode" : "AI mode (not available)" }]} />
      <ProcessingBadge mode={mode === "ai" ? "ai" : "client"} />
    </div>
  );
}

// ── Local algorithms ──
const STOP = new Set("a an the and or but if then so of to in on at by for with from as is are was were be been being it its this that these those i you he she we they my your our their me him her us them not no do does did have has had will would can could should may might must also just very really about into over after before than there here what which who whom when where why how all any each more most other some such only own same too s t".split(" "));

export function summarizeLocal(text: string, length: "short" | "medium" | "long", format: "paragraph" | "bullets") {
  const sentences = text.replace(/\s+/g, " ").match(/[^.!?।]+[.!?।]+["”’)]*|[^.!?।]+$/g)?.map((s) => s.trim()).filter((s) => s.split(" ").length > 3) || [];
  if (sentences.length <= 2) return sentences.join(" ");
  const freq = new Map<string, number>();
  for (const w of text.toLowerCase().match(/[\p{L}\p{N}]+/gu) || []) if (!STOP.has(w) && w.length > 2) freq.set(w, (freq.get(w) || 0) + 1);
  const max = Math.max(...freq.values(), 1);
  const scored = sentences.map((s, i) => {
    const words = s.toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
    let sc = words.reduce((a, w) => a + (freq.get(w) || 0) / max, 0) / Math.pow(words.length || 1, 0.7);
    if (i === 0) sc *= 1.35;
    if (/\d/.test(s)) sc *= 1.1;
    return { s, i, sc };
  });
  const n = Math.max(1, Math.min(sentences.length - 1, length === "short" ? Math.ceil(sentences.length * 0.15) + 1 : length === "medium" ? Math.ceil(sentences.length * 0.28) + 1 : Math.ceil(sentences.length * 0.45) + 1));
  const picked = scored.sort((a, b) => b.sc - a.sc).slice(0, n).sort((a, b) => a.i - b.i).map((x) => x.s);
  return format === "bullets" ? picked.map((s) => "• " + s).join("\n") : picked.join(" ");
}

const FORMAL: [RegExp, string][] = [
  [/\bcan't\b/gi, "cannot"], [/\bwon't\b/gi, "will not"], [/\bdon't\b/gi, "do not"], [/\bdoesn't\b/gi, "does not"], [/\bdidn't\b/gi, "did not"],
  [/\bisn't\b/gi, "is not"], [/\baren't\b/gi, "are not"], [/\bwasn't\b/gi, "was not"], [/\bI'm\b/g, "I am"], [/\bI've\b/g, "I have"], [/\bI'll\b/g, "I will"],
  [/\bI'd\b/g, "I would"], [/\bwe're\b/gi, "we are"], [/\bthey're\b/gi, "they are"], [/\byou're\b/gi, "you are"], [/\bit's\b/gi, "it is"], [/\blet's\b/gi, "let us"],
  [/\bgonna\b/gi, "going to"], [/\bwanna\b/gi, "want to"], [/\bgotta\b/gi, "have to"], [/\bkinda\b/gi, "somewhat"], [/\bpls\b|\bplz\b/gi, "please"],
  [/\bthx\b|\bthanx\b/gi, "thank you"], [/\bthanks\b/gi, "thank you"], [/\basap\b/gi, "as soon as possible"], [/\bu\b/g, "you"], [/\bur\b/g, "your"],
  [/\bhey\b/gi, "Hello"], [/\bhi\b/gi, "Hello"], [/\byeah\b|\byep\b/gi, "yes"], [/\bnope\b/gi, "no"], [/\bokay\b|\bok\b/gi, "understood"],
  [/\bget back to\b/gi, "respond to"], [/\bcheck out\b/gi, "review"], [/\bneed to\b/gi, "need to"], [/\ba lot of\b/gi, "many"], [/\bbig\b/gi, "significant"],
];
const FRIENDLY: [RegExp, string][] = [
  [/\bdo not\b/gi, "don't"], [/\bdoes not\b/gi, "doesn't"], [/\bcannot\b/gi, "can't"], [/\bwill not\b/gi, "won't"], [/\bI am\b/g, "I'm"], [/\bI have\b/g, "I've"],
  [/\bI will\b/g, "I'll"], [/\bwe are\b/gi, "we're"], [/\byou are\b/gi, "you're"], [/\bit is\b/gi, "it's"], [/\bthat is\b/gi, "that's"],
  [/\bDear\b/g, "Hi"], [/\bKind regards\b|\bYours sincerely\b|\bSincerely\b/g, "Thanks"], [/\bthank you\b/gi, "thanks"], [/\bhowever\b/gi, "but"],
  [/\btherefore\b/gi, "so"], [/\bassist\b/gi, "help"], [/\bpurchase\b/gi, "buy"], [/\brequire\b/gi, "need"], [/\bcommence\b/gi, "start"],
];
const CONCISE: [RegExp, string][] = [
  [/\bin order to\b/gi, "to"], [/\bdue to the fact that\b/gi, "because"], [/\bat this point in time\b/gi, "now"], [/\bin the event that\b/gi, "if"],
  [/\bfor the purpose of\b/gi, "for"], [/\bin spite of the fact that\b/gi, "although"], [/\bwith regard to\b|\bin regard to\b|\bwith respect to\b/gi, "about"],
  [/\bat the present time\b/gi, "now"], [/\bis able to\b/gi, "can"], [/\bhas the ability to\b/gi, "can"], [/\ba large number of\b/gi, "many"],
  [/\bprior to\b/gi, "before"], [/\bsubsequent to\b/gi, "after"], [/\bmake a decision\b/gi, "decide"], [/\bgive consideration to\b/gi, "consider"],
  [/\b(basically|actually|really|very|just|literally|totally|quite|simply|kind of|sort of|I think that|I feel that|needless to say|it goes without saying that),?\s/gi, ""],
];

export function rewriteLocal(text: string, tone: string) {
  let t = text.replace(/[ \t]+/g, " ").replace(/\s+([,.!?;:])/g, "$1").replace(/([,.!?;:])(?=[A-Za-z])/g, "$1 ").replace(/!{2,}/g, "!").replace(/\?{2,}/g, "?");
  const rules = tone === "formal" ? [...CONCISE, ...FORMAL] : tone === "friendly" ? FRIENDLY : tone === "shorter" ? CONCISE : CONCISE.slice(0, -1);
  for (const [re, rep] of rules) t = t.replace(re, (m) => (m[0] === m[0].toUpperCase() && rep ? rep[0].toUpperCase() + rep.slice(1) : rep));
  if (tone === "shorter") t = t.split(/(?<=[.!?])\s+/).filter((s, i, arr) => arr.findIndex((x) => x.toLowerCase() === s.toLowerCase()) === i).join(" ");
  t = t.replace(/(^|[.!?]\s+|\n\s*)([a-z])/g, (_, a, b) => a + b.toUpperCase()).replace(/\bi\b/g, "I").replace(/ {2,}/g, " ").trim();
  if (t && !/[.!?)"”]$/.test(t)) t += ".";
  return t;
}

const PURPOSES: Record<string, { label: string; subject: (p: EmailInput) => string; open: (p: EmailInput) => string; close: string }> = {
  leave: { label: "Leave application", subject: (p) => `Leave request${p.dates ? ` — ${p.dates}` : ""}`, open: (p) => `I would like to request leave${p.dates ? ` for ${p.dates}` : ""}.`, close: "I will make sure my work is handed over and will be reachable for anything urgent. Thank you for considering my request." },
  followup: { label: "Follow-up", subject: (p) => `Following up${p.topic ? `: ${p.topic}` : ""}`, open: (p) => `I'm following up on ${p.topic || "my previous message"}.`, close: "Please let me know if you need anything else from my side. I look forward to hearing from you." },
  meeting: { label: "Meeting request", subject: (p) => `Meeting request${p.topic ? `: ${p.topic}` : ""}`, open: (p) => `I'd like to schedule a short meeting${p.topic ? ` to discuss ${p.topic}` : ""}.`, close: "Please let me know a time that works for you, and I'll send a calendar invite." },
  thanks: { label: "Thank you", subject: (p) => `Thank you${p.topic ? ` for ${p.topic}` : ""}`, open: (p) => `Thank you ${p.topic ? `for ${p.topic}` : "for your help"}.`, close: "I really appreciate your time and support." },
  apology: { label: "Apology / delay", subject: (p) => `Update${p.topic ? ` on ${p.topic}` : ""}`, open: (p) => `I apologize for the delay${p.topic ? ` regarding ${p.topic}` : ""}.`, close: "Thank you for your patience and understanding." },
  job: { label: "Job application", subject: (p) => `Application for ${p.topic || "the open position"}`, open: (p) => `I am writing to apply for ${p.topic || "the open position"}.`, close: "I have attached my resume and would welcome the opportunity to discuss how I can contribute. Thank you for your time." },
  complaint: { label: "Complaint", subject: (p) => `Complaint${p.topic ? `: ${p.topic}` : ""}`, open: (p) => `I am writing to raise a concern${p.topic ? ` about ${p.topic}` : ""}.`, close: "I would appreciate a resolution at the earliest and a confirmation once this is addressed." },
  custom: { label: "Other", subject: (p) => p.topic || "Quick note", open: (p) => (p.topic ? `I'm writing about ${p.topic}.` : "I hope you're doing well."), close: "Please let me know if you have any questions." },
};
type EmailInput = { purpose: string; to: string; from: string; topic: string; dates: string; points: string; tone: string };

export function emailLocal(p: EmailInput) {
  const P = PURPOSES[p.purpose] || PURPOSES.custom;
  const formal = p.tone === "formal";
  const greet = p.to ? `${formal ? "Dear" : "Hi"} ${p.to},` : formal ? "Dear Sir/Madam," : "Hi,";
  const pts = p.points.split("\n").map((s) => s.trim().replace(/^[-•*]\s*/, "")).filter(Boolean).map((s) => rewriteLocal(s, formal ? "formal" : "clearer"));
  const body = [P.open(p)];
  if (pts.length === 1) body.push(pts[0]);
  else if (pts.length > 1) body.push((formal ? "Please note the following:" : "A few quick points:") + "\n" + pts.map((s) => `• ${s}`).join("\n"));
  body.push(P.close);
  const sign = `${formal ? "Kind regards" : "Thanks"},\n${p.from || "[Your name]"}`;
  const text = [greet, "", formal ? "I hope this email finds you well." : "", body.join("\n\n"), "", sign].filter((x, i) => !(x === "" && i === 2)).join("\n").replace(/\n{3,}/g, "\n\n");
  return { subject: P.subject(p), body: text };
}

// ── Components ──
export function AiSummarizer({ tool }: ToolProps) {
  const [mode, setMode] = useState<Mode>("local");
  const [text, setText] = useState("Remote work has changed how teams collaborate. Many companies now use a mix of office and home working, often called hybrid work. Surveys show that employees value flexibility, and many say it improves their productivity. However, managers report challenges with communication and onboarding new team members. To address this, companies are investing in better documentation, clear meeting schedules and tools that keep everyone informed. Experts suggest that the most successful teams agree on explicit norms: when to be online, how quickly to reply and which decisions need a meeting. With the right habits, hybrid teams can be as effective as teams that share an office every day.");
  const [length, setLength] = useState<"short" | "medium" | "long">("short");
  const [format, setFormat] = useState<"paragraph" | "bullets">("bullets");
  const [out, setOut] = useState("");
  const r = useRunner(tool.id);
  const go = () => r.run(async () => {
    if (text.trim().split(/\s+/).length < 40) throw new Error("Add a bit more text — summaries work best with at least 40 words.");
    setOut(mode === "ai" ? await callAI("summarize", { text, length, format }) : summarizeLocal(text, length, format));
  });
  const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
  return (
    <div className="stack">
      <ModeSwitch mode={mode} setMode={setMode} />
      <textarea className="textarea" style={{ minHeight: 220 }} value={text} onChange={(e) => setText(e.target.value)} aria-label="Text to summarize" />
      <div className="row">
        <Seg label="Length" value={length} onChange={setLength} options={[{ value: "short", label: "Short" }, { value: "medium", label: "Medium" }, { value: "long", label: "Detailed" }]} />
        <Seg label="Format" value={format} onChange={setFormat} options={[{ value: "bullets", label: "Key points" }, { value: "paragraph", label: "Paragraph" }]} />
      </div>
      {r.busy ? <Processing label={mode === "ai" ? "Writing summary…" : "Finding key sentences…"} /> : <div className="row"><button className="btn btn-primary btn-lg" onClick={go}><Icon name="sparkles" /> Summarize</button><span className="muted">{words(text)} words</span></div>}
      {r.error && <Alert kind="err">{r.error}</Alert>}
      {out && (
        <div className="stack-sm">
          <div className="row between"><span className="label">Summary · {words(out)} words ({Math.round((1 - words(out) / Math.max(1, words(text))) * 100)}% shorter)</span><CopyButton text={out} /></div>
          <pre className="code-out" style={{ fontFamily: "var(--body)", fontSize: "1rem" }} data-testid="summary">{out}</pre>
        </div>
      )}
    </div>
  );
}

export function AiRewriter({ tool }: ToolProps) {
  const [mode, setMode] = useState<Mode>("local");
  const [text, setText] = useState("hey team, basically we are gonna need to push the launch due to the fact that the designs aren't ready yet. pls check out the new timeline and get back to me asap!!");
  const [tone, setTone] = useState("formal");
  const [out, setOut] = useState("");
  const r = useRunner(tool.id);
  const go = () => r.run(async () => {
    if (!text.trim()) throw new Error("Paste some text to rewrite.");
    setOut(mode === "ai" ? await callAI("rewrite", { text, tone }) : rewriteLocal(text, tone));
  });
  return (
    <div className="stack">
      <ModeSwitch mode={mode} setMode={setMode} />
      <textarea className="textarea" value={text} onChange={(e) => setText(e.target.value)} aria-label="Text to rewrite" />
      <div className="chips">
        {[["clearer", "Clearer"], ["formal", "More formal"], ["friendly", "Friendlier"], ["shorter", "Shorter"]].map(([v, l]) => (
          <button key={v} type="button" className="chip" aria-pressed={tone === v} onClick={() => setTone(v)}>{l}</button>
        ))}
      </div>
      {r.busy ? <Processing label="Rewriting…" /> : <div><button className="btn btn-primary btn-lg" onClick={go}><Icon name="pen-line" /> Rewrite</button></div>}
      {r.error && <Alert kind="err">{r.error}</Alert>}
      {out && (
        <div className="stack-sm">
          <div className="row between"><span className="label">Rewritten</span><div className="row"><button className="btn btn-ghost btn-sm" onClick={() => setText(out)}>Use as input</button><CopyButton text={out} /></div></div>
          <pre className="code-out" style={{ fontFamily: "var(--body)", fontSize: "1rem" }} data-testid="rewrite">{out}</pre>
          {mode === "local" && <p className="hint">On-device mode tidies wording and tone. For full rephrasing, use AI mode when it's available.</p>}
        </div>
      )}
    </div>
  );
}

export function AiEmailWriter({ tool }: ToolProps) {
  const [mode, setMode] = useState<Mode>("local");
  const [p, setP] = useState<EmailInput>({ purpose: "leave", to: "Ms. Sharma", from: "", topic: "", dates: "12–14 October", points: "family function in my hometown\nall pending reports will be submitted by Friday\nRahul will cover client calls", tone: "formal" });
  const [out, setOut] = useState<{ subject: string; body: string }>();
  const r = useRunner(tool.id);
  const set = (k: keyof EmailInput) => (e: any) => setP({ ...p, [k]: e.target.value });
  const go = () => r.run(async () => {
    if (mode === "ai") {
      const t = await callAI("email", p);
      const m = t.match(/^Subject:\s*(.+)\n+([\s\S]*)$/i);
      setOut(m ? { subject: m[1].trim(), body: m[2].trim() } : { subject: PURPOSES[p.purpose]?.subject(p) || "", body: t });
    } else setOut(emailLocal(p));
  });
  return (
    <div className="stack">
      <ModeSwitch mode={mode} setMode={setMode} />
      <div className="form-grid">
        <Field label="Purpose" htmlFor="ep"><select id="ep" className="select" value={p.purpose} onChange={set("purpose")}>{Object.entries(PURPOSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></Field>
        <Field label="Tone" htmlFor="et"><select id="et" className="select" value={p.tone} onChange={set("tone")}><option value="formal">Formal</option><option value="friendly">Friendly</option></select></Field>
        <Field label="Recipient name" htmlFor="eto"><input id="eto" className="input" value={p.to} onChange={set("to")} placeholder="e.g. Mr. Patel" /></Field>
        <Field label="Your name" htmlFor="efrom"><input id="efrom" className="input" value={p.from} onChange={set("from")} /></Field>
        <Field label={p.purpose === "job" ? "Position" : "Topic"} htmlFor="etp"><input id="etp" className="input" value={p.topic} onChange={set("topic")} placeholder={p.purpose === "job" ? "e.g. Frontend Developer" : "e.g. the Q3 invoice"} /></Field>
        {p.purpose === "leave" && <Field label="Dates" htmlFor="ed"><input id="ed" className="input" value={p.dates} onChange={set("dates")} /></Field>}
      </div>
      <Field label="Key points (one per line)" htmlFor="ekp"><textarea id="ekp" className="textarea" style={{ minHeight: 120 }} value={p.points} onChange={set("points")} /></Field>
      {r.busy ? <Processing label="Drafting email…" /> : <div><button className="btn btn-primary btn-lg" onClick={go}><Icon name="mail" /> Write email</button></div>}
      {r.error && <Alert kind="err">{r.error}</Alert>}
      {out && (
        <div className="card flat stack-sm" data-testid="email">
          <div className="row between"><span><span className="muted">Subject:</span> <b>{out.subject}</b></span><CopyButton text={out.subject} label="Copy subject" /></div>
          <hr className="divider" style={{ margin: "8px 0" }} />
          <pre className="code-out" style={{ fontFamily: "var(--body)", fontSize: "0.98rem", background: "none", border: 0, padding: 0 }}>{out.body}</pre>
          <div className="row"><CopyButton text={`Subject: ${out.subject}\n\n${out.body}`} label="Copy email" className="btn btn-primary btn-sm" /></div>
        </div>
      )}
    </div>
  );
}
