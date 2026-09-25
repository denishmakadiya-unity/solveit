// SolveIt static build: bundles the client, pre-renders every route to HTML (SEO),
// and writes security headers, sitemap and icons for Cloudflare Pages.
import * as esbuild from "esbuild";
import { mkdir, rm, writeFile, readFile, cp, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const BUILD = path.join(ROOT, ".build");
const SITE_URL = (process.env.SITE_URL || "https://getsolveit.com").replace(/\/$/, "");
const t0 = Date.now();

const hash = (s) => createHash("sha256").update(s).digest("hex").slice(0, 10);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

await rm(DIST, { recursive: true, force: true });
await mkdir(path.join(DIST, "assets"), { recursive: true });
await mkdir(BUILD, { recursive: true });

const PDFJS_VERSION = JSON.parse(await readFile(path.join(ROOT, "node_modules/pdfjs-dist/package.json"), "utf8")).version;
const PDFJS_BASE = `/assets/pdfjs-${PDFJS_VERSION}/`;

// 1) Client bundle (code-split per page and per tool group)
const client = await esbuild.build({
  entryPoints: { app: path.join(ROOT, "src/client.tsx") },
  bundle: true, splitting: true, format: "esm", target: ["es2022", "chrome110", "safari16"],
  outdir: path.join(DIST, "assets"), entryNames: "[name]-[hash]", chunkNames: "c-[hash]",
  minify: true, sourcemap: false, metafile: true, jsx: "automatic", legalComments: "none",
  define: { "process.env.NODE_ENV": '"production"', __PDFJS_BASE__: JSON.stringify(PDFJS_BASE) }, logLevel: "warning",
});
const appFile = Object.keys(client.metafile.outputs).find((f) => /assets\/app-[^/]+\.js$/.test(f));
const appJs = "/assets/" + path.basename(appFile);

// 2) CSS
const css = await esbuild.build({ entryPoints: [path.join(ROOT, "src/styles.css")], bundle: true, minify: true, write: false, logLevel: "warning" });
const cssText = css.outputFiles[0].text;
const cssName = `styles-${hash(cssText)}.css`;
await writeFile(path.join(DIST, "assets", cssName), cssText);

// 3) Theme bootstrap (runs before paint to avoid a flash of the wrong theme)
const themeJs = `(function(){try{var t=localStorage.getItem("solveit:theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}})();`;
const themeName = `theme-${hash(themeJs)}.js`;
await writeFile(path.join(DIST, "assets", themeName), themeJs);

// 4) pdf.js worker + resources
const PDFJS = path.join(ROOT, "node_modules/pdfjs-dist");
const PDFJS_OUT = path.join(DIST, PDFJS_BASE);
await mkdir(PDFJS_OUT, { recursive: true });
await cp(path.join(PDFJS, "legacy/build/pdf.worker.min.mjs"), path.join(PDFJS_OUT, "pdf.worker.min.mjs"));
for (const d of ["cmaps", "standard_fonts", "wasm"]) if (existsSync(path.join(PDFJS, d))) await cp(path.join(PDFJS, d), path.join(PDFJS_OUT, d), { recursive: true });

// 5) Pre-render routes
await esbuild.build({
  entryPoints: [path.join(ROOT, "src/ssr.tsx")], bundle: true, platform: "node", format: "esm", packages: "external",
  outfile: path.join(BUILD, "ssr.mjs"), jsx: "automatic", define: { "process.env.NODE_ENV": '"production"' }, logLevel: "warning",
});
const ssr = await import(pathToFileURL(path.join(BUILD, "ssr.mjs")).href + "?t=" + Date.now());
ssr.setSiteUrl(SITE_URL);
const routes = ssr.getRoutes();

const FONTS = "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Figtree:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap";

function page(route, body) {
  const url = SITE_URL + (route.path === "/" ? "/" : route.path);
  const ld = (route.jsonLd || []).map((j) => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, "\\u003c")}</script>`).join("");
  const data = JSON.stringify({ path: route.path, page: route.page, params: route.params || {} }).replace(/</g, "\\u003c");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(route.title)}</title>
<meta name="description" content="${esc(route.description)}">
${route.noindex ? '<meta name="robots" content="noindex, follow">' : '<meta name="robots" content="index, follow, max-image-preview:large">'}
${route.page === "notfound" ? "" : `<link rel="canonical" href="${esc(url)}">`}
<meta property="og:type" content="website">
<meta property="og:site_name" content="SolveIt">
<meta property="og:title" content="${esc(route.title)}">
<meta property="og:description" content="${esc(route.description)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${SITE_URL}/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#2e5bff">
<meta name="color-scheme" content="light dark">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
<script src="/assets/${themeName}"></script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS}">
<link rel="stylesheet" href="/assets/${cssName}">
<link rel="modulepreload" href="${appJs}">
${ld}
</head>
<body>
<div id="root">${body}</div>
<script id="__route" type="application/json">${data}</script>
<script type="module" src="${appJs}"></script>
</body>
</html>`;
}

let count = 0;
for (const route of routes) {
  const body = await ssr.renderRoute(route);
  const rel = route.path === "/" ? "index.html" : route.path === "/404" ? "404.html" : route.path.slice(1) + ".html";
  const file = path.join(DIST, rel);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, page(route, body));
  count++;
}

// 6) Sitemap & robots
const today = new Date().toISOString().slice(0, 10);
const sm = routes.filter((r) => !r.noindex).map((r) => `  <url><loc>${SITE_URL}${r.path === "/" ? "/" : r.path}</loc><lastmod>${today}</lastmod><priority>${(r.priority ?? 0.5).toFixed(1)}</priority></url>`).join("\n");
await writeFile(path.join(DIST, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sm}\n</urlset>\n`);
await writeFile(path.join(DIST, "robots.txt"), `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nDisallow: /search\nDisallow: /workspace\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);

// 7) Static public files (headers, icons, manifest, ads.txt)
const PUB = path.join(ROOT, "public");
for (const f of await readdir(PUB)) await cp(path.join(PUB, f), path.join(DIST, f), { recursive: true });

// Icons rendered from the SVG logo
try {
  const sharp = (await import("sharp")).default;
  const svg = await readFile(path.join(PUB, "favicon.svg"));
  for (const [name, size] of [["favicon-32.png", 32], ["apple-touch-icon.png", 180], ["icon-192.png", 192], ["icon-512.png", 512]])
    await sharp(svg, { density: 512 }).resize(size, size).png().toFile(path.join(DIST, name));
  const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <defs><radialGradient id="a" cx="0.2" cy="0.2" r="0.8"><stop offset="0" stop-color="#e3eaff"/><stop offset="1" stop-color="#f6f7fb"/></radialGradient>
    <linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4d74ff"/><stop offset="1" stop-color="#2240d8"/></linearGradient></defs>
    <rect width="1200" height="630" fill="url(#a)"/><circle cx="1060" cy="120" r="170" fill="#ffb020" opacity="0.14"/>
    <g transform="translate(96,110)"><rect width="120" height="120" rx="32" fill="url(#b)"/><path d="M36 62l16 16 33-35" fill="none" stroke="#fff" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/><circle cx="90" cy="30" r="10" fill="#ffb020"/></g>
    <text x="96" y="345" font-family="Arial, Helvetica, sans-serif" font-size="84" font-weight="800" fill="#0e1525" letter-spacing="-3">What do you want</text>
    <text x="96" y="440" font-family="Arial, Helvetica, sans-serif" font-size="84" font-weight="800" fill="#0e1525" letter-spacing="-3">to get done?</text>
    <text x="96" y="530" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="600" fill="#2e5bff">SolveIt · Your Problem. Our Tools.</text></svg>`;
  await sharp(Buffer.from(og)).png().toFile(path.join(DIST, "og-image.png"));
} catch (e) {
  console.warn("Icon generation skipped:", e.message);
}

const jsFiles = Object.entries(client.metafile.outputs).filter(([f]) => f.endsWith(".js"));
const appBytes = client.metafile.outputs[appFile].bytes;
console.log(`Built ${count} pages, ${jsFiles.length} JS chunks (entry ${(appBytes / 1024).toFixed(0)} KB) for ${SITE_URL} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
