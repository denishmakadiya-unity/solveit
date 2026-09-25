// Browser-side PDF processing with pdf-lib (writing) and pdf.js (reading/rendering).
// Both libraries are loaded on demand so pages stay fast.

declare const __PDFJS_BASE__: string;
const PDFJS_BASE = typeof __PDFJS_BASE__ === "string" ? __PDFJS_BASE__ : "/assets/pdfjs/";
let pdfjsPromise: Promise<any> | null = null;
export function loadPdfjs() {
  if (!pdfjsPromise) {
    // The legacy build bundles polyfills (e.g. Map.getOrInsertComputed) so it runs in all current browsers.
    pdfjsPromise = import("pdfjs-dist/legacy/build/pdf.mjs" as any).then((m: any) => {
      const lib = m.default?.GlobalWorkerOptions ? m.default : m;
      lib.GlobalWorkerOptions.workerSrc = `${PDFJS_BASE}pdf.worker.min.mjs`;
      return lib;
    });
  }
  return pdfjsPromise;
}
export const loadPdfLib = () => import("pdf-lib");

const PDFJS_OPTS = {
  cMapUrl: `${PDFJS_BASE}cmaps/`,
  cMapPacked: true,
  standardFontDataUrl: `${PDFJS_BASE}standard_fonts/`,
  wasmUrl: `${PDFJS_BASE}wasm/`,
  isEvalSupported: false,
};

function friendly(e: any): Error {
  const m = String(e?.message || e);
  if (/encrypt|password/i.test(m)) return new Error("This PDF is password-protected. Remove the password in your PDF app first, then try again.");
  if (/Invalid PDF|No PDF header|Failed to parse/i.test(m)) return new Error("This file doesn't look like a valid PDF.");
  return e instanceof Error ? e : new Error(m);
}

export async function openPdfjs(bytes: Uint8Array) {
  const pdfjs = await loadPdfjs();
  try {
    return await pdfjs.getDocument({ data: bytes.slice(), ...PDFJS_OPTS }).promise;
  } catch (e) {
    throw friendly(e);
  }
}

export async function pageCount(bytes: Uint8Array) {
  const { PDFDocument } = await loadPdfLib();
  try {
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: false, updateMetadata: false });
    return doc.getPageCount();
  } catch (e) {
    throw friendly(e);
  }
}

async function saveDoc(doc: any) {
  doc.setProducer("SolveIt");
  doc.setCreator("SolveIt");
  return new Uint8Array(await doc.save({ useObjectStreams: true }));
}

export async function optimizeLossless(bytes: Uint8Array) {
  const { PDFDocument } = await loadPdfLib();
  let doc;
  try {
    doc = await PDFDocument.load(bytes, { updateMetadata: false });
  } catch (e) {
    throw friendly(e);
  }
  const out = await saveDoc(doc);
  return out.length < bytes.length ? out : bytes;
}

export async function renderPage(pdf: any, n: number, dpi: number) {
  const page = await pdf.getPage(n);
  const base = page.getViewport({ scale: 1 });
  let scale = dpi / 72;
  const maxPx = 5000;
  if (base.width * scale > maxPx || base.height * scale > maxPx) scale = maxPx / Math.max(base.width, base.height);
  const vp = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(vp.width);
  canvas.height = Math.ceil(vp.height);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, canvas, viewport: vp }).promise;
  page.cleanup();
  return { canvas, widthPt: base.width, heightPt: base.height };
}

const toJpeg = (c: HTMLCanvasElement, q: number) =>
  new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Couldn't encode page image."))), "image/jpeg", q));

export async function rasterize(bytes: Uint8Array, dpi: number, quality: number, onProgress?: (p: number) => void) {
  const pdf = await openPdfjs(bytes);
  const { PDFDocument } = await loadPdfLib();
  const out = await PDFDocument.create();
  for (let i = 1; i <= pdf.numPages; i++) {
    const { canvas, widthPt, heightPt } = await renderPage(pdf, i, dpi);
    const jpg = await toJpeg(canvas, quality);
    const img = await out.embedJpg(new Uint8Array(await jpg.arrayBuffer()));
    const page = out.addPage([widthPt, heightPt]);
    page.drawImage(img, { x: 0, y: 0, width: widthPt, height: heightPt });
    canvas.width = canvas.height = 0;
    onProgress?.(i / pdf.numPages);
  }
  await pdf.destroy();
  return saveDoc(out);
}

export type CompressMode = "lossless" | "balanced" | "strong" | "custom";
const PRESET: Record<string, [number, number]> = { balanced: [120, 0.72], strong: [90, 0.5] };

export async function compressPdf(bytes: Uint8Array, mode: CompressMode, custom?: { dpi: number; quality: number }, onProgress?: (p: number) => void) {
  const notes: string[] = [];
  const lossless = await optimizeLossless(bytes);
  if (mode === "lossless") {
    onProgress?.(1);
    if (lossless.length >= bytes.length) notes.push("This PDF is already well optimized. Try Balanced or Strong for bigger savings.");
    return { bytes: lossless, notes };
  }
  const [dpi, q] = mode === "custom" && custom ? [custom.dpi, custom.quality] : PRESET[mode] || PRESET.balanced;
  const r = await rasterize(bytes, dpi, q, onProgress);
  if (r.length >= lossless.length) {
    notes.push("Image compression wouldn't make this PDF smaller, so the text-preserving version was kept.");
    return { bytes: lossless, notes };
  }
  notes.push("Pages were converted to optimized images; text is no longer selectable.");
  return { bytes: r, notes };
}

const LADDER: [number, number][] = [[150, 0.8], [135, 0.74], [120, 0.68], [108, 0.62], [96, 0.56], [84, 0.5], [72, 0.44], [62, 0.38], [52, 0.32], [42, 0.27]];

export async function ensurePdfUnder(bytes: Uint8Array, maxBytes: number, onProgress?: (p: number) => void) {
  const notes: string[] = [];
  if (bytes.length <= maxBytes) { notes.push("Already under the size limit — no extra compression needed."); return { bytes, notes, met: true }; }
  const lossless = await optimizeLossless(bytes);
  if (lossless.length <= maxBytes) { notes.push("Reached the limit with lossless optimization."); return { bytes: lossless, notes, met: true }; }
  // Estimate a starting rung from the size ratio, then walk toward the highest quality that fits.
  const ratio = maxBytes / lossless.length;
  let i = ratio > 0.6 ? 0 : ratio > 0.35 ? 2 : ratio > 0.18 ? 4 : 6;
  let best = lossless, fit: { bytes: Uint8Array; rung: number } | null = null, renders = 0;
  const render = async (k: number) => {
    const [dpi, q] = LADDER[k];
    renders++;
    const r = await rasterize(bytes, dpi, q, (p) => onProgress?.(Math.min(0.95, (renders - 1 + p) / 5)));
    if (r.length < best.length) best = r;
    return r;
  };
  let r = await render(i);
  if (r.length <= maxBytes) {
    fit = { bytes: r, rung: i };
    // Try higher quality while it still fits.
    while (i > 0) {
      const up = await render(i - 1);
      if (up.length > maxBytes) break;
      i--; fit = { bytes: up, rung: i };
    }
  } else {
    while (i < LADDER.length - 1) {
      i++;
      r = await render(i);
      if (r.length <= maxBytes) { fit = { bytes: r, rung: i }; break; }
    }
  }
  onProgress?.(1);
  if (fit) {
    notes.push(`Compressed at ${LADDER[fit.rung][0]} DPI to fit the limit. Text is no longer selectable.`);
    return { bytes: fit.bytes, notes, met: true };
  }
  notes.push("Couldn't reach the size limit even at the lowest readable quality. Try removing pages you don't need with Split PDF.");
  return { bytes: best, notes, met: false };
}

export async function mergePdfs(list: Uint8Array[], onProgress?: (p: number) => void) {
  const { PDFDocument } = await loadPdfLib();
  const out = await PDFDocument.create();
  for (let i = 0; i < list.length; i++) {
    let src;
    try { src = await PDFDocument.load(list[i], { updateMetadata: false }); } catch (e) { throw friendly(e); }
    const pages = await out.copyPages(src, src.getPageIndices());
    pages.forEach((p: any) => out.addPage(p));
    onProgress?.((i + 1) / list.length);
  }
  return saveDoc(out);
}

export function parseRanges(input: string, total: number): number[][] {
  const groups: number[][] = [];
  for (const part of input.split(/[,;]+/).map((s) => s.trim()).filter(Boolean)) {
    const m = part.match(/^(\d+)?\s*(?:-|–|to)\s*(\d+|end)?$/i);
    if (m && (m[1] || m[2])) {
      const a = m[1] ? +m[1] : 1;
      const b = !m[2] || /end/i.test(m[2]) ? total : +m[2];
      if (a < 1 || b > total || a > b) throw new Error(`Page range “${part}” is outside 1–${total}.`);
      groups.push(Array.from({ length: b - a + 1 }, (_, i) => a + i));
    } else if (/^\d+$/.test(part)) {
      const n = +part;
      if (n < 1 || n > total) throw new Error(`Page ${n} doesn't exist. This PDF has ${total} pages.`);
      groups.push([n]);
    } else throw new Error(`“${part}” isn't a valid page range. Use formats like 1-3, 5, 8-end.`);
  }
  if (!groups.length) throw new Error("Enter at least one page or range.");
  return groups;
}

export async function extractPages(bytes: Uint8Array, pages: number[]) {
  const { PDFDocument } = await loadPdfLib();
  let src;
  try { src = await PDFDocument.load(bytes, { updateMetadata: false }); } catch (e) { throw friendly(e); }
  const out = await PDFDocument.create();
  const copied = await out.copyPages(src, pages.map((p) => p - 1));
  copied.forEach((p: any) => out.addPage(p));
  return saveDoc(out);
}

const PAGE_SIZES: Record<string, [number, number]> = { a4: [595.28, 841.89], letter: [612, 792] };

export async function imagesToPdf(
  images: Blob[],
  opts: { pageSize: string; margin: number; orientation?: "auto" | "portrait" | "landscape" },
  onProgress?: (p: number) => void,
) {
  const { PDFDocument } = await loadPdfLib();
  const { loadImage, encode, hasAlpha } = await import("./image");
  const out = await PDFDocument.create();
  for (let i = 0; i < images.length; i++) {
    const b = images[i];
    let img;
    if (b.type === "image/jpeg") img = await out.embedJpg(new Uint8Array(await b.arrayBuffer()));
    else if (b.type === "image/png") img = await out.embedPng(new Uint8Array(await b.arrayBuffer()));
    else {
      const c = await loadImage(b);
      const alpha = hasAlpha(c);
      const enc = await encode(c, alpha ? "png" : "jpeg", 0.92);
      img = alpha ? await out.embedPng(new Uint8Array(await enc.arrayBuffer())) : await out.embedJpg(new Uint8Array(await enc.arrayBuffer()));
    }
    const m = opts.margin || 0;
    let pw: number, ph: number;
    if (opts.pageSize === "fit") { pw = img.width * 0.75 + m * 2; ph = img.height * 0.75 + m * 2; }
    else {
      [pw, ph] = PAGE_SIZES[opts.pageSize] || PAGE_SIZES.a4;
      const land = opts.orientation === "landscape" || (opts.orientation !== "portrait" && img.width > img.height);
      if (land) [pw, ph] = [ph, pw];
    }
    const page = out.addPage([pw, ph]);
    const s = Math.min((pw - m * 2) / img.width, (ph - m * 2) / img.height);
    const w = img.width * s, h = img.height * s;
    page.drawImage(img, { x: (pw - w) / 2, y: (ph - h) / 2, width: w, height: h });
    onProgress?.((i + 1) / images.length);
  }
  return saveDoc(out);
}

export async function pdfToImages(bytes: Uint8Array, dpi: number, quality: number, format: "jpeg" | "png" = "jpeg", pages?: number[], onProgress?: (p: number) => void) {
  const pdf = await openPdfjs(bytes);
  const list = pages?.length ? pages : Array.from({ length: pdf.numPages }, (_, i) => i + 1);
  const out: { page: number; blob: Blob; width: number; height: number }[] = [];
  for (let k = 0; k < list.length; k++) {
    const { canvas } = await renderPage(pdf, list[k], dpi);
    const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("Couldn't encode page."))), format === "png" ? "image/png" : "image/jpeg", quality));
    out.push({ page: list[k], blob, width: canvas.width, height: canvas.height });
    canvas.width = canvas.height = 0;
    onProgress?.((k + 1) / list.length);
  }
  await pdf.destroy();
  return out;
}

export async function pdfText(bytes: Uint8Array, onProgress?: (p: number) => void) {
  const pdf = await openPdfjs(bytes);
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    let line = "", text = "", lastY: number | null = null;
    for (const it of tc.items as any[]) {
      if (!("str" in it)) continue;
      const y = it.transform?.[5];
      if (lastY !== null && Math.abs(y - lastY) > 2) { text += line.trimEnd() + "\n"; line = ""; }
      line += it.str + (it.hasEOL ? "\n" : "");
      lastY = y;
    }
    text += line;
    pages.push(text.replace(/\n{3,}/g, "\n\n").trim());
    onProgress?.(i / pdf.numPages);
  }
  await pdf.destroy();
  return pages;
}
