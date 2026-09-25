import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import { Alert, CopyButton, downloadBlob, toast } from "./ui";
import { FileDrop, FileRow, ResultPanel, type OutFile } from "./files";
import type { ItemKind, WorkflowStep } from "../registry/types";
import { stepById } from "../registry/steps";
import { WORKFLOWS } from "../registry/workflows";
import { formatBytes } from "../lib/format";
import { track } from "../lib/analytics";
import { workspace } from "../lib/storage";
import { getSession, putSession } from "../lib/session";
import type { Item, StepLog } from "../engine/run";

const SAMPLES: Partial<Record<ItemKind, string>> = {
  json: `{\n  "user": {"name": "Asha", "email": "asha@example.com", "phone": null},\n  "items": [{"sku": "A1", "qty": 2}, {"sku": "B7", "qty": 1, "note": ""}],\n  "tags": [],\n  "coupon": null,\n}`,
  csv: "sku,name,price,stock\nA1,Notebook,120,45\nB7,\"Pen, blue\",20,300\nC3,Stapler,250,12",
  text: "  Welcome to   SolveIt!\nThis text was copied from a\nPDF and has “smart quotes” and   extra   spaces.  ",
};

function paramSummary(s: WorkflowStep) {
  const d = stepById(s.step);
  if (!d) return "";
  const p = { ...d.defaults, ...(s.params || {}) };
  switch (s.step) {
    case "resize": return `${p.width} × ${p.height}px · ${p.fit === "cover" ? "fill" : p.fit === "contain" ? "fit with background" : "keep ratio"}`;
    case "crop-ratio": return `${p.ratio} center crop`;
    case "convert": return `${String(p.format).toUpperCase().replace("JPEG", "JPG")}${p.format !== "png" ? ` · ${p.quality}%` : ""}`;
    case "compress": return `Quality ${p.quality}%`;
    case "ensure-size": return `Under ${p.maxKB >= 1000 ? p.maxKB / 1000 + " MB" : p.maxKB + " KB"}`;
    case "pdf-ensure-size": return `Under ${p.maxKB >= 1000 ? Math.round(p.maxKB / 102.4) / 10 + " MB" : p.maxKB + " KB"}`;
    case "pdf-compress": return `${p.mode[0].toUpperCase()}${p.mode.slice(1)}`;
    case "remove-bg": return `Tolerance ${p.tolerance} · ${p.fill === "transparent" ? "transparent" : "white"}`;
    case "images-to-pdf": return `${p.pageSize === "fit" ? "Image-sized" : p.pageSize.toUpperCase()} pages`;
    case "pdf-pages": return `Pages ${p.ranges}`;
    case "pdf-to-images": return `${p.dpi} DPI`;
    case "json-format": return p.indent === "tab" ? "Tabs" : `${p.indent} spaces`;
    case "text-case": return String(p.mode);
    case "text-limit": return `Max ${Number(p.maxChars).toLocaleString()} chars`;
    default: return d.short;
  }
}

export function StepTimeline({ steps, state, logs, onEdit }: { steps: WorkflowStep[]; state?: number; logs?: (StepLog | undefined)[]; onEdit?: (i: number) => React.ReactNode }) {
  return (
    <ol className="timeline" style={{ listStyle: "none", padding: 0, margin: 0 }}>
      {steps.map((s, i) => {
        const d = stepById(s.step);
        const log = logs?.[i];
        const cls = log ? (log.ok ? " done" : " failed") : state === i ? " active" : "";
        return (
          <li key={i} className={"tl-step" + cls}>
            <span className="n">{log?.ok ? <Icon name="check" size={16} /> : state === i ? <Icon name="loader" size={16} className="spin" /> : i + 1}</span>
            <div style={{ minWidth: 0 }}>
              <div className="t">{d?.name || s.step}</div>
              <div className="d">{paramSummary(s)}</div>
              {log?.ok && (log.notes.length > 0 || log.sizeAfter > 0) && (
                <div className="d" style={{ marginTop: 4, color: "var(--ink-2)" }}>
                  {log.sizeAfter > 0 && <span className="badge" style={{ marginRight: 6 }}>{formatBytes(log.sizeAfter)}</span>}
                  {log.notes.join(" ")}
                </div>
              )}
              {log && !log.ok && <div className="d" style={{ color: "var(--err)", marginTop: 4 }}>{log.error}</div>}
            </div>
            <div className="controls">{onEdit?.(i)}</div>
          </li>
        );
      })}
    </ol>
  );
}

export function WorkflowRunner({ name, steps, input, multiple, slug, savedId, onSaved }: {
  name: string; steps: WorkflowStep[]; input: ItemKind; multiple?: boolean; slug?: string; savedId?: string; onSaved?: () => void;
}) {
  const fileKind = input === "image" || input === "pdf";
  const [files, setFiles] = useState<File[]>([]);
  const [text, setText] = useState("");
  const [running, setRunning] = useState(false);
  const [active, setActive] = useState<number>();
  const [logs, setLogs] = useState<(StepLog | undefined)[]>([]);
  const [error, setError] = useState<string>();
  const [out, setOut] = useState<{ items: Item[]; files: OutFile[] }>();
  const textRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (fileKind) return;
    // Text workflows: prefill from the last text result, else a sample.
    getSession().then((s) => {
      const t = s?.files.find((f) => /^(text\/|application\/json)/.test(f.type));
      if (t) t.blob.text().then(setText); else setText(SAMPLES[input] || "");
    });
  }, [input]);

  useEffect(() => { setOut(undefined); setLogs([]); setError(undefined); }, [JSON.stringify(steps)]);

  const run = async () => {
    if (!steps.length) return setError("Add at least one step.");
    if (fileKind && !files.length) return setError("Choose a file first.");
    if (!fileKind && !text.trim()) return setError("Paste some input first.");
    setRunning(true); setError(undefined); setOut(undefined); setLogs([]);
    track("workflow_start", { workflow: slug || "custom", value: steps.length });
    const eng = await import("../engine/run");
    const items: Item[] = fileKind ? await eng.filesToItems(files, input) : [{ name: input === "json" ? "data.json" : input === "csv" ? "data.csv" : "text.txt", kind: input, text }];
    const lg: (StepLog | undefined)[] = [];
    try {
      const r = await eng.runWorkflow(steps, items, {
        onStep: (i, log) => { if (log) { lg[i] = log; setLogs([...lg]); } else setActive(i); },
      });
      const outFiles = r.items.map((it) => ({ name: eng.itemFileName(it), blob: eng.itemToBlob(it) }));
      setOut({ items: r.items, files: outFiles });
      if (savedId) workspace.markRun(savedId);
      track("workflow_success", { workflow: slug || "custom", value: steps.length });
      if (!fileKind) {
        putSession(outFiles.map((f) => ({ name: f.name, type: f.blob.type, blob: f.blob })), name);
        workspace.addRecent({ title: name, href: location.pathname + location.search, kind: "workflow", outputName: outFiles[0]?.name, outputSize: outFiles[0]?.blob.size });
      }
    } catch (e: any) {
      setError(e.message);
      track("workflow_error", { workflow: slug || "custom", meta: String(e.message).slice(0, 60) });
    } finally {
      setRunning(false); setActive(undefined);
    }
  };

  const save = () => {
    workspace.saveWorkflow({ id: savedId, name, input, steps, from: slug });
    toast("Saved to My Workspace");
    onSaved?.();
  };

  const reset = () => { setFiles([]); setOut(undefined); setLogs([]); setError(undefined); };
  const related = WORKFLOWS.filter((w) => w.slug !== slug && w.input === (out?.items[0]?.kind || input)).slice(0, 4);
  const nextLinks = [
    ...related.map((w) => ({ label: w.name, href: `/workflows/${w.slug}` })),
    { label: "Build a custom workflow", href: "/workflows/builder" },
  ];

  return (
    <div className="stack">
      {!out && (fileKind ? (
        <>
          <FileDrop kind={input as "image" | "pdf"} multiple={multiple} onFiles={(f) => setFiles(multiple ? [...files, ...f].slice(0, 50) : f.slice(0, 1))}
            label={files.length ? (multiple ? "Add more files" : "Choose a different file") : undefined} />
          {files.length > 0 && <div className="file-list" style={{ marginTop: 0 }}>{files.map((f, i) => <FileRow key={i + f.name} file={f} onRemove={() => setFiles(files.filter((_, k) => k !== i))} />)}</div>}
        </>
      ) : (
        <div className="stack-sm">
          <div className="row between">
            <span className="label">Your {input.toUpperCase()}</span>
            <div className="row">
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => textRef.current?.click()}><Icon name="upload" size={15} /> Open file</button>
              <input ref={textRef} type="file" hidden accept=".txt,.json,.csv,.md,text/*,application/json" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setText(await f.text()); e.target.value = ""; }} />
            </div>
          </div>
          <textarea className="textarea code" value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} aria-label="Workflow input" />
        </div>
      ))}

      <div className="card flat" style={{ padding: 16 }}>
        <div className="row between" style={{ marginBottom: 12 }}>
          <h3 style={{ fontSize: "1rem" }}>{steps.length} step{steps.length === 1 ? "" : "s"} · upload once, every step runs on the same file</h3>
        </div>
        <StepTimeline steps={steps} state={active} logs={logs} />
      </div>

      {error && <Alert kind="err">{error}</Alert>}

      {!out && (
        <div className="row">
          <button className="btn btn-primary btn-lg" onClick={run} disabled={running} data-testid="run-workflow">
            {running ? <><Icon name="loader" className="spin" /> Running step {(active ?? 0) + 1} of {steps.length}…</> : <><Icon name="play" /> Run workflow</>}
          </button>
          <button className="btn btn-secondary" onClick={save} disabled={running}><Icon name="save" size={16} /> Save to workspace</button>
          {slug && <a className="btn btn-ghost" href={`/workflows/builder?from=${slug}`}><Icon name="sliders" size={16} /> Customize steps</a>}
        </div>
      )}

      {out && (fileKind || out.items.some((i) => i.blob)) && (
        <ResultPanel title={`Workflow complete — ${steps.length} steps done.`} inputs={files} outputs={out.files} next={nextLinks} workflowSlug={slug || "custom"} sourceLabel={name}
          onReset={reset} onRepeat={() => { setOut(undefined); setFiles([]); setLogs([]); }} />
      )}
      {out && !fileKind && !out.items.some((i) => i.blob) && (
        <section className="result">
          <div className="result-head"><Icon name="circle-check" size={20} /> Workflow complete — {steps.length} steps done.</div>
          <div className="result-body">
            {out.items.map((it, i) => (
              <div key={i} className="stack-sm">
                <div className="row between">
                  <span className="label">{out.files[i].name} · {formatBytes(out.files[i].blob.size)} <span className="muted" style={{ fontWeight: 400 }}>(input {formatBytes(new Blob([text]).size)})</span></span>
                  <div className="row">
                    <CopyButton text={it.text || ""} />
                    <button className="btn btn-primary btn-sm" onClick={() => downloadBlob(out.files[i].blob, out.files[i].name, slug)}><Icon name="download" size={15} /> Download</button>
                  </div>
                </div>
                <pre className="code-out" data-testid="workflow-output">{it.text}</pre>
              </div>
            ))}
            <div className="row">
              <button className="btn btn-ghost" onClick={() => { setOut(undefined); setLogs([]); }}><Icon name="repeat2" size={16} /> Run again</button>
              <button className="btn btn-ghost" onClick={save}><Icon name="save" size={16} /> Save workflow</button>
            </div>
          </div>
          <div className="next-actions">
            <h3>What would you like to do next?</h3>
            <div className="chips">{nextLinks.map((n) => <a key={n.href} className="chip" href={n.href}><Icon name="arrow-right" size={15} /> {n.label}</a>)}</div>
          </div>
        </section>
      )}
    </div>
  );
}
