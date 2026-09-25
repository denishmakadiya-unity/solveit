import { useEffect, useRef, useState } from "react";
import { Icon } from "../components/Icon";
import { Alert, Field, NumberInput, Seg } from "../components/ui";
import { FileDrop, FileRow, Processing, ResultPanel, type OutFile } from "../components/files";
import { useRunner, type ToolProps } from "./common";
import { baseName, clamp, formatBytes } from "../lib/format";
import type { MetaReport, OutFormat } from "../engine/image";

const EXT: Record<string, string> = { jpeg: "jpg", png: "png", webp: "webp" };
const img = () => import("../engine/image");

function useDims(file?: File) {
  const [d, setD] = useState<{ w: number; h: number }>();
  useEffect(() => {
    if (!file) return setD(undefined);
    let alive = true;
    img().then((m) => m.loadImage(file)).then((c) => alive && setD({ w: c.width, h: c.height })).catch(() => {});
    return () => { alive = false; };
  }, [file]);
  return d;
}

function FilesBlock({ files, setFiles, multiple = true }: { files: File[]; setFiles: (f: File[]) => void; multiple?: boolean }) {
  return (
    <>
      <FileDrop kind="image" multiple={multiple} onFiles={(f) => setFiles(multiple ? [...files, ...f].slice(0, 50) : f.slice(0, 1))}
        label={files.length ? (multiple ? "Add more images" : "Choose a different image") : multiple ? "Choose images" : "Choose an image"} />
      {files.length > 0 && (
        <div className="file-list">{files.map((f, i) => <FileRow key={i + f.name} file={f} onRemove={() => setFiles(files.filter((_, k) => k !== i))} />)}</div>
      )}
    </>
  );
}

// ── Image Compressor ──
export function ImageCompressor({ tool }: ToolProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [mode, setMode] = useState<"quality" | "target">("quality");
  const [quality, setQuality] = useState(78);
  const [targetKB, setTargetKB] = useState("100");
  const [format, setFormat] = useState<"same" | OutFormat>("same");
  const [result, setResult] = useState<{ out: OutFile[]; notes: string[] }>();
  const r = useRunner(tool.id);
  useEffect(() => {
    const t = new URLSearchParams(location.search).get("target");
    if (t && /^\d+$/.test(t)) { setMode("target"); setTargetKB(t); }
  }, []);

  const go = () => r.run(async (onP) => {
    const m = await img();
    const out: OutFile[] = [];
    const notes = new Set<string>();
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const c = await m.loadImage(f);
      let fmt: OutFormat = format === "same" ? m.formatFromMime(f.type) : format;
      let blob: Blob;
      if (mode === "target") {
        const res = await m.encodeUnder(c, fmt, Math.max(5, +targetKB) * 1024);
        blob = res.blob; res.notes.forEach((n) => notes.add(n));
        if (fmt === "png") fmt = "jpeg";
      } else {
        if (fmt === "png") { notes.add("PNG is lossless, so quality doesn't apply. Choose JPG or WebP for much smaller files."); }
        blob = await m.encode(c, fmt, quality / 100);
        if (blob.size >= f.size && format === "same") { blob = f; notes.add(`“${f.name}” was already well optimized, so the original was kept.`); }
      }
      out.push({ name: `${baseName(f.name)}-compressed.${EXT[fmt]}`, blob });
      onP((i + 1) / files.length);
    }
    setResult({ out, notes: [...notes] });
  });
  const reset = () => { setFiles([]); setResult(undefined); };
  if (result) return <ResultPanel inputs={files} outputs={result.out} notes={result.notes} next={tool.next} toolId={tool.id} sourceLabel={tool.name} onReset={reset} />;
  return (
    <div>
      <FilesBlock files={files} setFiles={setFiles} />
      {files.length > 0 && (
        <>
          <div className="settings">
            <Field label="Compress by">
              <Seg label="Compress by" value={mode} onChange={setMode} options={[{ value: "quality", label: "Quality" }, { value: "target", label: "Target size" }]} />
            </Field>
            {mode === "quality" ? (
              <Field label={`Quality: ${quality}%`} htmlFor="q" hint="75–85% keeps photos looking great at a fraction of the size.">
                <input id="q" type="range" min={10} max={95} value={quality} onChange={(e) => setQuality(+e.target.value)} />
              </Field>
            ) : (
              <div className="row" style={{ alignItems: "flex-end" }}>
                <Field label="Maximum size per image" htmlFor="tk"><NumberInput id="tk" value={targetKB} onChange={setTargetKB} min={5} suffix="KB" /></Field>
                <div className="chips">{["20", "50", "100", "200", "500", "1000"].map((v) => <button key={v} type="button" className="chip" aria-pressed={targetKB === v} onClick={() => setTargetKB(v)}>{v === "1000" ? "1 MB" : v + " KB"}</button>)}</div>
              </div>
            )}
            <Field label="Output format">
              <Seg label="Output format" value={format} onChange={setFormat} options={[{ value: "same", label: "Same as input" }, { value: "jpeg", label: "JPG" }, { value: "webp", label: "WebP" }, { value: "png", label: "PNG" }]} />
            </Field>
          </div>
          {r.busy ? <Processing label="Compressing images…" progress={r.progress} /> : (
            <div className="cta-row"><button className="btn btn-primary btn-lg" onClick={go}><Icon name="image-down" /> Compress {files.length > 1 ? `${files.length} images` : "image"}</button></div>
          )}
        </>
      )}
      {r.error && <div style={{ marginTop: 16 }}><Alert kind="err">{r.error}</Alert></div>}
    </div>
  );
}

// ── Image Resizer ──
const PRESETS: { label: string; w: number; h: number }[] = [
  { label: "Instagram post 1080×1080", w: 1080, h: 1080 }, { label: "Instagram portrait 1080×1350", w: 1080, h: 1350 },
  { label: "Story / Reel 1080×1920", w: 1080, h: 1920 }, { label: "YouTube thumbnail 1280×720", w: 1280, h: 720 },
  { label: "Link preview 1200×630", w: 1200, h: 630 }, { label: "Facebook cover 1640×624", w: 1640, h: 624 },
  { label: "LinkedIn banner 1584×396", w: 1584, h: 396 }, { label: "X header 1500×500", w: 1500, h: 500 },
  { label: "Passport 35×45 mm (413×531)", w: 413, h: 531 }, { label: "Full HD 1920×1080", w: 1920, h: 1080 },
];

export function ImageResizer({ tool }: ToolProps) {
  const [files, setFiles] = useState<File[]>([]);
  const dims = useDims(files[0]);
  const [by, setBy] = useState<"px" | "pct">("px");
  const [w, setW] = useState("1080");
  const [h, setH] = useState("1080");
  const [pct, setPct] = useState(50);
  const [lock, setLock] = useState(true);
  const [fit, setFit] = useState<"inside" | "cover" | "contain" | "stretch">("cover");
  const [bg, setBg] = useState("#ffffff");
  const [result, setResult] = useState<OutFile[]>();
  const r = useRunner(tool.id);

  useEffect(() => { if (dims) { setW(String(dims.w)); setH(String(dims.h)); setFit("inside"); setLock(true); } }, [dims]);
  const ratio = dims ? dims.w / dims.h : 1;
  const onW = (v: string) => { setW(v); if (lock && fit === "inside" && +v) setH(String(Math.round(+v / ratio))); };
  const onH = (v: string) => { setH(v); if (lock && fit === "inside" && +v) setW(String(Math.round(+v * ratio))); };

  const go = () => r.run(async (onP) => {
    const m = await img();
    const out: OutFile[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const c = await m.loadImage(f);
      const tw = by === "pct" ? c.width * pct / 100 : +w, th = by === "pct" ? c.height * pct / 100 : +h;
      if (!(tw > 0 && th > 0) || tw > 12000 || th > 12000) throw new Error("Enter a width and height between 1 and 12,000 pixels.");
      const effFit = by === "pct" ? "stretch" : lock && fit === "inside" ? "inside" : fit;
      const res = effFit === "inside" && (tw > c.width || th > c.height)
        ? m.resize(c, tw, th, "stretch")
        : m.resize(c, tw, th, effFit, bg);
      const fmt = m.formatFromMime(f.type);
      out.push({ name: `${baseName(f.name)}-${res.width}x${res.height}.${EXT[fmt]}`, blob: await m.encode(res, fmt, 0.92, bg) });
      onP((i + 1) / files.length);
    }
    setResult(out);
  });
  const reset = () => { setFiles([]); setResult(undefined); };
  if (result) return <ResultPanel title="Resized!" inputs={files} outputs={result} next={tool.next} toolId={tool.id} sourceLabel={tool.name} onReset={reset} />;
  return (
    <div>
      <FilesBlock files={files} setFiles={setFiles} />
      {files.length > 0 && (
        <>
          <div className="settings">
            {dims && <p className="muted" style={{ fontSize: "0.9rem" }}>Original: <b style={{ color: "var(--ink)" }}>{dims.w} × {dims.h}px</b>{files.length > 1 && " (first image)"}</p>}
            <Seg label="Resize by" value={by} onChange={setBy} options={[{ value: "px", label: "Pixels" }, { value: "pct", label: "Percentage" }]} />
            {by === "px" ? (
              <>
                <Field label="Preset" htmlFor="preset">
                  <select id="preset" className="select" defaultValue="" onChange={(e) => {
                    const p = PRESETS[+e.target.value]; if (!p) return; setW(String(p.w)); setH(String(p.h)); setLock(false); setFit("cover");
                  }}>
                    <option value="">Custom size</option>
                    {PRESETS.map((p, i) => <option key={i} value={i}>{p.label}</option>)}
                  </select>
                </Field>
                <div className="form-grid">
                  <Field label="Width" htmlFor="rw"><NumberInput id="rw" value={w} onChange={onW} min={1} suffix="px" /></Field>
                  <Field label="Height" htmlFor="rh"><NumberInput id="rh" value={h} onChange={onH} min={1} suffix="px" /></Field>
                  <Field label="Fit" htmlFor="fit">
                    <select id="fit" className="select" value={lock ? "inside" : fit} onChange={(e) => { const v = e.target.value as any; setFit(v); setLock(v === "inside"); }}>
                      <option value="inside">Keep aspect ratio</option>
                      <option value="cover">Fill frame (crop edges)</option>
                      <option value="contain">Fit inside with background</option>
                      <option value="stretch">Stretch to exact size</option>
                    </select>
                  </Field>
                  {!lock && fit === "contain" && <Field label="Background" htmlFor="bg"><input id="bg" type="color" className="color-input" value={bg} onChange={(e) => setBg(e.target.value)} /></Field>}
                </div>
              </>
            ) : (
              <Field label={`Scale: ${pct}%`} htmlFor="pct" hint={dims ? `New size: ${Math.round(dims.w * pct / 100)} × ${Math.round(dims.h * pct / 100)}px` : undefined}>
                <input id="pct" type="range" min={5} max={200} value={pct} onChange={(e) => setPct(+e.target.value)} />
              </Field>
            )}
          </div>
          {r.busy ? <Processing label="Resizing…" progress={r.progress} /> : (
            <div className="cta-row"><button className="btn btn-primary btn-lg" onClick={go}><Icon name="scaling" /> Resize {files.length > 1 ? `${files.length} images` : "image"}</button></div>
          )}
        </>
      )}
      {r.error && <div style={{ marginTop: 16 }}><Alert kind="err">{r.error}</Alert></div>}
    </div>
  );
}

// ── Image Converter ──
export function ImageConverter({ tool }: ToolProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [format, setFormat] = useState<OutFormat>("webp");
  const [quality, setQuality] = useState(90);
  const [bg, setBg] = useState("#ffffff");
  const [result, setResult] = useState<OutFile[]>();
  const r = useRunner(tool.id);
  const go = () => r.run(async (onP) => {
    const m = await img();
    const out: OutFile[] = [];
    for (let i = 0; i < files.length; i++) {
      const c = await m.loadImage(files[i]);
      out.push({ name: `${baseName(files[i].name)}.${EXT[format]}`, blob: await m.encode(c, format, quality / 100, bg) });
      onP((i + 1) / files.length);
    }
    setResult(out);
  });
  const reset = () => { setFiles([]); setResult(undefined); };
  if (result) return <ResultPanel title="Converted!" inputs={files} outputs={result} next={tool.next} toolId={tool.id} sourceLabel={tool.name} onReset={reset} />;
  return (
    <div>
      <FilesBlock files={files} setFiles={setFiles} />
      {files.length > 0 && (
        <>
          <div className="settings">
            <Field label="Convert to"><Seg label="Convert to" value={format} onChange={setFormat} options={[{ value: "jpeg", label: "JPG" }, { value: "png", label: "PNG" }, { value: "webp", label: "WebP" }]} /></Field>
            {format !== "png" && (
              <Field label={`Quality: ${quality}%`} htmlFor="cq"><input id="cq" type="range" min={10} max={100} value={quality} onChange={(e) => setQuality(+e.target.value)} /></Field>
            )}
            {format === "jpeg" && (
              <Field label="Background for transparent areas" htmlFor="cbg"><input id="cbg" type="color" className="color-input" value={bg} onChange={(e) => setBg(e.target.value)} /></Field>
            )}
          </div>
          {r.busy ? <Processing label="Converting…" progress={r.progress} /> : (
            <div className="cta-row"><button className="btn btn-primary btn-lg" onClick={go}><Icon name="repeat" /> Convert to {format === "jpeg" ? "JPG" : format.toUpperCase()}</button></div>
          )}
        </>
      )}
      {r.error && <div style={{ marginTop: 16 }}><Alert kind="err">{r.error}</Alert></div>}
    </div>
  );
}

// ── Image Cropper ──
type Box = { x: number; y: number; w: number; h: number };
const RATIOS = [{ value: "free", label: "Free" }, { value: "1:1", label: "1:1" }, { value: "4:5", label: "4:5" }, { value: "16:9", label: "16:9" }, { value: "9:16", label: "9:16" }, { value: "3:2", label: "3:2" }, { value: "4:3", label: "4:3" }];

export function ImageCropper({ tool }: ToolProps) {
  const [file, setFile] = useState<File>();
  const [src, setSrc] = useState<HTMLCanvasElement>();
  const [box, setBox] = useState<Box>({ x: 0, y: 0, w: 0, h: 0 });
  const [ratio, setRatio] = useState("free");
  const [result, setResult] = useState<OutFile[]>();
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ mode: string; sx: number; sy: number; b: Box } | null>(null);
  const [, force] = useState(0);
  const r = useRunner(tool.id);

  useEffect(() => {
    if (!file) return;
    img().then((m) => m.loadImage(file)).then((c) => {
      setSrc(c);
      setBox({ x: Math.round(c.width * 0.1), y: Math.round(c.height * 0.1), w: Math.round(c.width * 0.8), h: Math.round(c.height * 0.8) });
    }).catch((e) => r.setError(e.message));
  }, [file]);

  useEffect(() => {
    if (!src || !canvasRef.current) return;
    const cv = canvasRef.current;
    cv.width = src.width; cv.height = src.height;
    cv.getContext("2d")!.drawImage(src, 0, 0);
    const onResize = () => force((n) => n + 1);
    window.addEventListener("resize", onResize);
    requestAnimationFrame(onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [src]);

  const applyRatio = (rv: string) => {
    setRatio(rv);
    if (!src || rv === "free") return;
    const [a, b] = rv.split(":").map(Number);
    const R = a / b;
    let w = src.width, h = Math.round(w / R);
    if (h > src.height) { h = src.height; w = Math.round(h * R); }
    w = Math.round(w * 0.9); h = Math.round(h * 0.9);
    setBox({ x: Math.round((src.width - w) / 2), y: Math.round((src.height - h) / 2), w, h });
  };

  const scale = () => {
    const el = canvasRef.current;
    return el && src ? el.getBoundingClientRect().width / src.width : 1;
  };

  const onDown = (mode: string) => (e: React.PointerEvent) => {
    e.preventDefault(); e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { mode, sx: e.clientX, sy: e.clientY, b: { ...box } };
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || !src) return;
    const s = scale();
    const dx = (e.clientX - d.sx) / s, dy = (e.clientY - d.sy) / s;
    let { x, y, w, h } = d.b;
    const R = ratio === "free" ? 0 : (() => { const [a, b] = ratio.split(":").map(Number); return a / b; })();
    if (d.mode === "move") {
      x = clamp(x + dx, 0, src.width - w); y = clamp(y + dy, 0, src.height - h);
    } else {
      if (d.mode.includes("e")) w = clamp(w + dx, 16, src.width - x);
      if (d.mode.includes("s")) h = clamp(h + dy, 16, src.height - y);
      if (d.mode.includes("w")) { const nx = clamp(x + dx, 0, x + w - 16); w = w + (x - nx); x = nx; }
      if (d.mode.includes("n")) { const ny = clamp(y + dy, 0, y + h - 16); h = h + (y - ny); y = ny; }
      if (R) {
        h = w / R;
        if (y + h > src.height) { h = src.height - y; w = h * R; }
        if (d.mode.includes("n")) y = d.b.y + d.b.h - h;
        if (d.mode.includes("w")) x = d.b.x + d.b.w - w;
        x = clamp(x, 0, src.width - w); y = clamp(y, 0, src.height - h);
      }
    }
    setBox({ x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) });
  };
  const onUp = () => { drag.current = null; };

  const go = () => r.run(async () => {
    const m = await img();
    const c = m.crop(src!, box.x, box.y, box.w, box.h);
    const fmt = m.formatFromMime(file!.type);
    setResult([{ name: `${baseName(file!.name)}-cropped.${EXT[fmt]}`, blob: await m.encode(c, fmt, 0.95) }]);
  });
  const reset = () => { setFile(undefined); setSrc(undefined); setResult(undefined); };
  if (result && file) return <ResultPanel title="Cropped!" inputs={[file]} outputs={result} next={tool.next} toolId={tool.id} sourceLabel={tool.name} onReset={reset} />;
  const s = scale();
  return (
    <div>
      {!file ? <FileDrop kind="image" onFiles={(f) => setFile(f[0])} /> : (
        <>
          <FileRow file={file} onRemove={reset} />
          <div className="settings">
            <Field label="Aspect ratio"><Seg label="Aspect ratio" value={ratio} onChange={applyRatio} options={RATIOS} /></Field>
            {src && (
              <div style={{ textAlign: "center" }}>
                <div className="crop-stage checker" ref={stageRef} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
                  <canvas ref={canvasRef} style={{ maxHeight: 520, width: "auto" }} aria-label="Image to crop" />
                  <div className="crop-box" style={{ left: box.x * s, top: box.y * s, width: box.w * s, height: box.h * s }} onPointerDown={onDown("move")}
                    role="slider" aria-label="Crop area" aria-valuetext={`${box.w} by ${box.h} pixels`} tabIndex={0}>
                    {["nw", "ne", "sw", "se"].map((k) => (
                      <i key={k} onPointerDown={onDown(k)} style={{ cursor: `${k}-resize`, left: k.includes("w") ? -8 : undefined, right: k.includes("e") ? -8 : undefined, top: k.includes("n") ? -8 : undefined, bottom: k.includes("s") ? -8 : undefined }} />
                    ))}
                  </div>
                </div>
                <p className="hint" style={{ marginTop: 8 }}>Drag the box to move it; drag a corner to resize. Selection: <b>{box.w} × {box.h}px</b></p>
              </div>
            )}
            <div className="form-grid">
              {(["x", "y", "w", "h"] as const).map((k) => (
                <Field key={k} label={{ x: "Left", y: "Top", w: "Width", h: "Height" }[k]} htmlFor={"c" + k}>
                  <NumberInput id={"c" + k} value={box[k]} suffix="px" onChange={(v) => src && setBox((b) => {
                    const n = { ...b, [k]: Math.max(0, Math.round(+v || 0)) };
                    n.w = clamp(n.w, 1, src.width); n.h = clamp(n.h, 1, src.height); n.x = clamp(n.x, 0, src.width - n.w); n.y = clamp(n.y, 0, src.height - n.h);
                    return n;
                  })} />
                </Field>
              ))}
            </div>
          </div>
          {r.busy ? <Processing label="Cropping…" /> : (
            <div className="cta-row"><button className="btn btn-primary btn-lg" onClick={go} disabled={!src}><Icon name="crop" /> Crop image</button></div>
          )}
        </>
      )}
      {r.error && <div style={{ marginTop: 16 }}><Alert kind="err">{r.error}</Alert></div>}
    </div>
  );
}

// ── Background Remover ──
export function BackgroundRemover({ tool }: ToolProps) {
  const [file, setFile] = useState<File>();
  const [src, setSrc] = useState<HTMLCanvasElement>();
  const [tol, setTol] = useState(40);
  const [soft, setSoft] = useState(12);
  const [fill, setFill] = useState<"transparent" | "color">("transparent");
  const [color, setColor] = useState("#ffffff");
  const [preview, setPreview] = useState<{ url: string; ratio: number; bg: string }>();
  const [result, setResult] = useState<OutFile[]>();
  const r = useRunner(tool.id);

  useEffect(() => {
    if (!file) return;
    img().then(async (m) => {
      const c = await m.loadImage(file);
      setSrc(c.width > 1400 || c.height > 1400 ? m.resize(c, 1400, 1400, "inside") : c);
    }).catch((e) => r.setError(e.message));
  }, [file]);

  useEffect(() => {
    if (!src) return;
    const t = setTimeout(async () => {
      const m = await img();
      const res = m.removeBackground(src, tol, soft, fill === "transparent" ? "transparent" : color);
      const b = await m.encode(res.canvas, "png", 1);
      setPreview((p) => { if (p) URL.revokeObjectURL(p.url); return { url: URL.createObjectURL(b), ratio: res.removedRatio, bg: res.bgColor }; });
    }, 180);
    return () => clearTimeout(t);
  }, [src, tol, soft, fill, color]);

  const go = () => r.run(async () => {
    const m = await img();
    const full = await m.loadImage(file!);
    const res = m.removeBackground(full, tol, soft, fill === "transparent" ? "transparent" : color);
    const fmt: OutFormat = fill === "transparent" ? "png" : m.formatFromMime(file!.type);
    setResult([{ name: `${baseName(file!.name)}-no-bg.${EXT[fmt]}`, blob: await m.encode(res.canvas, fmt, 0.95) }]);
  });
  const reset = () => { setFile(undefined); setSrc(undefined); setPreview(undefined); setResult(undefined); };
  if (result && file) return <ResultPanel title="Background removed." inputs={[file]} outputs={result} next={tool.next} toolId={tool.id} sourceLabel={tool.name} onReset={reset} />;
  return (
    <div>
      {!file ? <FileDrop kind="image" onFiles={(f) => setFile(f[0])} hint="Works best with plain or solid backgrounds — product shots, logos, signatures" /> : (
        <>
          <FileRow file={file} onRemove={reset} />
          <div className="settings">
            {preview && (
              <div style={{ textAlign: "center" }}>
                <img className="preview-img" src={preview.url} alt="Background removal preview" style={{ maxHeight: 380 }} />
                <p className="hint" style={{ marginTop: 8 }}>
                  Detected background <span style={{ display: "inline-block", width: 12, height: 12, borderRadius: 3, background: preview.bg, border: "1px solid var(--line)", verticalAlign: -1 }} /> · removed {Math.round(preview.ratio * 100)}% of the image
                </p>
                {preview.ratio < 0.03 && <Alert kind="warn">Very little background was found. Increase tolerance, or use an image with a plain background.</Alert>}
              </div>
            )}
            <div className="form-grid">
              <Field label={`Tolerance: ${tol}`} htmlFor="tol" hint="Higher removes more similar colors"><input id="tol" type="range" min={5} max={110} value={tol} onChange={(e) => setTol(+e.target.value)} /></Field>
              <Field label={`Edge softness: ${soft}`} htmlFor="soft"><input id="soft" type="range" min={0} max={40} value={soft} onChange={(e) => setSoft(+e.target.value)} /></Field>
            </div>
            <div className="row">
              <Seg label="Background" value={fill} onChange={setFill} options={[{ value: "transparent", label: "Transparent" }, { value: "color", label: "Solid color" }]} />
              {fill === "color" && <input aria-label="Fill color" type="color" className="color-input" value={color} onChange={(e) => setColor(e.target.value)} />}
            </div>
          </div>
          {r.busy ? <Processing label="Removing background…" /> : (
            <div className="cta-row"><button className="btn btn-primary btn-lg" onClick={go} disabled={!src}><Icon name="eraser" /> Remove background</button></div>
          )}
        </>
      )}
      {r.error && <div style={{ marginTop: 16 }}><Alert kind="err">{r.error}</Alert></div>}
    </div>
  );
}

// ── Metadata Remover ──
export function MetadataRemover({ tool }: ToolProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [reports, setReports] = useState<MetaReport[]>([]);
  const [result, setResult] = useState<OutFile[]>();
  const r = useRunner(tool.id);
  useEffect(() => {
    img().then((m) => Promise.all(files.map((f) => m.inspectMetadata(f)))).then(setReports);
  }, [files]);
  const go = () => r.run(async (onP) => {
    const m = await img();
    const out: OutFile[] = [];
    for (let i = 0; i < files.length; i++) {
      const c = await m.loadImage(files[i]);
      const fmt = m.formatFromMime(files[i].type);
      out.push({ name: `${baseName(files[i].name)}-clean.${EXT[fmt]}`, blob: await m.encode(c, fmt, 0.95) });
      onP((i + 1) / files.length);
    }
    setResult(out);
  });
  const reset = () => { setFiles([]); setResult(undefined); };
  const anyGps = reports.some((x) => x.gps);
  if (result) return <ResultPanel title="All hidden metadata removed." inputs={files} outputs={result} notes={["EXIF, GPS location, camera details, XMP and IPTC data were removed."]} next={tool.next} toolId={tool.id} sourceLabel={tool.name} onReset={reset} />;
  return (
    <div>
      <FilesBlock files={files} setFiles={setFiles} />
      {files.length > 0 && (
        <>
          <div className="settings">
            {anyGps && <Alert kind="warn"><b>GPS location found.</b> Anyone with these files could see where the photo was taken.</Alert>}
            <div className="table-wrap">
              <table>
                <thead><tr><th>File</th><th>EXIF</th><th>GPS</th><th>Camera</th><th>Taken</th><th className="num">Metadata size</th></tr></thead>
                <tbody>
                  {files.map((f, i) => {
                    const m = reports[i];
                    const yes = (v?: boolean) => v === undefined ? "…" : v ? <span className="badge warn">Found</span> : <span className="badge ok">None</span>;
                    return (
                      <tr key={i}>
                        <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>{f.name}</td>
                        <td>{yes(m?.exif)}</td><td>{yes(m?.gps)}</td><td>{m?.camera || "—"}</td><td>{m?.date || "—"}</td>
                        <td className="num">{m ? formatBytes(m.bytes) : "…"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          {r.busy ? <Processing label="Removing metadata…" progress={r.progress} /> : (
            <div className="cta-row"><button className="btn btn-primary btn-lg" onClick={go}><Icon name="shield-off" /> Remove metadata</button></div>
          )}
        </>
      )}
      {r.error && <div style={{ marginTop: 16 }}><Alert kind="err">{r.error}</Alert></div>}
    </div>
  );
}
