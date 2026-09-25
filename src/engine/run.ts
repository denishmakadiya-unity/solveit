// Workflow engine: runs a list of steps over the same session files ("upload once").
import type { ItemKind, WorkflowStep } from "../registry/types";
import { stepById } from "../registry/steps";
import { baseName } from "../lib/format";

export type Item = { name: string; kind: ItemKind; blob?: Blob; text?: string; width?: number; height?: number };
export type StepLog = { step: string; name: string; notes: string[]; ms: number; sizeAfter: number; ok: boolean; error?: string };

const TEXT_KINDS: ItemKind[] = ["text", "json", "csv"];
const textMime: Record<string, string> = { text: "text/plain", json: "application/json", csv: "text/csv" };
const textExt: Record<string, string> = { text: "txt", json: "json", csv: "csv" };

export function itemSize(it: Item) {
  return it.blob ? it.blob.size : new Blob([it.text || ""]).size;
}

export function itemToBlob(it: Item) {
  if (it.blob) return it.blob;
  return new Blob([it.text || ""], { type: `${textMime[it.kind] || "text/plain"};charset=utf-8` });
}

export function itemFileName(it: Item) {
  if (it.blob) return it.name;
  return `${baseName(it.name)}.${textExt[it.kind] || "txt"}`;
}

const renameExt = (name: string, ext: string) => `${baseName(name)}.${ext}`;
const extForFormat: Record<string, string> = { jpeg: "jpg", png: "png", webp: "webp" };

export async function filesToItems(files: File[], kind: ItemKind): Promise<Item[]> {
  if (TEXT_KINDS.includes(kind)) return Promise.all(files.map(async (f) => ({ name: f.name, kind, text: await f.text() })));
  return files.map((f) => ({ name: f.name, kind, blob: f }));
}

async function imageStep(it: Item, fn: (c: HTMLCanvasElement, img: typeof import("./image")) => Promise<{ canvas?: HTMLCanvasElement; blob?: Blob; name?: string; notes?: string[] }>) {
  const img = await import("./image");
  const c = await img.loadImage(it.blob!);
  const r = await fn(c, img);
  let blob = r.blob, width = r.canvas?.width ?? c.width, height = r.canvas?.height ?? c.height;
  if (!blob) {
    const fmt = img.formatFromMime(it.blob!.type);
    blob = await img.encode(r.canvas || c, fmt, fmt === "png" ? 1 : 0.92);
  }
  return { item: { ...it, blob, name: r.name || it.name, width, height }, notes: r.notes || [] };
}

export async function runStep(ws: WorkflowStep, items: Item[], onProgress?: (p: number) => void): Promise<{ items: Item[]; notes: string[] }> {
  const def = stepById(ws.step);
  if (!def) throw new Error(`Unknown step “${ws.step}”.`);
  const p = { ...def.defaults, ...(ws.params || {}) };
  const notes: string[] = [];
  const each = async (fn: (it: Item, i: number) => Promise<Item | { item: Item; notes: string[] }>) => {
    const out: Item[] = [];
    for (let i = 0; i < items.length; i++) {
      if (!def.accepts.includes(items[i].kind)) throw new Error(`${def.name} can't process ${items[i].kind.toUpperCase()} files.`);
      const r: any = await fn(items[i], i);
      if (r.item) { out.push(r.item); r.notes.forEach((n: string) => !notes.includes(n) && notes.push(n)); } else out.push(r);
      onProgress?.((i + 1) / items.length);
    }
    return out;
  };

  switch (ws.step) {
    case "resize":
      return { items: await each((it) => imageStep(it, async (c, img) => ({ canvas: img.resize(c, +p.width, +p.height, p.fit, p.background) }))), notes };
    case "crop-ratio":
      return { items: await each((it) => imageStep(it, async (c, img) => ({ canvas: img.cropToRatio(c, p.ratio) }))), notes };
    case "convert":
      return {
        items: await each((it) => imageStep(it, async (c, img) => ({ blob: await img.encode(c, p.format, (+p.quality || 90) / 100), name: renameExt(it.name, extForFormat[p.format]) }))),
        notes,
      };
    case "compress":
      return {
        items: await each((it) => imageStep(it, async (c, img) => {
          const fmt = img.formatFromMime(it.blob!.type);
          if (fmt === "png") {
            const b = await img.encode(c, "png", 1);
            return { blob: b, notes: ["PNG is lossless; convert to JPG or WebP for bigger savings."] };
          }
          const b = await img.encode(c, fmt, (+p.quality || 80) / 100);
          return { blob: b.size < it.blob!.size ? b : it.blob! };
        })),
        notes,
      };
    case "ensure-size":
      return {
        items: await each(async (it) => {
          const max = (+p.maxKB || 500) * 1024;
          if (it.blob!.size <= max) return { item: it, notes: ["Already under the size limit."] };
          return imageStep(it, async (c, img) => {
            const fmt = img.formatFromMime(it.blob!.type);
            const r = await img.encodeUnder(c, fmt, max);
            return { blob: r.blob, canvas: undefined, name: fmt === "png" ? renameExt(it.name, "jpg") : it.name, notes: r.notes };
          });
        }),
        notes,
      };
    case "strip-metadata":
      return {
        items: await each((it) => imageStep(it, async (c, img) => {
          const fmt = img.formatFromMime(it.blob!.type);
          return { blob: await img.encode(c, fmt, fmt === "png" ? 1 : 0.95), notes: ["All EXIF, GPS and other hidden metadata removed."] };
        })),
        notes,
      };
    case "remove-bg":
      return {
        items: await each((it) => imageStep(it, async (c, img) => {
          const r = img.removeBackground(c, +p.tolerance || 40, 12, p.fill);
          const transparent = p.fill === "transparent";
          const n: string[] = [];
          if (r.removedRatio < 0.02) n.push("Very little background was detected. This works best with plain, solid backgrounds.");
          return { blob: await img.encode(r.canvas, transparent ? "png" : img.formatFromMime(it.blob!.type), 0.95), name: transparent ? renameExt(it.name, "png") : it.name, notes: n };
        })),
        notes,
      };
    case "images-to-pdf": {
      for (const it of items) if (it.kind !== "image") throw new Error("Images to PDF needs image files.");
      const pdf = await import("./pdf");
      const bytes = await pdf.imagesToPdf(items.map((i) => i.blob!), { pageSize: p.pageSize, margin: +p.margin }, onProgress);
      const name = items.length === 1 ? renameExt(items[0].name, "pdf") : "images.pdf";
      notes.push(`${items.length} image${items.length > 1 ? "s" : ""} combined into one PDF.`);
      return { items: [{ name, kind: "pdf", blob: new Blob([bytes as BlobPart], { type: "application/pdf" }) }], notes };
    }
    case "pdf-compress": {
      const pdf = await import("./pdf");
      return {
        items: await each(async (it) => {
          const r = await pdf.compressPdf(new Uint8Array(await it.blob!.arrayBuffer()), p.mode, undefined, onProgress);
          return { item: { ...it, blob: new Blob([r.bytes as BlobPart], { type: "application/pdf" }) }, notes: r.notes };
        }),
        notes,
      };
    }
    case "pdf-ensure-size": {
      const pdf = await import("./pdf");
      return {
        items: await each(async (it) => {
          const r = await pdf.ensurePdfUnder(new Uint8Array(await it.blob!.arrayBuffer()), (+p.maxKB || 2048) * 1024, onProgress);
          return { item: { ...it, blob: new Blob([r.bytes as BlobPart], { type: "application/pdf" }) }, notes: r.notes };
        }),
        notes,
      };
    }
    case "pdf-merge": {
      const pdf = await import("./pdf");
      if (items.length < 2) return { items, notes: ["Only one PDF — nothing to merge."] };
      const bytes = await pdf.mergePdfs(await Promise.all(items.map(async (i) => new Uint8Array(await i.blob!.arrayBuffer()))), onProgress);
      notes.push(`${items.length} PDFs merged in order.`);
      return { items: [{ name: "merged.pdf", kind: "pdf", blob: new Blob([bytes as BlobPart], { type: "application/pdf" }) }], notes };
    }
    case "pdf-pages": {
      const pdf = await import("./pdf");
      return {
        items: await each(async (it) => {
          const bytes = new Uint8Array(await it.blob!.arrayBuffer());
          const total = await pdf.pageCount(bytes);
          const pages = pdf.parseRanges(String(p.ranges || "1"), total).flat();
          const out = await pdf.extractPages(bytes, pages);
          return { item: { ...it, blob: new Blob([out as BlobPart], { type: "application/pdf" }) }, notes: [`Kept ${pages.length} of ${total} pages.`] };
        }),
        notes,
      };
    }
    case "pdf-to-images": {
      const pdf = await import("./pdf");
      const out: Item[] = [];
      for (const it of items) {
        const pages = await pdf.pdfToImages(new Uint8Array(await it.blob!.arrayBuffer()), +p.dpi || 150, 0.9, "jpeg", undefined, onProgress);
        pages.forEach((pg) => out.push({ name: `${baseName(it.name)}-page-${pg.page}.jpg`, kind: "image", blob: pg.blob, width: pg.width, height: pg.height }));
      }
      notes.push(`${out.length} page image${out.length > 1 ? "s" : ""} created.`);
      return { items: out, notes };
    }
    case "pdf-text": {
      const pdf = await import("./pdf");
      return {
        items: await each(async (it) => {
          const pages = await pdf.pdfText(new Uint8Array(await it.blob!.arrayBuffer()), onProgress);
          const text = pages.join("\n\n");
          const n = text.trim() ? [] : ["No selectable text found — this PDF may be a scan."];
          return { item: { name: renameExt(it.name, "txt"), kind: "text", text }, notes: n };
        }),
        notes,
      };
    }
  }

  // Text / JSON / CSV steps
  const data = await import("../lib/data");
  switch (ws.step) {
    case "json-validate":
      return {
        items: await each(async (it) => {
          const r = data.parseJson(it.text || "");
          if (r.ok) return { item: { ...it, kind: "json" }, notes: ["JSON is valid."] };
          // Common, safe repair: trailing commas before } or ].
          const fixed = data.stripTrailingCommas(it.text || "");
          if (fixed !== it.text && data.parseJson(fixed).ok) return { item: { ...it, kind: "json", text: fixed }, notes: ["Fixed trailing commas — JSON is now valid."] };
          throw new Error(`Invalid JSON at line ${r.line}, column ${r.column}: ${r.message}. ${r.hint}`);
        }),
        notes,
      };
    case "json-format":
      return { items: await each(async (it) => ({ ...it, kind: "json", text: data.stringifyJson(JSON.parse(it.text || "null"), p.indent) })), notes };
    case "json-minify":
      return { items: await each(async (it) => ({ ...it, kind: "json", text: JSON.stringify(JSON.parse(it.text || "null")) })), notes };
    case "json-sort":
      return { items: await each(async (it) => ({ ...it, kind: "json", text: JSON.stringify(data.sortKeys(JSON.parse(it.text || "null")), null, 2) })), notes };
    case "json-clean":
      return {
        items: await each(async (it) => {
          const before = it.text || "";
          const v = data.cleanJson(JSON.parse(data.stripTrailingCommas(before)), !!p.removeNull, !!p.removeEmpty);
          const text = JSON.stringify(v, null, 2);
          return { item: { ...it, kind: "json", text }, notes: ["Removed empty and null values."] };
        }),
        notes,
      };
    case "json-to-csv":
      return {
        items: await each(async (it) => {
          const r = data.jsonToCsv(JSON.parse(it.text || "[]"));
          return { item: { name: renameExt(it.name, "csv"), kind: "csv", text: r.csv }, notes: [`${r.rows} rows × ${r.columns.length} columns.`] };
        }),
        notes,
      };
    case "csv-to-json":
      return {
        items: await each(async (it) => {
          const rows = data.csvToObjects(it.text || "", { numbers: true });
          return { item: { name: renameExt(it.name, "json"), kind: "json", text: JSON.stringify(rows, null, 2) }, notes: [`${rows.length} rows converted.`] };
        }),
        notes,
      };
    case "text-clean":
      return { items: await each(async (it) => ({ ...it, text: data.cleanText(it.text || "", p) })), notes };
    case "text-case":
      return { items: await each(async (it) => ({ ...it, text: data.changeCase(it.text || "", p.mode) })), notes };
    case "text-limit":
      return {
        items: await each(async (it) => {
          const t = it.text || "";
          const len = [...t].length, max = +p.maxChars || 2200;
          if (len <= max) return { item: it, notes: [`${len.toLocaleString()} of ${max.toLocaleString()} characters — within the limit.`] };
          if (p.truncate) return { item: { ...it, text: [...t].slice(0, max).join("") }, notes: [`Trimmed from ${len.toLocaleString()} to ${max.toLocaleString()} characters.`] };
          return { item: it, notes: [`${len.toLocaleString()} characters — ${(len - max).toLocaleString()} over the ${max.toLocaleString()} limit.`] };
        }),
        notes,
      };
    case "base64-encode":
      return { items: await each(async (it) => ({ name: renameExt(it.name, "b64.txt"), kind: "text", text: data.toBase64(it.text || "") })), notes };
  }
  throw new Error(`Step “${def.name}” is not available.`);
}

export async function runWorkflow(
  steps: WorkflowStep[],
  input: Item[],
  cb: { onStep?: (index: number, log?: StepLog) => void; onProgress?: (index: number, p: number) => void } = {},
) {
  let items = input;
  const logs: StepLog[] = [];
  for (let i = 0; i < steps.length; i++) {
    cb.onStep?.(i);
    const t0 = performance.now();
    const def = stepById(steps[i].step)!;
    try {
      const r = await runStep(steps[i], items, (p) => cb.onProgress?.(i, p));
      items = r.items;
      const log: StepLog = { step: steps[i].step, name: def.name, notes: r.notes, ms: performance.now() - t0, sizeAfter: items.reduce((a, it) => a + itemSize(it), 0), ok: true };
      logs.push(log);
      cb.onStep?.(i, log);
    } catch (e: any) {
      const log: StepLog = { step: steps[i].step, name: def?.name || steps[i].step, notes: [], ms: performance.now() - t0, sizeAfter: 0, ok: false, error: e?.message || String(e) };
      logs.push(log);
      cb.onStep?.(i, log);
      throw Object.assign(new Error(log.error), { logs, stepIndex: i });
    }
  }
  return { items, logs };
}
