import { useEffect, useMemo, useState } from "react";
import { Icon } from "../components/Icon";
import { Alert, CopyButton, downloadBlob } from "../components/ui";
import { changeCase, cleanText, diffLines, textStats, type CleanOpts } from "../lib/data";
import { track } from "../lib/analytics";
import { num } from "../lib/format";
import type { ToolProps } from "./common";

function useDraft(key: string, initial: string) {
  const [v, setV] = useState(initial);
  useEffect(() => { try { const s = sessionStorage.getItem("solveit:draft:" + key); if (s !== null) setV(s); } catch { /* ignore */ } }, []);
  useEffect(() => { try { sessionStorage.setItem("solveit:draft:" + key, v); } catch { /* ignore */ } }, [v]);
  return [v, setV] as const;
}

function useFirstUse(toolId: string, active: boolean) {
  const [done, setDone] = useState(false);
  useEffect(() => { if (active && !done) { track("tool_start", { tool: toolId }); setDone(true); } }, [active]);
}

const fmtMin = (m: number) => (m < 1 ? `${Math.max(1, Math.round(m * 60))} sec` : `${Math.floor(m)} min ${Math.round((m % 1) * 60)} sec`);

export function WordCounter({ tool }: ToolProps) {
  const [text, setText] = useDraft(tool.id, "SolveIt helps you get everyday tasks done. Paste your essay, caption or article here to count words, characters and sentences instantly.\n\nIt works with English, हिंदी and ગુજરાતી text too.");
  useFirstUse(tool.id, text.length > 0);
  const s = useMemo(() => textStats(text), [text]);
  const limits = [{ n: "X / Twitter post", max: 280 }, { n: "Instagram caption", max: 2200 }, { n: "Meta description", max: 160 }, { n: "LinkedIn post", max: 3000 }];
  return (
    <div className="stack">
      <textarea className="textarea" style={{ minHeight: 240 }} value={text} onChange={(e) => setText(e.target.value)} aria-label="Your text" placeholder="Type or paste your text…" />
      <div className="stat-grid">
        <div className="stat hero-stat"><div className="k">Words</div><div className="v" data-testid="words">{s.words.toLocaleString()}</div></div>
        <div className="stat"><div className="k">Characters</div><div className="v">{s.chars.toLocaleString()}</div><div className="s">{s.noSpaces.toLocaleString()} without spaces</div></div>
        <div className="stat"><div className="k">Sentences</div><div className="v">{s.sentences}</div></div>
        <div className="stat"><div className="k">Paragraphs</div><div className="v">{s.paragraphs}</div></div>
        <div className="stat"><div className="k">Reading time</div><div className="v" style={{ fontSize: "1.15rem" }}>{fmtMin(s.readMin)}</div></div>
        <div className="stat"><div className="k">Speaking time</div><div className="v" style={{ fontSize: "1.15rem" }}>{fmtMin(s.speakMin)}</div></div>
      </div>
      <div className="grid grid-2">
        <div className="card flat">
          <h3 style={{ marginBottom: 12 }}>Platform limits</h3>
          <div className="stack-sm">
            {limits.map((l) => {
              const pct = Math.min(100, (s.chars / l.max) * 100);
              const over = s.chars > l.max;
              return (
                <div key={l.n}>
                  <div className="row between" style={{ fontSize: "0.88rem" }}><span>{l.n}</span><span className={over ? "" : "muted"} style={{ color: over ? "var(--err)" : undefined }}>{s.chars.toLocaleString()} / {l.max.toLocaleString()}</span></div>
                  <div className="meter"><i style={{ width: pct + "%", background: over ? "var(--err)" : "var(--brand)" }} /></div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="card flat">
          <h3 style={{ marginBottom: 12 }}>Top keywords</h3>
          {s.top.length ? (
            <div className="table-wrap" style={{ border: 0 }}>
              <table><tbody>{s.top.map(([w, c]) => <tr key={w}><td>{w}</td><td className="num">{c}×</td><td className="num muted">{num((c / Math.max(1, s.words)) * 100, 1)}%</td></tr>)}</tbody></table>
            </div>
          ) : <p className="muted">Keywords appear as you type.</p>}
        </div>
      </div>
      <div className="row"><button className="btn btn-ghost btn-sm" onClick={() => setText("")}>Clear text</button></div>
    </div>
  );
}

const CASES = [
  { v: "upper", l: "UPPERCASE" }, { v: "lower", l: "lowercase" }, { v: "title", l: "Title Case" }, { v: "sentence", l: "Sentence case" },
  { v: "camel", l: "camelCase" }, { v: "pascal", l: "PascalCase" }, { v: "snake", l: "snake_case" }, { v: "kebab", l: "kebab-case" },
  { v: "constant", l: "CONSTANT_CASE" }, { v: "alternating", l: "aLtErNaTiNg" }, { v: "inverse", l: "iNVERSE" },
];

export function CaseConverter({ tool }: ToolProps) {
  const [text, setText] = useDraft(tool.id, "the quick guide to getting things done with solveit");
  const [mode, setMode] = useState("title");
  const out = useMemo(() => changeCase(text, mode), [text, mode]);
  return (
    <div className="stack">
      <textarea className="textarea" value={text} onChange={(e) => setText(e.target.value)} aria-label="Text to convert" placeholder="Paste your text…" />
      <div className="chips">
        {CASES.map((c) => <button key={c.v} type="button" className="chip" aria-pressed={mode === c.v} onClick={() => { setMode(c.v); track("tool_success", { tool: tool.id, meta: c.v }); }}>{c.l}</button>)}
      </div>
      <div className="stack-sm">
        <div className="row between"><span className="label">Result</span><div className="row"><button className="btn btn-ghost btn-sm" onClick={() => setText(out)}>Use as input</button><CopyButton text={out} /></div></div>
        <pre className="code-out" style={{ fontFamily: "var(--body)", fontSize: "1rem" }} data-testid="case-out">{out || " "}</pre>
      </div>
    </div>
  );
}

const CLEAN_OPTS: { k: keyof CleanOpts; l: string }[] = [
  { k: "trim", l: "Trim spaces at line start/end" }, { k: "collapse", l: "Collapse multiple spaces" }, { k: "emptyLines", l: "Remove empty lines" },
  { k: "joinLines", l: "Join broken lines (PDF copy)" }, { k: "lineBreaks", l: "Remove all line breaks" }, { k: "dedupe", l: "Remove duplicate lines" },
  { k: "html", l: "Strip HTML tags" }, { k: "quotes", l: "Straighten smart quotes & dashes" }, { k: "emojis", l: "Remove emojis" },
];

export function TextCleaner({ tool }: ToolProps) {
  const [text, setText] = useDraft(tool.id, "  This   text was copied   from a PDF and the\nlines are broken in the middle of\nsentences.  \n\n\n<b>It also has</b> “smart quotes” and   extra   spaces.  ");
  const [o, setO] = useState<CleanOpts>({ trim: true, collapse: true, emptyLines: false, joinLines: true, html: true, quotes: true });
  const out = useMemo(() => cleanText(text, o), [text, o]);
  const removed = text.length - out.length;
  return (
    <div className="stack">
      <textarea className="textarea" value={text} onChange={(e) => setText(e.target.value)} aria-label="Messy text" placeholder="Paste messy text…" />
      <div className="grid grid-3" style={{ gap: 10 }}>
        {CLEAN_OPTS.map((c) => (
          <label key={c.k} className="check"><input type="checkbox" checked={!!o[c.k]} onChange={(e) => setO({ ...o, [c.k]: e.target.checked })} /> {c.l}</label>
        ))}
      </div>
      <div className="stack-sm">
        <div className="row between">
          <span className="label">Clean text {removed > 0 && <span className="badge ok" style={{ marginLeft: 6 }}>{removed.toLocaleString()} characters removed</span>}</span>
          <div className="row"><button className="btn btn-ghost btn-sm" onClick={() => setText(out)}>Use as input</button><CopyButton text={out} /></div>
        </div>
        <pre className="code-out" style={{ fontFamily: "var(--body)" }} data-testid="clean-out">{out || " "}</pre>
      </div>
    </div>
  );
}

export function TextCompare({ tool }: ToolProps) {
  const [a, setA] = useDraft(tool.id + "-a", "SolveIt is a problem-solving platform.\nIt has 38 tools.\nFiles are processed on your device.\nSign-up is optional.");
  const [b, setB] = useDraft(tool.id + "-b", "SolveIt is a problem-solving platform.\nIt has 38 tools and 50+ workflows.\nFiles are processed on your device.\nSign-up is never required.");
  const [ic, setIc] = useState(false);
  const [iw, setIw] = useState(false);
  const r = useMemo(() => { try { return { d: diffLines(a, b, { ignoreCase: ic, ignoreSpace: iw }) }; } catch (e: any) { return { e: e.message as string }; } }, [a, b, ic, iw]);
  const adds = r.d?.filter((x) => x.type === "add").length || 0, dels = r.d?.filter((x) => x.type === "del").length || 0;
  return (
    <div className="stack">
      <div className="grid grid-2">
        <label className="field"><span>Original</span><textarea className="textarea" value={a} onChange={(e) => setA(e.target.value)} /></label>
        <label className="field"><span>Changed</span><textarea className="textarea" value={b} onChange={(e) => setB(e.target.value)} /></label>
      </div>
      <div className="row">
        <label className="check"><input type="checkbox" checked={ic} onChange={(e) => setIc(e.target.checked)} /> Ignore case</label>
        <label className="check"><input type="checkbox" checked={iw} onChange={(e) => setIw(e.target.checked)} /> Ignore whitespace</label>
        <span className="badge ok">+{adds} added</span><span className="badge err">−{dels} removed</span>
      </div>
      {r.e ? <Alert kind="err">{r.e}</Alert> : (
        adds + dels === 0 ? <Alert kind="ok">The texts are identical{ic || iw ? " (with the selected options)" : ""}.</Alert> :
        <div className="diff" data-testid="diff">
          {r.d!.map((l, i) => (
            <div key={i} className={l.type === "same" ? "" : l.type}>
              <span className="ln">{l.a ?? ""}</span><span className="ln">{l.b ?? ""}</span><span>{l.type === "add" ? "+" : l.type === "del" ? "−" : " "}</span><span>{l.text || " "}</span>
            </div>
          ))}
        </div>
      )}
      <div className="row">
        <button className="btn btn-secondary btn-sm" onClick={() => downloadBlob(new Blob([r.d?.map((l) => (l.type === "add" ? "+ " : l.type === "del" ? "- " : "  ") + l.text).join("\n") || ""], { type: "text/plain" }), "diff.txt", tool.id)}>
          <Icon name="download" size={15} /> Download diff
        </button>
      </div>
    </div>
  );
}
