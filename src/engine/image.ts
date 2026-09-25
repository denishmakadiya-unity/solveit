// Browser-side image processing on <canvas>. Nothing leaves the device.

export type Fit = "inside" | "cover" | "contain" | "stretch";
export type OutFormat = "jpeg" | "png" | "webp";

export async function loadImage(blob: Blob): Promise<HTMLCanvasElement> {
  let source: CanvasImageSource & { width: number; height: number };
  try {
    source = await createImageBitmap(blob, { imageOrientation: "from-image" } as any);
  } catch {
    source = await new Promise<HTMLImageElement>((res, rej) => {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); res(img); };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("This file couldn't be opened as an image. Try JPG, PNG or WebP.")); };
      img.src = url;
    });
  }
  const w = (source as any).naturalWidth || source.width, h = (source as any).naturalHeight || source.height;
  if (!w || !h) throw new Error("This image appears to be empty or damaged.");
  if (w * h > 100_000_000) throw new Error("This image is too large to process in the browser (over 100 megapixels).");
  const c = makeCanvas(w, h);
  c.getContext("2d")!.drawImage(source, 0, 0);
  (source as any).close?.();
  return c;
}

export function makeCanvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

function stepDown(src: HTMLCanvasElement, tw: number, th: number) {
  // Halve repeatedly for large reductions — much sharper than one big scale.
  let cur = src;
  while (cur.width / 2 >= tw && cur.height / 2 >= th) {
    const n = makeCanvas(cur.width / 2, cur.height / 2);
    const g = n.getContext("2d")!;
    g.imageSmoothingQuality = "high";
    g.drawImage(cur, 0, 0, n.width, n.height);
    cur = n;
  }
  return cur;
}

export function resize(src: HTMLCanvasElement, width: number, height: number, fit: Fit = "inside", background = "#ffffff") {
  const sw = src.width, sh = src.height;
  width = Math.max(1, Math.round(width || sw));
  height = Math.max(1, Math.round(height || sh));
  if (fit === "inside") {
    const s = Math.min(width / sw, height / sh, 1);
    const tw = Math.round(sw * s), th = Math.round(sh * s);
    if (s === 1) return src;
    const pre = stepDown(src, tw, th);
    const c = makeCanvas(tw, th);
    const g = c.getContext("2d")!;
    g.imageSmoothingQuality = "high";
    g.drawImage(pre, 0, 0, tw, th);
    return c;
  }
  const c = makeCanvas(width, height);
  const g = c.getContext("2d")!;
  g.imageSmoothingQuality = "high";
  if (fit === "stretch") {
    g.drawImage(stepDown(src, width, height), 0, 0, width, height);
    return c;
  }
  if (fit === "cover") {
    const s = Math.max(width / sw, height / sh);
    const cw = width / s, ch = height / s;
    const sx = (sw - cw) / 2, sy = (sh - ch) / 2;
    const pre = stepDown(src, Math.round(sw * s), Math.round(sh * s));
    const k = pre.width / sw;
    g.drawImage(pre, sx * k, sy * k, cw * k, ch * k, 0, 0, width, height);
    return c;
  }
  // contain
  const s = Math.min(width / sw, height / sh);
  const tw = sw * s, th = sh * s;
  if (background && background !== "transparent") { g.fillStyle = background; g.fillRect(0, 0, width, height); }
  g.drawImage(stepDown(src, Math.round(tw), Math.round(th)), (width - tw) / 2, (height - th) / 2, tw, th);
  return c;
}

export function parseRatio(r: string) {
  const [a, b] = r.split(":").map(Number);
  return a > 0 && b > 0 ? a / b : 1;
}

export function cropToRatio(src: HTMLCanvasElement, ratio: string) {
  const r = parseRatio(ratio);
  let w = src.width, h = src.height;
  if (w / h > r) w = Math.round(h * r); else h = Math.round(w / r);
  return crop(src, Math.round((src.width - w) / 2), Math.round((src.height - h) / 2), w, h);
}

export function crop(src: HTMLCanvasElement, x: number, y: number, w: number, h: number) {
  const c = makeCanvas(w, h);
  c.getContext("2d")!.drawImage(src, x, y, w, h, 0, 0, w, h);
  return c;
}

export function hasAlpha(c: HTMLCanvasElement) {
  const d = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
  for (let i = 3; i < d.length; i += 4 * 7) if (d[i] < 255) return true;
  return false;
}

export const MIME: Record<OutFormat, string> = { jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

export function formatFromMime(m: string): OutFormat {
  if (m.includes("png")) return "png";
  if (m.includes("webp")) return "webp";
  return "jpeg";
}

export async function encode(src: HTMLCanvasElement, format: OutFormat, quality = 0.9, background = "#ffffff"): Promise<Blob> {
  let c = src;
  if (format === "jpeg") {
    c = makeCanvas(src.width, src.height);
    const g = c.getContext("2d")!;
    g.fillStyle = background || "#ffffff";
    g.fillRect(0, 0, c.width, c.height);
    g.drawImage(src, 0, 0);
  }
  const blob = await new Promise<Blob | null>((res) => c.toBlob(res, MIME[format], quality));
  if (!blob) throw new Error("Your browser could not create this image format.");
  if (format === "webp" && blob.type !== "image/webp") throw new Error("Your browser can't save WebP. Choose JPG or PNG instead.");
  return blob;
}

/** Find the highest quality (and, if needed, a smaller size) that fits under maxBytes. */
export async function encodeUnder(src: HTMLCanvasElement, format: OutFormat, maxBytes: number, startQuality = 0.92, background = "#ffffff") {
  const fmt: OutFormat = format === "png" ? "jpeg" : format; // PNG can't be quality-compressed
  let canvas = src;
  let best: Blob | null = null;
  const notes: string[] = [];
  if (format === "png") notes.push("Converted to JPG to reach the target size.");
  for (let attempt = 0; attempt < 12; attempt++) {
    let lo = 0.3, hi = Math.min(0.95, startQuality), found: Blob | null = null;
    const first = await encode(canvas, fmt, hi, background);
    if (first.size <= maxBytes) found = first;
    else {
      for (let i = 0; i < 7; i++) {
        const mid = (lo + hi) / 2;
        const b = await encode(canvas, fmt, mid, background);
        if (b.size <= maxBytes) { found = b; lo = mid; } else hi = mid;
      }
    }
    if (found) { best = found; break; }
    if (canvas.width < 80 || canvas.height < 80) break;
    canvas = resize(canvas, canvas.width * 0.82, canvas.height * 0.82, "stretch");
    if (attempt === 0) notes.push("Reduced dimensions slightly to reach the target size.");
  }
  if (!best) {
    best = await encode(canvas, fmt, 0.3, background);
    notes.push(`Couldn't reach the target; this is the smallest possible version.`);
  }
  return { blob: best, width: canvas.width, height: canvas.height, notes };
}

// ── Background removal for plain / solid backgrounds ──
export function removeBackground(src: HTMLCanvasElement, tolerance = 40, feather = 12, fill = "transparent") {
  const w = src.width, h = src.height;
  const c = makeCanvas(w, h);
  const g = c.getContext("2d", { willReadFrequently: true })!;
  g.drawImage(src, 0, 0);
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  // Estimate background color as the median of border pixels.
  const rs: number[] = [], gs: number[] = [], bs: number[] = [];
  const sample = (x: number, y: number) => { const i = (y * w + x) * 4; rs.push(d[i]); gs.push(d[i + 1]); bs.push(d[i + 2]); };
  const stepX = Math.max(1, Math.floor(w / 200)), stepY = Math.max(1, Math.floor(h / 200));
  for (let x = 0; x < w; x += stepX) { sample(x, 0); sample(x, h - 1); }
  for (let y = 0; y < h; y += stepY) { sample(0, y); sample(w - 1, y); }
  const med = (a: number[]) => a.sort((p, q) => p - q)[a.length >> 1];
  const br = med(rs), bg = med(gs), bb = med(bs);
  const dist = (i: number) => Math.sqrt((d[i] - br) ** 2 + (d[i + 1] - bg) ** 2 + (d[i + 2] - bb) ** 2);
  const tol = tolerance * 1.2, soft = tol + feather * 2;
  const alpha = new Uint8Array(w * h).fill(255);
  const seen = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let qh = 0, qt = 0;
  const push = (p: number) => { if (!seen[p]) { seen[p] = 1; queue[qt++] = p; } };
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
  let removed = 0;
  while (qh < qt) {
    const p = queue[qh++];
    const dd = dist(p * 4);
    if (dd > soft) continue;
    if (dd <= tol) { alpha[p] = 0; removed++; }
    else { alpha[p] = Math.min(alpha[p], Math.round(((dd - tol) / (soft - tol)) * 255)); continue; }
    const x = p % w, y = (p - x) / w;
    if (x > 0) push(p - 1);
    if (x < w - 1) push(p + 1);
    if (y > 0) push(p - w);
    if (y < h - 1) push(p + w);
  }
  for (let p = 0; p < w * h; p++) {
    const a = alpha[p];
    if (a === 255) continue;
    const i = p * 4;
    if (fill === "transparent") d[i + 3] = Math.min(d[i + 3], a);
    else {
      const f = hexToRgb(fill);
      const k = a / 255;
      d[i] = d[i] * k + f[0] * (1 - k);
      d[i + 1] = d[i + 1] * k + f[1] * (1 - k);
      d[i + 2] = d[i + 2] * k + f[2] * (1 - k);
      d[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return { canvas: c, removedRatio: removed / (w * h), bgColor: `rgb(${br}, ${bg}, ${bb})` };
}

export function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace("#", "").match(/^([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return [255, 255, 255];
  let s = m[1];
  if (s.length === 3) s = s.split("").map((c) => c + c).join("");
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}

// ── Metadata inspection (JPEG / PNG / WebP) ──
export type MetaReport = { exif: boolean; gps: boolean; xmp: boolean; iptc: boolean; icc: boolean; comments: boolean; camera?: string; date?: string; bytes: number };

export async function inspectMetadata(blob: Blob): Promise<MetaReport> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  const r: MetaReport = { exif: false, gps: false, xmp: false, iptc: false, icc: false, comments: false, bytes: 0 };
  const ascii = (a: Uint8Array, s: number, n: number) => String.fromCharCode(...a.subarray(s, s + n));
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 4 < buf.length) {
      if (buf[i] !== 0xff) break;
      const marker = buf[i + 1];
      if (marker === 0xda || marker === 0xd9) break;
      const len = (buf[i + 2] << 8) | buf[i + 3];
      const seg = buf.subarray(i + 4, i + 2 + len);
      if (marker === 0xe1 && ascii(seg, 0, 4) === "Exif") { r.exif = true; r.bytes += len; parseTiff(seg.subarray(6), r); }
      else if (marker === 0xe1 && ascii(seg, 0, 28).startsWith("http://ns.adobe.com/xap")) { r.xmp = true; r.bytes += len; }
      else if (marker === 0xed) { r.iptc = true; r.bytes += len; }
      else if (marker === 0xe2 && ascii(seg, 0, 11) === "ICC_PROFILE") { r.icc = true; }
      else if (marker === 0xfe) { r.comments = true; r.bytes += len; }
      i += 2 + len;
    }
  } else if (buf[0] === 0x89 && ascii(buf, 1, 3) === "PNG") {
    let i = 8;
    while (i + 8 < buf.length) {
      const len = ((buf[i] << 24) | (buf[i + 1] << 16) | (buf[i + 2] << 8) | buf[i + 3]) >>> 0;
      const type = ascii(buf, i + 4, 4);
      if (type === "eXIf") { r.exif = true; r.bytes += len; parseTiff(buf.subarray(i + 8, i + 8 + len), r); }
      if (type === "tEXt" || type === "iTXt" || type === "zTXt") { r.comments = true; r.bytes += len; if (ascii(buf, i + 8, 17) === "XML:com.adobe.xmp") r.xmp = true; }
      if (type === "iCCP") r.icc = true;
      if (type === "IEND") break;
      i += 12 + len;
    }
  } else if (ascii(buf, 0, 4) === "RIFF" && ascii(buf, 8, 4) === "WEBP") {
    let i = 12;
    while (i + 8 < buf.length) {
      const type = ascii(buf, i, 4);
      const len = buf[i + 4] | (buf[i + 5] << 8) | (buf[i + 6] << 16) | (buf[i + 7] << 24);
      if (type === "EXIF") { r.exif = true; r.bytes += len; parseTiff(buf.subarray(i + 8 + (ascii(buf, i + 8, 4) === "Exif" ? 6 : 0), i + 8 + len), r); }
      if (type === "XMP ") { r.xmp = true; r.bytes += len; }
      if (type === "ICCP") r.icc = true;
      i += 8 + len + (len & 1);
    }
  }
  return r;
}

function parseTiff(t: Uint8Array, r: MetaReport) {
  try {
    const le = t[0] === 0x49;
    const dv = new DataView(t.buffer, t.byteOffset, t.byteLength);
    const u16 = (o: number) => dv.getUint16(o, le), u32 = (o: number) => dv.getUint32(o, le);
    const str = (o: number, n: number) => { let s = ""; for (let k = 0; k < n && t[o + k]; k++) s += String.fromCharCode(t[o + k]); return s.trim(); };
    const ifd = u32(4);
    const count = u16(ifd);
    let make = "", model = "";
    for (let k = 0; k < count; k++) {
      const e = ifd + 2 + k * 12;
      const tag = u16(e), n = u32(e + 4), off = n > 4 ? u32(e + 8) : e + 8;
      if (tag === 0x010f) make = str(off, n);
      if (tag === 0x0110) model = str(off, n);
      if (tag === 0x0132) r.date = str(off, n);
      if (tag === 0x8825) r.gps = true;
    }
    if (make || model) r.camera = model.startsWith(make) ? model : `${make} ${model}`.trim();
  } catch {
    /* malformed EXIF — presence already recorded */
  }
}
