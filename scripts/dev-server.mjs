// Local preview that mimics Cloudflare Pages: pretty URLs, _headers, 404.html and /api Functions
// backed by a local SQLite file standing in for D1. Usage: node scripts/dev-server.mjs [port]
import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as esbuild from "esbuild";
import { DatabaseSync } from "node:sqlite";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const PORT = Number(process.argv[2] || process.env.PORT || 8788);
const ENV = { ADMIN_TOKEN: process.env.ADMIN_TOKEN || "local-admin-token-change-me-please", ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY, SUPPORT_EMAIL: "support@example.com" };

// ── D1 shim ──
const sqlite = new DatabaseSync(path.join(ROOT, ".build/local-d1.sqlite"));
sqlite.exec(readFileSync(path.join(ROOT, "schema.sql"), "utf8"));
const norm = (r) => (r ? { ...r } : r);
function stmt(sql, args = []) {
  return {
    bind: (...a) => stmt(sql, a),
    first: async () => norm(sqlite.prepare(sql).get(...args)) ?? null,
    all: async () => ({ results: sqlite.prepare(sql).all(...args).map(norm) }),
    run: async () => sqlite.prepare(sql).run(...args),
    _all: () => ({ results: sqlite.prepare(sql).all(...args).map(norm) }),
  };
}
const DB = { prepare: (sql) => stmt(sql), batch: async (list) => list.map((s) => s._all()) };

// ── Functions router (file-based, like Pages) ──
const fnFiles = {
  "/api/_middleware": "functions/api/_middleware.ts",
  "/api/track": "functions/api/track.ts",
  "/api/contact": "functions/api/contact.ts",
  "/api/config": "functions/api/config.ts",
  "/api/ai": "functions/api/ai.ts",
  "/api/admin/_middleware": "functions/api/admin/_middleware.ts",
  "/api/admin/stats": "functions/api/admin/stats.ts",
  "/api/admin/settings": "functions/api/admin/settings.ts",
  "/api/admin/messages": "functions/api/admin/messages.ts",
};
const mods = {};
for (const [route, file] of Object.entries(fnFiles)) {
  const out = path.join(ROOT, ".build/fn", file.replace(/\.ts$/, ".mjs"));
  await esbuild.build({ entryPoints: [path.join(ROOT, file)], bundle: true, platform: "neutral", format: "esm", outfile: out, logLevel: "warning" });
  mods[route] = await import(pathToFileURL(out).href);
}
const handlerFor = (mod, method) => mod[`onRequest${method[0] + method.slice(1).toLowerCase()}`] || mod.onRequest;

async function runFunctions(req, url, body) {
  const request = new Request(url, { method: req.method, headers: req.headers, body: ["GET", "HEAD"].includes(req.method) ? undefined : body });
  const env = { ...ENV, DB };
  const endpoint = mods[url.pathname];
  const chain = [mods["/api/_middleware"]];
  if (url.pathname.startsWith("/api/admin/")) chain.push(mods["/api/admin/_middleware"]);
  let i = 0;
  const next = async () => {
    if (i < chain.length) { const m = chain[i++]; return handlerFor(m, req.method)({ request, env, next, waitUntil: () => {} }); }
    const h = endpoint && handlerFor(endpoint, req.method);
    if (!h) return new Response(JSON.stringify({ error: "Not found" }), { status: endpoint ? 405 : 404, headers: { "content-type": "application/json" } });
    return h({ request, env, next, waitUntil: () => {} });
  };
  return next();
}

// ── _headers ──
function parseHeaders() {
  const rules = [];
  let cur = null;
  for (const line of readFileSync(path.join(DIST, "_headers"), "utf8").split("\n")) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    if (!/^\s/.test(line)) { cur = { pattern: line.trim(), headers: {} }; rules.push(cur); }
    else if (cur) { const i = line.indexOf(":"); cur.headers[line.slice(0, i).trim()] = line.slice(i + 1).trim(); }
  }
  return rules;
}
const RULES = parseHeaders();
const matchRule = (p, pattern) => new RegExp("^" + pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$").test(p);

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".json": "application/json", ".xml": "application/xml", ".txt": "text/plain", ".webmanifest": "application/manifest+json", ".wasm": "application/wasm", ".bcmap": "application/octet-stream", ".pfb": "application/octet-stream", ".ttf": "font/ttf" };

async function resolveFile(p) {
  const clean = decodeURIComponent(p).replace(/\/+$/, "") || "/";
  if (clean.includes("..")) return null;
  const tries = clean === "/" ? ["index.html"] : [clean.slice(1), clean.slice(1) + ".html", clean.slice(1) + "/index.html"];
  for (const t of tries) {
    const f = path.join(DIST, t);
    try { if ((await stat(f)).isFile()) return f; } catch { /* next */ }
  }
  return null;
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  try {
    if (url.pathname.startsWith("/api/")) {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const r = await runFunctions(req, url, Buffer.concat(chunks));
      res.writeHead(r.status, Object.fromEntries(r.headers));
      res.end(Buffer.from(await r.arrayBuffer()));
      return;
    }
    let file = await resolveFile(url.pathname);
    let status = 200;
    if (!file) { file = path.join(DIST, "404.html"); status = 404; }
    const headers = { "content-type": TYPES[path.extname(file)] || "application/octet-stream" };
    for (const r of RULES) if (matchRule(url.pathname, r.pattern)) Object.assign(headers, r.headers);
    if (headers["Content-Security-Policy"]) headers["Content-Security-Policy"] = headers["Content-Security-Policy"].replace(/;\s*upgrade-insecure-requests/, "");
    delete headers["Strict-Transport-Security"];
    res.writeHead(status, headers);
    res.end(await readFile(file));
  } catch (e) {
    res.writeHead(500, { "content-type": "text/plain" });
    res.end("Server error: " + e.message);
  }
}).listen(PORT, () => console.log(`SolveIt preview on http://localhost:${PORT} (admin token: ${ENV.ADMIN_TOKEN})`));
