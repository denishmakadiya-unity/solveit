import { useEffect, useState } from "react";
import { Icon } from "../components/Icon";
import { Alert, CopyButton, Field, NumberInput, Seg, downloadBlob } from "../components/ui";
import { FileDrop, FileRow, Processing, ResultPanel, type OutFile } from "../components/files";
import { blobOf, move, readBytes, useRunner, type ToolProps } from "./common";
import { baseName, formatBytes } from "../lib/format";

type Mode = "lossless" | "balanced" | "strong" | "target";

export function CompressPdf({ tool }: ToolProps) {
  const [file, setFile] = useState<File>();
  const [mode, setMode] = useState<Mode>("balanced");
  const [targetKB, setTargetKB] = useState("1024");
  const [result, setResult] = useState<{ out: OutFile[]; notes: string[] }>();
  const r = useRunner(tool.id);

  useEffect(() => {
    const t = new URLSearchParams(location.search).get("target");
    if (t && /^\d+$/.test(t)) { setMode("target"); setTargetKB(t); }
  }, []);

  const go = () => r.run(async (onP) => {
    const pdf = await import("../engine/pdf");
    const bytes = await readBytes(file!);
    let out: Uint8Array, notes: string[];
    if (mode === "target") {
      const kb = Math.max(20, +targetKB || 1024);
      const res = await pdf.ensurePdfUnder(bytes, kb * 1024, onP);
      out = res.bytes; notes = res.notes;
    } else {
      const res = await pdf.compressPdf(bytes, mode, undefined, onP);
      out = res.bytes; notes = res.notes;
    }
    setResult({ out: [{ name: `${baseName(file!.name)}-compressed.pdf`, blob: blobOf(out) }], notes });
  });

  const reset = () => { setFile(undefined); setResult(undefined); r.setError(undefined); };
  if (result && file)
    return <ResultPanel inputs={[file]} outputs={result.out} notes={result.notes} next={tool.next} toolId={tool.id} sourceLabel={tool.name} onReset={reset} />;

  return (
    <div>
      {!file ? <FileDrop kind="pdf" onFiles={(f) => setFile(f[0])} /> : (
        <>
          <FileRow file={file} onRemove={reset} />
          <div className="settings">
            <Field label="Compression">
              <Seg<Mode> label="Compression level" value={mode} onChange={setMode} options={[
                { value: "lossless", label: "Lossless" }, { value: "balanced", label: "Balanced" }, { value: "strong", label: "Strong" }, { value: "target", label: "Target size" }]} />
            </Field>
            <p className="hint" style={{ marginTop: -8 }}>
              {mode === "lossless" && "Keeps text selectable and quality unchanged. Best for digital documents."}
              {mode === "balanced" && "Great quality for screens and phones. Converts pages to optimized images."}
              {mode === "strong" && "Smallest files. Best for scans and strict upload limits."}
              {mode === "target" && "SolveIt keeps optimizing until the PDF fits under your limit."}
            </p>
            {mode === "target" && (
              <div className="row" style={{ alignItems: "flex-end" }}>
                <Field label="Maximum size" htmlFor="target-kb">
                  <NumberInput id="target-kb" value={targetKB} onChange={setTargetKB} min={20} suffix="KB" />
                </Field>
                <div className="chips">
                  {[["200 KB", "200"], ["500 KB", "500"], ["1 MB", "1024"], ["2 MB", "2048"], ["10 MB", "10240"]].map(([l, v]) => (
                    <button key={v} type="button" className="chip" aria-pressed={targetKB === v} onClick={() => setTargetKB(v)}>{l}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
          {r.busy ? <Processing label="Compressing your PDF…" progress={r.progress} /> : (
            <div className="cta-row"><button className="btn btn-primary btn-lg" onClick={go}><Icon name="shrink" /> Compress PDF</button></div>
          )}
        </>
      )}
      {r.error && <div style={{ marginTop: 16 }}><Alert kind="err">{r.error}</Alert></div>}
    </div>
  );
}

export function MergePdf({ tool }: ToolProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [result, setResult] = useState<OutFile[]>();
  const r = useRunner(tool.id);
  const go = () => r.run(async (onP) => {
    const pdf = await import("../engine/pdf");
    const out = await pdf.mergePdfs(await Promise.all(files.map(readBytes)), onP);
    setResult([{ name: "merged.pdf", blob: blobOf(out) }]);
  });
  const reset = () => { setFiles([]); setResult(undefined); };
  if (result) return <ResultPanel title="Your PDFs are merged." inputs={files} outputs={result} next={tool.next} toolId={tool.id} sourceLabel={tool.name} onReset={reset} />;
  return (
    <div>
      <FileDrop kind="pdf" multiple onFiles={(f) => setFiles((prev) => [...prev, ...f].slice(0, 50))} label={files.length ? "Add more PDFs" : "Choose PDFs to merge"} />
      {files.length > 0 && (
        <div className="file-list">
          {files.map((f, i) => (
            <FileRow key={i + f.name} file={f} onUp={i > 0 ? () => setFiles(move(files, i, -1)) : undefined}
              onDown={i < files.length - 1 ? () => setFiles(move(files, i, 1)) : undefined} onRemove={() => setFiles(files.filter((_, k) => k !== i))} />
          ))}
        </div>
      )}
      {files.length === 1 && <div style={{ marginTop: 12 }}><Alert kind="info">Add at least one more PDF to merge.</Alert></div>}
      {r.busy ? <Processing label="Merging PDFs…" progress={r.progress} /> : files.length > 1 && (
        <div className="cta-row"><button className="btn btn-primary btn-lg" onClick={go}><Icon name="combine" /> Merge {files.length} PDFs</button></div>
      )}
      {r.error && <div style={{ marginTop: 16 }}><Alert kind="err">{r.error}</Alert></div>}
    </div>
  );
}

type SplitMode = "extract" | "ranges" | "every";
export function SplitPdf({ tool }: ToolProps) {
  const [file, setFile] = useState<File>();
  const [total, setTotal] = useState<number>();
  const [mode, setMode] = useState<SplitMode>("extract");
  const [ranges, setRanges] = useState("1-2");
  const [result, setResult] = useState<OutFile[]>();
  const r = useRunner(tool.id);

  useEffect(() => {
    if (!file) return;
    setTotal(undefined);
    import("../engine/pdf").then(async (pdf) => {
      try { setTotal(await pdf.pageCount(await readBytes(file))); } catch (e: any) { r.setError(e.message); }
    });
  }, [file]);

  const go = () => r.run(async (onP) => {
    const pdf = await import("../engine/pdf");
    const bytes = await readBytes(file!);
    const n = total!;
    const name = baseName(file!.name);
    let groups: number[][];
    if (mode === "every") groups = Array.from({ length: n }, (_, i) => [i + 1]);
    else groups = pdf.parseRanges(ranges, n);
    if (mode === "extract") groups = [groups.flat()];
    const out: OutFile[] = [];
    for (let i = 0; i < groups.length; i++) {
      const g = groups[i];
      const b = await pdf.extractPages(bytes, g);
      const label = g.length === 1 ? `page-${g[0]}` : mode === "extract" ? "extracted" : `pages-${g[0]}-${g[g.length - 1]}`;
      out.push({ name: `${name}-${label}.pdf`, blob: blobOf(b) });
      onP((i + 1) / groups.length);
    }
    setResult(out);
  });
  const reset = () => { setFile(undefined); setResult(undefined); r.setError(undefined); };
  if (result && file) return <ResultPanel inputs={[file]} outputs={result} next={tool.next} toolId={tool.id} sourceLabel={tool.name} onReset={reset} />;
  return (
    <div>
      {!file ? <FileDrop kind="pdf" onFiles={(f) => setFile(f[0])} /> : (
        <>
          <FileRow file={file} onRemove={reset} extra={total ? <span className="badge">{total} pages</span> : null} />
          <div className="settings">
            <Field label="How do you want to split?">
              <Seg<SplitMode> label="Split mode" value={mode} onChange={setMode} options={[
                { value: "extract", label: "Extract pages into one PDF" }, { value: "ranges", label: "Each range as a file" }, { value: "every", label: "Every page separately" }]} />
            </Field>
            {mode !== "every" && (
              <Field label="Pages" htmlFor="ranges" hint={`Use commas and dashes, e.g. 1-3, 5, 8-end${total ? ` (1–${total})` : ""}`}>
                <input id="ranges" className="input" value={ranges} onChange={(e) => setRanges(e.target.value)} />
              </Field>
            )}
          </div>
          {r.busy ? <Processing label="Splitting…" progress={r.progress} /> : (
            <div className="cta-row"><button className="btn btn-primary btn-lg" onClick={go} disabled={!total}><Icon name="split" /> Split PDF</button></div>
          )}
        </>
      )}
      {r.error && <div style={{ marginTop: 16 }}><Alert kind="err">{r.error}</Alert></div>}
    </div>
  );
}

export function JpgToPdf({ tool }: ToolProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [pageSize, setPageSize] = useState("a4");
  const [orientation, setOrientation] = useState<"auto" | "portrait" | "landscape">("auto");
  const [margin, setMargin] = useState("24");
  const [result, setResult] = useState<OutFile[]>();
  const r = useRunner(tool.id);
  const go = () => r.run(async (onP) => {
    const pdf = await import("../engine/pdf");
    const b = await pdf.imagesToPdf(files, { pageSize, margin: +margin, orientation }, onP);
    setResult([{ name: files.length === 1 ? `${baseName(files[0].name)}.pdf` : "images.pdf", blob: blobOf(b) }]);
  });
  const reset = () => { setFiles([]); setResult(undefined); };
  if (result) return <ResultPanel title="Your PDF is ready." inputs={files} outputs={result} next={tool.next} toolId={tool.id} sourceLabel={tool.name} onReset={reset} previewImage={false} />;
  return (
    <div>
      <FileDrop kind="image" multiple onFiles={(f) => setFiles((p) => [...p, ...f].slice(0, 50))} label={files.length ? "Add more images" : "Choose images"} />
      {files.length > 0 && (
        <>
          <div className="file-list">
            {files.map((f, i) => (
              <FileRow key={i + f.name} file={f} onUp={i > 0 ? () => setFiles(move(files, i, -1)) : undefined}
                onDown={i < files.length - 1 ? () => setFiles(move(files, i, 1)) : undefined} onRemove={() => setFiles(files.filter((_, k) => k !== i))} />
            ))}
          </div>
          <div className="settings">
            <div className="form-grid">
              <Field label="Page size" htmlFor="ps">
                <select id="ps" className="select" value={pageSize} onChange={(e) => setPageSize(e.target.value)}>
                  <option value="a4">A4</option><option value="letter">US Letter</option><option value="fit">Same as image</option>
                </select>
              </Field>
              <Field label="Orientation" htmlFor="or">
                <select id="or" className="select" value={orientation} onChange={(e) => setOrientation(e.target.value as any)} disabled={pageSize === "fit"}>
                  <option value="auto">Automatic</option><option value="portrait">Portrait</option><option value="landscape">Landscape</option>
                </select>
              </Field>
              <Field label="Margin" htmlFor="mg">
                <select id="mg" className="select" value={margin} onChange={(e) => setMargin(e.target.value)}>
                  <option value="0">None</option><option value="24">Small</option><option value="48">Large</option>
                </select>
              </Field>
            </div>
          </div>
          {r.busy ? <Processing label="Creating PDF…" progress={r.progress} /> : (
            <div className="cta-row"><button className="btn btn-primary btn-lg" onClick={go}><Icon name="file-image" /> Create PDF ({files.length} page{files.length > 1 ? "s" : ""})</button></div>
          )}
        </>
      )}
      {r.error && <div style={{ marginTop: 16 }}><Alert kind="err">{r.error}</Alert></div>}
    </div>
  );
}

export function PdfToJpg({ tool }: ToolProps) {
  const [file, setFile] = useState<File>();
  const [dpi, setDpi] = useState<"72" | "150" | "300">("150");
  const [fmt, setFmt] = useState<"jpeg" | "png">("jpeg");
  const [pages, setPages] = useState("");
  const [result, setResult] = useState<OutFile[]>();
  const r = useRunner(tool.id);
  const go = () => r.run(async (onP) => {
    const pdf = await import("../engine/pdf");
    const bytes = await readBytes(file!);
    let list: number[] | undefined;
    if (pages.trim()) list = pdf.parseRanges(pages, await pdf.pageCount(bytes)).flat();
    const out = await pdf.pdfToImages(bytes, +dpi, 0.9, fmt, list, onP);
    setResult(out.map((o) => ({ name: `${baseName(file!.name)}-page-${o.page}.${fmt === "png" ? "png" : "jpg"}`, blob: o.blob })));
  });
  const reset = () => { setFile(undefined); setResult(undefined); };
  if (result && file) return <ResultPanel title={`${result.length} image${result.length > 1 ? "s" : ""} ready.`} inputs={[]} outputs={result} next={tool.next} toolId={tool.id} sourceLabel={tool.name} onReset={reset} />;
  return (
    <div>
      {!file ? <FileDrop kind="pdf" onFiles={(f) => setFile(f[0])} /> : (
        <>
          <FileRow file={file} onRemove={reset} />
          <div className="settings">
            <div className="row" style={{ gap: 24, alignItems: "flex-start" }}>
              <Field label="Resolution"><Seg label="Resolution" value={dpi} onChange={setDpi} options={[{ value: "72", label: "72 DPI" }, { value: "150", label: "150 DPI" }, { value: "300", label: "300 DPI (print)" }]} /></Field>
              <Field label="Format"><Seg label="Format" value={fmt} onChange={setFmt} options={[{ value: "jpeg", label: "JPG" }, { value: "png", label: "PNG" }]} /></Field>
            </div>
            <Field label="Pages (optional)" htmlFor="pg" hint="Leave empty for all pages, or enter e.g. 1-3, 5">
              <input id="pg" className="input" value={pages} onChange={(e) => setPages(e.target.value)} placeholder="All pages" />
            </Field>
          </div>
          {r.busy ? <Processing label="Rendering pages…" progress={r.progress} /> : (
            <div className="cta-row"><button className="btn btn-primary btn-lg" onClick={go}><Icon name="images" /> Convert to {fmt === "png" ? "PNG" : "JPG"}</button></div>
          )}
        </>
      )}
      {r.error && <div style={{ marginTop: 16 }}><Alert kind="err">{r.error}</Alert></div>}
    </div>
  );
}

export function PdfTextExtractor({ tool }: ToolProps) {
  const [file, setFile] = useState<File>();
  const [pages, setPages] = useState<string[]>();
  const r = useRunner(tool.id);
  const go = (f: File) => r.run(async (onP) => {
    const pdf = await import("../engine/pdf");
    setPages(await pdf.pdfText(await readBytes(f), onP));
  });
  const all = pages?.join("\n\n") || "";
  const reset = () => { setFile(undefined); setPages(undefined); };
  return (
    <div>
      {!file ? <FileDrop kind="pdf" onFiles={(f) => { setFile(f[0]); go(f[0]); }} /> : <FileRow file={file} onRemove={reset} />}
      {r.busy && <Processing label="Reading text…" progress={r.progress} />}
      {pages && (
        <div className="stack" style={{ marginTop: 18 }}>
          {!all.trim() ? (
            <Alert kind="warn">No selectable text was found. This PDF is probably a scanned image — text extraction needs a digitally created PDF.</Alert>
          ) : (
            <>
              <div className="row between">
                <span className="muted">{pages.length} page{pages.length > 1 ? "s" : ""} · {all.split(/\s+/).filter(Boolean).length.toLocaleString()} words · {formatBytes(new Blob([all]).size)}</span>
                <div className="row">
                  <CopyButton text={all} label="Copy all" />
                  <button className="btn btn-secondary btn-sm" onClick={() => downloadBlob(new Blob([all], { type: "text/plain;charset=utf-8" }), `${baseName(file!.name)}.txt`, tool.id)}>
                    <Icon name="download" size={15} /> Download .txt
                  </button>
                </div>
              </div>
              <textarea className="textarea" style={{ minHeight: 360 }} readOnly value={pages.map((p, i) => `— Page ${i + 1} —\n${p}`).join("\n\n")} aria-label="Extracted text" />
              <div className="chips">
                <a className="chip" href="/tools/text/word-counter"><Icon name="arrow-right" size={15} /> Count words</a>
                <a className="chip" href="/tools/ai/ai-text-summarizer"><Icon name="arrow-right" size={15} /> Summarize</a>
                <a className="chip" href="/workflows/fix-pdf-copied-text"><Icon name="arrow-right" size={15} /> Fix broken lines</a>
              </div>
            </>
          )}
        </div>
      )}
      {r.error && <div style={{ marginTop: 16 }}><Alert kind="err">{r.error}</Alert></div>}
    </div>
  );
}
