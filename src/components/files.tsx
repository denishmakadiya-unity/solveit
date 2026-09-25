import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import { Alert, downloadBlob, toast } from "./ui";
import { formatBytes, savings } from "../lib/format";
import { getSession, putSession, sessionToFiles } from "../lib/session";
import { workspace } from "../lib/storage";
import { makeZip } from "../lib/zip";
import { track } from "../lib/analytics";
import { LIMITS } from "../config";

export type AcceptKind = "image" | "pdf" | "text" | "any";

const ACCEPT: Record<AcceptKind, string> = {
  image: "image/*,.jpg,.jpeg,.png,.webp,.gif,.bmp,.avif",
  pdf: "application/pdf,.pdf",
  text: ".txt,.csv,.json,.md,text/plain,text/csv,application/json",
  any: "*/*",
};

function matches(f: File, kind: AcceptKind) {
  if (kind === "any") return true;
  if (kind === "image") return f.type.startsWith("image/") || /\.(jpe?g|png|webp|gif|bmp|avif)$/i.test(f.name);
  if (kind === "pdf") return f.type === "application/pdf" || /\.pdf$/i.test(f.name);
  return f.type.startsWith("text/") || f.type === "application/json" || /\.(txt|csv|json|md|tsv)$/i.test(f.name);
}

export function validateFiles(list: File[], kind: AcceptKind, multiple: boolean): { files: File[]; error?: string } {
  const maxMB = kind === "pdf" ? LIMITS.pdfMaxMB : kind === "image" ? LIMITS.imageMaxMB : 25;
  const good: File[] = [];
  const errs: string[] = [];
  for (const f of list) {
    if (!matches(f, kind)) { errs.push(`“${f.name}” isn't a supported ${kind === "pdf" ? "PDF" : kind} file.`); continue; }
    if (f.size > maxMB * 1024 * 1024) { errs.push(`“${f.name}” is larger than ${maxMB} MB.`); continue; }
    if (f.size === 0) { errs.push(`“${f.name}” is empty.`); continue; }
    good.push(f);
  }
  let files = multiple ? good.slice(0, LIMITS.maxFiles) : good.slice(0, 1);
  if (multiple && good.length > LIMITS.maxFiles) errs.push(`Only the first ${LIMITS.maxFiles} files were added.`);
  return { files, error: errs.join(" ") || undefined };
}

export function FileDrop({ kind, multiple = false, onFiles, label, hint }: {
  kind: AcceptKind; multiple?: boolean; onFiles: (f: File[]) => void; label?: string; hint?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState<string>();
  const [session, setSession] = useState<{ files: File[]; source: string } | null>(null);

  useEffect(() => {
    getSession().then((s) => {
      if (!s) return;
      const files = sessionToFiles(s).filter((f) => matches(f, kind));
      if (files.length) setSession({ files: multiple ? files : files.slice(0, 1), source: s.source });
    });
  }, [kind, multiple]);

  const take = (list: FileList | File[] | null) => {
    if (!list) return;
    const r = validateFiles(Array.from(list), kind, multiple);
    setError(r.error);
    if (r.files.length) onFiles(r.files);
  };

  const noun = kind === "pdf" ? (multiple ? "PDFs" : "a PDF") : kind === "image" ? (multiple ? "images" : "an image") : "a file";
  return (
    <div>
      <div
        className={"dropzone" + (drag ? " drag" : "")}
        role="button"
        tabIndex={0}
        aria-label={label || `Choose ${noun}`}
        onClick={() => input.current?.click()}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.current?.click(); } }}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); take(e.dataTransfer.files); }}
      >
        <span className="tile-icon"><Icon name="upload" size={26} /></span>
        <strong>{label || `Choose ${noun}`}</strong>
        <span className="muted" style={{ fontSize: "0.9rem" }}>{hint || `or drag and drop here${multiple ? " — you can add several at once" : ""}`}</span>
        <span className="row muted" style={{ gap: 6, fontSize: "0.82rem" }}><Icon name="lock" size={14} /> Files stay on your device</span>
      </div>
      <input ref={input} type="file" hidden accept={ACCEPT[kind]} multiple={multiple} onChange={(e) => { take(e.target.files); e.target.value = ""; }} />
      {session && (
        <div className="row" style={{ marginTop: 12, padding: 12, borderRadius: 12, background: "var(--brand-soft)", gap: 10 }}>
          <Icon name="history" size={18} className="" />
          <span style={{ flex: 1, minWidth: 0, fontSize: "0.92rem" }}>
            Continue with <b>{session.files.length === 1 ? session.files[0].name : `${session.files.length} files`}</b> from {session.source}
          </span>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => onFiles(session.files)}>Use {session.files.length === 1 ? "this file" : "these files"}</button>
        </div>
      )}
      {error && <div style={{ marginTop: 12 }}><Alert kind="err">{error}</Alert></div>}
    </div>
  );
}

export function FileRow({ file, onRemove, onUp, onDown, extra }: { file: File | { name: string; size: number; type?: string }; onRemove?: () => void; onUp?: () => void; onDown?: () => void; extra?: React.ReactNode }) {
  const [thumb, setThumb] = useState<string>();
  useEffect(() => {
    if (file instanceof Blob && file.type.startsWith("image/")) {
      const u = URL.createObjectURL(file);
      setThumb(u);
      return () => URL.revokeObjectURL(u);
    }
  }, [file]);
  return (
    <div className="file-row">
      {thumb ? <img className="file-thumb" src={thumb} alt="" /> : <span className="file-thumb"><Icon name={file.type === "application/pdf" || /\.pdf$/i.test(file.name) ? "file-text" : "files"} size={18} /></span>}
      <span className="name" title={file.name}>{file.name}</span>
      {extra}
      <span className="size">{formatBytes(file.size)}</span>
      {onUp && <button type="button" className="btn btn-ghost btn-sm btn-icon" aria-label={`Move ${file.name} up`} onClick={onUp}><Icon name="chevron-up" size={16} /></button>}
      {onDown && <button type="button" className="btn btn-ghost btn-sm btn-icon" aria-label={`Move ${file.name} down`} onClick={onDown}><Icon name="chevron-down" size={16} /></button>}
      {onRemove && <button type="button" className="btn btn-ghost btn-sm btn-icon" aria-label={`Remove ${file.name}`} onClick={onRemove}><Icon name="x" size={16} /></button>}
    </div>
  );
}

export function Processing({ label, progress }: { label: string; progress?: number }) {
  return (
    <div className="processing" role="status" aria-live="polite">
      <div className="row" style={{ gap: 10, fontWeight: 600 }}>
        <Icon name="loader" size={18} className="spin" /> {label}
        {typeof progress === "number" && <span className="muted" style={{ marginLeft: "auto", fontVariantNumeric: "tabular-nums" }}>{Math.round(progress * 100)}%</span>}
      </div>
      <div className="progress"><i style={{ width: `${Math.round((progress ?? 0.15) * 100)}%` }} /></div>
    </div>
  );
}

export type OutFile = { name: string; blob: Blob; note?: string };

export function ResultPanel({ title, inputs, outputs, notes, next, toolId, workflowSlug, sourceLabel, onReset, onRepeat, previewImage = true }: {
  title?: string; inputs: { name: string; size: number }[]; outputs: OutFile[]; notes?: string[];
  next?: { label: string; href: string; hint?: string }[]; toolId?: string; workflowSlug?: string; sourceLabel: string;
  onReset: () => void; onRepeat?: () => void; previewImage?: boolean;
}) {
  const inSize = inputs.reduce((a, f) => a + f.size, 0);
  const outSize = outputs.reduce((a, f) => a + f.blob.size, 0);
  const pct = savings(inSize, outSize);
  const [preview, setPreview] = useState<string>();
  const [canShare, setCanShare] = useState(false);
  const first = outputs[0];

  useEffect(() => {
    if (previewImage && first && first.blob.type.startsWith("image/")) {
      const u = URL.createObjectURL(first.blob);
      setPreview(u);
      return () => URL.revokeObjectURL(u);
    }
    setPreview(undefined);
  }, [first, previewImage]);

  useEffect(() => {
    try {
      const files = outputs.slice(0, 10).map((o) => new File([o.blob], o.name, { type: o.blob.type }));
      setCanShare(!!navigator.canShare?.({ files }));
    } catch { setCanShare(false); }
    // Save for "upload once" handoff and workspace history (metadata only).
    putSession(outputs.map((o) => ({ name: o.name, type: o.blob.type, blob: o.blob })), sourceLabel);
    workspace.addRecent({
      title: sourceLabel, href: location.pathname, kind: workflowSlug ? "workflow" : "tool",
      inputName: inputs.length === 1 ? inputs[0].name : `${inputs.length} files`, inputSize: inSize,
      outputName: outputs.length === 1 ? outputs[0].name : `${outputs.length} files`, outputSize: outSize,
    });
  }, [outputs]);

  const downloadAll = async () => {
    if (outputs.length === 1) return downloadBlob(first.blob, first.name, toolId || workflowSlug);
    const zip = await makeZip(outputs.map((o) => ({ name: o.name, blob: o.blob })));
    downloadBlob(zip, "solveit-results.zip", toolId || workflowSlug);
  };
  const share = async () => {
    try {
      await navigator.share({ files: outputs.slice(0, 10).map((o) => new File([o.blob], o.name, { type: o.blob.type })), title: "SolveIt result" });
    } catch { /* cancelled */ }
  };

  return (
    <section className="result" aria-label="Result">
      <div className="result-head">
        <Icon name="circle-check" size={20} />
        <span>{title || "Done! Your file is ready."}</span>
        {pct > 0 && inSize > 0 && <span className="badge ok" style={{ marginLeft: "auto", background: "var(--surface)" }}>{pct}% smaller</span>}
      </div>
      <div className="result-body">
        {inSize > 0 && (
          <div className="compare">
            <div className="box">
              <div className="k">Original</div>
              <div className="v">{formatBytes(inSize)}</div>
              <div className="n">{inputs.length === 1 ? inputs[0].name : `${inputs.length} files`}</div>
            </div>
            <span className="arrow muted"><Icon name="arrow-right" size={22} /></span>
            <div className="box" style={{ background: "var(--ok-soft)" }}>
              <div className="k">Result</div>
              <div className="v">{formatBytes(outSize)}</div>
              <div className="n">{outputs.length === 1 ? first.name : `${outputs.length} files`}</div>
            </div>
          </div>
        )}
        {preview && <img className="preview-img" src={preview} alt="Preview of the result" />}
        {notes && notes.length > 0 && (
          <ul style={{ margin: 0, paddingLeft: 18, color: "var(--ink-2)", fontSize: "0.92rem" }}>
            {notes.map((n, i) => <li key={i}>{n}</li>)}
          </ul>
        )}
        {outputs.length > 1 && (
          <div className="file-list" style={{ marginTop: 0, maxHeight: 260, overflowY: "auto" }}>
            {outputs.map((o, i) => (
              <FileRow key={i} file={new File([o.blob], o.name, { type: o.blob.type })}
                extra={<button type="button" className="btn btn-ghost btn-sm" onClick={() => downloadBlob(o.blob, o.name, toolId)}><Icon name="download" size={15} /> Save</button>} />
            ))}
          </div>
        )}
        <div className="row">
          <button type="button" className="btn btn-primary btn-lg" onClick={downloadAll} data-testid="download">
            <Icon name="download" /> {outputs.length > 1 ? `Download all (${outputs.length})` : "Download"}
          </button>
          {canShare && <button type="button" className="btn btn-secondary btn-lg" onClick={share}><Icon name="share" /> Share</button>}
          {onRepeat && <button type="button" className="btn btn-ghost" onClick={onRepeat}><Icon name="repeat2" size={16} /> Repeat with new files</button>}
          <button type="button" className="btn btn-ghost" onClick={onReset}>Start over</button>
        </div>
      </div>
      {next && next.length > 0 && (
        <div className="next-actions">
          <h3>What would you like to do next?</h3>
          <div className="chips">
            {next.map((n) => (
              <a key={n.href} className="chip" href={n.href} onClick={() => { track("related_tool_click", { tool: toolId, workflow: workflowSlug, meta: n.href }); toast("Your result will be ready on the next page"); }}>
                <Icon name="arrow-right" size={15} /> {n.label}
              </a>
            ))}
          </div>
          <p className="hint" style={{ marginTop: 10 }}>Your result carries over — no need to upload it again.</p>
        </div>
      )}
    </section>
  );
}
