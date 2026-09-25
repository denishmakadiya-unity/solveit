// Text, JSON and CSV helpers shared by tools and workflow steps.

// ── JSON ──
export type JsonCheck = { ok: true; value: any } | { ok: false; message: string; line: number; column: number; hint: string };

export function parseJson(text: string): JsonCheck {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (e: any) {
    const msg = String(e?.message || e);
    let pos = -1;
    const m1 = msg.match(/position (\d+)/i);
    const m2 = msg.match(/line (\d+) column (\d+)/i);
    let line = 1, column = 1;
    if (m2) { line = +m2[1]; column = +m2[2]; }
    else if (m1) {
      pos = +m1[1];
      const before = text.slice(0, pos);
      line = before.split("\n").length;
      column = pos - before.lastIndexOf("\n");
    } else if (/unexpected end/i.test(msg)) {
      const lines = text.split("\n");
      line = lines.length; column = lines[lines.length - 1].length + 1;
    }
    const lineText = text.split("\n")[line - 1] || "";
    let hint = "Check the characters just before this position.";
    if (/'/.test(lineText)) hint = "JSON strings and keys need double quotes (\"), not single quotes.";
    else if (/,\s*[}\]]/.test(text.slice(Math.max(0, pos - 20), pos + 5)) || /,\s*$/.test(lineText.trim()) && /^\s*[}\]]/.test(text.split("\n")[line] || "")) hint = "Remove the trailing comma before a closing } or ].";
    else if (/\/\/|\/\*/.test(lineText)) hint = "JSON does not allow comments. Remove // or /* */ comments.";
    else if (/^\s*[A-Za-z_$][\w$]*\s*:/.test(lineText)) hint = "Object keys must be wrapped in double quotes.";
    else if (/unexpected end/i.test(msg)) hint = "The JSON ends too early — a closing } or ] or quote may be missing.";
    return { ok: false, message: msg.replace(/^JSON\.parse: /, ""), line, column, hint };
  }
}

export function stringifyJson(v: any, indent: string | number) {
  const i = indent === "tab" ? "\t" : typeof indent === "string" ? parseInt(indent, 10) : indent;
  return JSON.stringify(v, null, i as any);
}

export function sortKeys(v: any): any {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === "object") return Object.fromEntries(Object.keys(v).sort((a, b) => a.localeCompare(b)).map((k) => [k, sortKeys(v[k])]));
  return v;
}

export function cleanJson(v: any, removeNull = true, removeEmpty = true): any {
  const empty = (x: any) => x === "" || (Array.isArray(x) && x.length === 0) || (x && typeof x === "object" && !Array.isArray(x) && Object.keys(x).length === 0);
  if (Array.isArray(v)) return v.map((x) => cleanJson(x, removeNull, removeEmpty)).filter((x) => !(removeNull && x === null) && !(removeEmpty && empty(x)));
  if (v && typeof v === "object") {
    const out: any = {};
    for (const [k, x0] of Object.entries(v)) {
      const x = cleanJson(x0, removeNull, removeEmpty);
      if (removeNull && x === null) continue;
      if (removeEmpty && empty(x)) continue;
      out[k] = x;
    }
    return out;
  }
  return v;
}

export function stripTrailingCommas(text: string) {
  return text.replace(/,(\s*[}\]])/g, "$1");
}

// ── CSV ──
export function detectDelimiter(text: string) {
  const sample = text.split(/\r?\n/).slice(0, 5).join("\n");
  const cands = [",", ";", "\t", "|"];
  let best = ",", bestN = -1;
  for (const c of cands) {
    const n = sample.split(c).length;
    if (n > bestN) { best = c; bestN = n; }
  }
  return best;
}

export function parseCsv(text: string, delimiter = ","): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else q = false;
      } else field += c;
    } else if (c === '"' && field === "") q = true;
    else if (c === delimiter) { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => !(r.length === 1 && r[0] === ""));
}

export function csvToObjects(text: string, opts: { delimiter?: string; header?: boolean; numbers?: boolean } = {}) {
  const delim = opts.delimiter || detectDelimiter(text);
  const rows = parseCsv(text.replace(/^﻿/, ""), delim);
  if (!rows.length) return [];
  const header = opts.header !== false;
  const keys = header ? rows[0].map((k, i) => k.trim() || `column${i + 1}`) : rows[0].map((_, i) => `column${i + 1}`);
  const body = header ? rows.slice(1) : rows;
  const conv = (v: string) => {
    if (!opts.numbers) return v;
    const t = v.trim();
    if (/^-?(0|[1-9]\d*)(\.\d+)?$/.test(t) && t.length < 16) return Number(t);
    if (t === "true") return true;
    if (t === "false") return false;
    return v;
  };
  return body.map((r) => Object.fromEntries(keys.map((k, i) => [k, conv(r[i] ?? "")])));
}

function flatten(obj: any, prefix = "", out: Record<string, any> = {}) {
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    for (const [k, v] of Object.entries(obj)) flatten(v, prefix ? `${prefix}.${k}` : k, out);
  } else out[prefix || "value"] = Array.isArray(obj) ? JSON.stringify(obj) : obj;
  return out;
}

export function jsonToCsv(value: any, delimiter = ",") {
  const arr = Array.isArray(value) ? value : [value];
  const rows = arr.map((x) => flatten(x));
  const cols: string[] = [];
  rows.forEach((r) => Object.keys(r).forEach((k) => { if (!cols.includes(k)) cols.push(k); }));
  const esc = (v: any) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return /[",\n\r;\t]/.test(s) || s.startsWith(" ") ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return { csv: [cols.map(esc).join(delimiter), ...rows.map((r) => cols.map((c) => esc(r[c])).join(delimiter))].join("\r\n"), columns: cols, rows: rows.length };
}

// ── Text ──
export type CleanOpts = { trim?: boolean; collapse?: boolean; emptyLines?: boolean; joinLines?: boolean; dedupe?: boolean; html?: boolean; quotes?: boolean; emojis?: boolean; lineBreaks?: boolean };

export function cleanText(text: string, o: CleanOpts) {
  let t = text.replace(/\r\n?/g, "\n");
  if (o.html) t = t.replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|li|h\d)>/gi, "\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  if (o.quotes) t = t.replace(/[“”„]/g, '"').replace(/[‘’‚]/g, "'").replace(/[–—]/g, "-").replace(/…/g, "...");
  if (o.emojis) t = t.replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, "");
  t = t.replace(/ /g, " ");
  let lines = t.split("\n");
  if (o.trim) lines = lines.map((l) => l.trim());
  if (o.collapse) lines = lines.map((l) => l.replace(/[ \t]{2,}/g, " "));
  if (o.joinLines) {
    const paras: string[] = [];
    let cur = "";
    for (const l of lines) {
      if (!l.trim()) { if (cur) paras.push(cur); cur = ""; paras.push(""); continue; }
      if (!cur) cur = l.trim();
      else if (/[-]$/.test(cur) && /^[a-z]/.test(l.trim())) cur = cur.slice(0, -1) + l.trim();
      else cur += " " + l.trim();
    }
    if (cur) paras.push(cur);
    lines = paras.filter((p, i) => !(p === "" && paras[i - 1] === ""));
  }
  if (o.emptyLines) lines = lines.filter((l) => l.trim() !== "");
  if (o.dedupe) { const seen = new Set<string>(); lines = lines.filter((l) => (l.trim() === "" ? true : seen.has(l) ? false : (seen.add(l), true))); }
  t = lines.join(o.lineBreaks ? " " : "\n");
  if (o.lineBreaks) t = t.replace(/ {2,}/g, " ");
  return o.trim ? t.trim() : t;
}

const SMALL = new Set(["a", "an", "the", "and", "but", "or", "nor", "for", "so", "yet", "as", "at", "by", "in", "of", "off", "on", "per", "to", "up", "via", "vs", "with", "from", "into"]);

export type CaseMode = "upper" | "lower" | "title" | "sentence" | "camel" | "pascal" | "snake" | "kebab" | "constant" | "alternating" | "inverse";

export function changeCase(text: string, mode: CaseMode | string) {
  const words = () => text.replace(/([a-z])([A-Z])/g, "$1 $2").split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  switch (mode) {
    case "upper": return text.toUpperCase();
    case "lower": return text.toLowerCase();
    case "title":
      return text.split("\n").map((line) => line.toLowerCase().replace(/[\p{L}\p{N}][\p{L}\p{N}'’]*/gu, (w, i: number) => (i > 0 && SMALL.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))).join("\n");
    case "sentence": return text.toLowerCase().replace(/(^\s*\p{L}|[.!?]\s+\p{L}|\n\s*\p{L})/gu, (m) => m.toUpperCase()).replace(/\bi\b/g, "I");
    case "camel": return words().map((w, i) => (i ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w.toLowerCase())).join("");
    case "pascal": return words().map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase()).join("");
    case "snake": return words().map((w) => w.toLowerCase()).join("_");
    case "constant": return words().map((w) => w.toUpperCase()).join("_");
    case "kebab": return words().map((w) => w.toLowerCase()).join("-");
    case "alternating": { let k = 0; return [...text].map((c) => (/\p{L}/u.test(c) ? (k++ % 2 ? c.toUpperCase() : c.toLowerCase()) : c)).join(""); }
    case "inverse": return [...text].map((c) => (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase())).join("");
    default: return text;
  }
}

export function textStats(text: string) {
  const words = text.match(/[\p{L}\p{M}\p{N}]+(?:['’.-][\p{L}\p{M}\p{N}]+)*/gu) || [];
  const sentences = text.split(/[.!?।॥]+(?:\s|$)/).filter((s) => s.trim().length > 0);
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim());
  const chars = [...text].length;
  const noSpaces = [...text.replace(/\s/g, "")].length;
  const freq = new Map<string, number>();
  for (const w of words) {
    const k = w.toLowerCase();
    if (k.length < 3 || SMALL.has(k) || STOP.has(k)) continue;
    freq.set(k, (freq.get(k) || 0) + 1);
  }
  const top = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  return {
    words: words.length, chars, noSpaces, sentences: sentences.length, paragraphs: paragraphs.length,
    lines: text ? text.split("\n").length : 0,
    readMin: words.length / 230, speakMin: words.length / 140, top,
  };
}

const STOP = new Set(["this", "that", "with", "have", "will", "your", "you", "are", "was", "were", "been", "has", "had", "not", "its", "they", "them", "their", "there", "which", "what", "when", "where", "who", "how", "all", "can", "our", "out", "also", "than", "then", "these", "those", "into", "about", "more", "some", "such", "only", "other", "just", "very", "his", "her", "she", "him", "one", "any"]);

// UTF-8 safe Base64
export function toBase64(text: string, urlSafe = false) {
  const bytes = new TextEncoder().encode(text);
  return bytesToBase64(bytes, urlSafe);
}
export function bytesToBase64(bytes: Uint8Array, urlSafe = false) {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  const b = btoa(bin);
  return urlSafe ? b.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") : b;
}
export function fromBase64(b64: string) {
  let s = b64.trim().replace(/^data:[^,]*,/, "").replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

// Line diff (LCS) for Text Compare
export type DiffLine = { type: "same" | "add" | "del"; text: string; a?: number; b?: number };
export function diffLines(a: string, b: string, opts: { ignoreCase?: boolean; ignoreSpace?: boolean } = {}): DiffLine[] {
  const A = a.replace(/\r\n?/g, "\n").split("\n"), B = b.replace(/\r\n?/g, "\n").split("\n");
  const norm = (s: string) => { let t = s; if (opts.ignoreSpace) t = t.replace(/\s+/g, " ").trim(); if (opts.ignoreCase) t = t.toLowerCase(); return t; };
  const n = A.length, m = B.length;
  if (n * m > 25_000_000) throw new Error("These texts are too long to compare line by line in the browser. Compare smaller sections.");
  const dp: Uint32Array[] = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = norm(A[i]) === norm(B[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out: DiffLine[] = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (norm(A[i]) === norm(B[j])) { out.push({ type: "same", text: B[j], a: i + 1, b: j + 1 }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push({ type: "del", text: A[i], a: i + 1 }); i++; }
    else { out.push({ type: "add", text: B[j], b: j + 1 }); j++; }
  }
  while (i < n) { out.push({ type: "del", text: A[i], a: i + 1 }); i++; }
  while (j < m) { out.push({ type: "add", text: B[j], b: j + 1 }); j++; }
  return out;
}
