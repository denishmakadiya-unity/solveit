# SolveIt — Your Problem. Our Tools.

A problem-first utility workspace: people describe what they want to get done, and SolveIt recommends a tool or a multi-step workflow and runs it.

- **38 tools** across PDF, image, text, calculators, developer, security, business and AI writing
- **59 workflows**, like Website Image, WhatsApp-Ready PDF and API-Ready JSON. Users upload once and every step runs on the same file.
- **Problem Solver and Smart Search** that understand English, Hindi, Hinglish and Gujarati without calling an AI service
- **Workflow Builder**: add, remove, reorder and configure steps, then preview, run and save
- **My Workspace**: recent results, saved workflows, favorites and searches, stored in the browser
- **Admin dashboard** with real usage analytics, missing-tool intelligence, tool on/off switches, feature flags, ads settings and contact messages
- **SEO**: 138 pre-rendered pages with unique titles, meta descriptions, canonical URLs, structured data, `sitemap.xml` and `robots.txt`
- **Privacy**: every file tool runs in the browser, so files are never uploaded

## Architecture

| Layer | Technology |
| --- | --- |
| UI | React 19 + TypeScript. Every page is pre-rendered to static HTML for SEO, then hydrated. |
| Build | esbuild with code splitting per page and tool group; one design system in `src/styles.css` |
| File processing | Canvas (images), pdf-lib (writing PDFs), pdf.js (reading and rendering PDFs). All run in the browser. |
| Hosting | **Cloudflare Pages**: HTTPS, global CDN, DDoS protection |
| Backend | Cloudflare Pages Functions (`/functions/api/*`) + **D1** (SQLite) for analytics, messages and settings |
| AI (optional) | `/api/ai` uses the Anthropic API when `ANTHROPIC_API_KEY` is set. Otherwise the tools run in on-device mode. |

### Security

- Strict security headers in `public/_headers`: CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy and COOP
- API: method allow-list, same-origin check on writes, JSON-only, body size limits, input validation
- Rate limiting in D1 for analytics, the contact form (5 per hour), AI (20 per hour) and admin login attempts
- Raw IP addresses are never stored; rate limiting uses a salted daily hash
- Admin API requires a long `ADMIN_TOKEN`, checked in constant time. Adding **Cloudflare Access** in front of `/admin` and `/api/admin/*` is recommended.
- Secrets live in Cloudflare environment variables and never in code
- Contact form spam protection: a honeypot field plus a minimum fill time
- Uploads are checked in the browser for type, size (images 40 MB, PDFs 100 MB) and count (50 files)
- Recent result files are kept in the browser for 6 hours for "upload once", then expire

## Deploy as a Cloudflare Worker (with static assets)

The project also runs as a Worker: `wrangler.jsonc` + `worker/index.ts` serve `dist/` and the `/api/*` handlers.
1. Create the D1 database `solveit`, run `schema.sql` in its Console and copy its **Database ID** into `wrangler.jsonc`.
2. Worker → Settings → Build: build command `npm run build`, deploy command `npx wrangler deploy`.
3. Worker → Settings → Variables and Secrets: add `ADMIN_TOKEN` as a **Secret**.
4. Worker → Settings → Domains & Routes: add `getsolveit.com`.

## Deploy to Cloudflare Pages (alternative)

### 1. Put the code on GitHub
Create a new **private** repository on github.com and upload the contents of this folder. Leave out `node_modules`, `dist` and `.build`.

### 2. Create the database
1. In the Cloudflare dashboard, go to **Storage & Databases → D1 → Create database**. Name it `solveit`.
2. Open the database, go to the **Console** tab, paste the contents of `schema.sql` and click **Execute**.

### 3. Create the Pages project
1. Go to **Workers & Pages → Create → Pages → Connect to Git** and pick your repository.
2. Use these build settings:
   - Framework preset: **None**
   - Build command: `npm run build`
   - Build output directory: `dist`
3. Under **Environment variables**, add:
   - `SITE_URL` = `https://your-domain.com` (used for canonical URLs and the sitemap)
   - `NODE_VERSION` = `20`
4. Click **Save and Deploy**.

### 4. Connect the database and secrets
In the Pages project, open **Settings**:
- **Bindings → Add → D1 database**: variable name `DB`, database `solveit`
- **Variables and Secrets → Add** (type *Secret*):
  - `ADMIN_TOKEN`: a random string of 32 or more characters. Keep it safe; it opens `/admin`.
  - `ANTHROPIC_API_KEY` (optional): turns on AI mode
  - `AI_MODEL` (optional, default `claude-haiku-4-5`)
  - `SUPPORT_EMAIL` (optional): shown if the contact form isn't available

Then go to **Deployments → Retry deployment** so the new settings take effect.

### 5. Add your domain
Open **Custom domains → Set up a domain**. HTTPS is issued automatically.

### 6. Protect the admin area (recommended)
In **Zero Trust → Access → Applications → Add → Self-hosted**, add `your-domain.com/admin` and `your-domain.com/api/admin`, with a policy that allows only your email address (one-time PIN).

### 7. Ads (after you have traffic and content)
1. Apply for Google AdSense with your domain.
2. After approval, open `/admin → Ads` and paste your `ca-pub-…` ID.
3. Put the line AdSense gives you into `public/ads.txt`, then redeploy.

Ad slots appear only below tools and between sections, never over upload controls.

### Deploy from your computer instead (optional)
```bash
npm install
cp wrangler.example.toml wrangler.toml   # then paste your D1 database_id
npx wrangler login
SITE_URL=https://your-domain.com npm run deploy
```

## Before you launch: things to edit

- `src/config.ts`: `SITE.supportEmail` (and optionally `SITE.twitter`)
- `src/pages/content.tsx`: review the Privacy Policy and Terms. Add your legal entity name and address, and have them checked by a professional.
- `public/ads.txt`: add your AdSense line after approval

## Local development

```bash
npm install
npm run dev            # builds, then serves http://localhost:8788 with the API and a local SQLite "D1"
```
Admin token for local use: `local-admin-token-change-me-please` (override with the `ADMIN_TOKEN` environment variable).

## Adding tools and workflows

- **Tool**: add a definition to `src/registry/tools.ts`, write the component in `src/tools/*.tsx` and register it in `src/tools/index.ts`. The page, SEO, sitemap and search entry are generated automatically.
- **Workflow**: add an entry to `src/registry/workflows.ts` using steps from `src/registry/steps.ts`. No UI changes are needed.
- **Intent / language**: add synonyms to `LEX` and rules to `INTENTS` in `src/lib/intent.ts`. The admin **Missing Tools** list shows what people searched for but couldn't find.

## Project layout

```
src/
  registry/      tools, categories, steps, workflows, templates, guides (data)
  lib/           intent engine, search, storage, analytics, QR encoder, zip, md5, data helpers
  engine/        image (canvas), pdf (pdf-lib + pdf.js), workflow runner
  tools/         the 38 tool UIs
  pages/         home, solve/search/assistant, tools, workflows/builder/templates, workspace, content, admin
  components/    layout, UI kit, file drop and result panel, workflow runner
functions/api/   Cloudflare Pages Functions (track, contact, config, ai, admin/*)
server/lib.ts    shared backend helpers
public/          _headers (security), favicon, manifest, ads.txt
scripts/         build.mjs (pre-render + bundle), dev-server.mjs (local preview)
schema.sql       D1 schema
```
