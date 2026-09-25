// Cloudflare Workers entry: serves /api/* with the same handlers used by Pages Functions,
// and everything else from the static assets in /dist (with _headers and 404.html).
import * as mw from "../functions/api/_middleware";
import * as adminMw from "../functions/api/admin/_middleware";
import * as track from "../functions/api/track";
import * as contact from "../functions/api/contact";
import * as config from "../functions/api/config";
import * as ai from "../functions/api/ai";
import * as stats from "../functions/api/admin/stats";
import * as settings from "../functions/api/admin/settings";
import * as messages from "../functions/api/admin/messages";
import type { Env } from "../server/lib";

type Mod = Record<string, any>;
const ROUTES: Record<string, Mod> = {
  "/api/track": track, "/api/contact": contact, "/api/config": config, "/api/ai": ai,
  "/api/admin/stats": stats, "/api/admin/settings": settings, "/api/admin/messages": messages,
};
const handlerFor = (mod: Mod, method: string) => mod[`onRequest${method[0]}${method.slice(1).toLowerCase()}`] || mod.onRequest;

export default {
  async fetch(request: Request, env: Env & { ASSETS: { fetch: (r: Request) => Promise<Response> } }, ctx: { waitUntil: (p: Promise<any>) => void }) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);

    const method = request.method.toUpperCase();
    const endpoint = ROUTES[url.pathname.replace(/\/+$/, "")];
    const chain: Mod[] = [mw];
    if (url.pathname.startsWith("/api/admin/")) chain.push(adminMw);
    let i = 0;
    const next = async (): Promise<Response> => {
      if (i < chain.length) return handlerFor(chain[i++], method)({ request, env, next, waitUntil: ctx.waitUntil.bind(ctx) });
      const h = endpoint && handlerFor(endpoint, method);
      if (!h) return new Response(JSON.stringify({ error: endpoint ? "Method not allowed." : "Not found." }), { status: endpoint ? 405 : 404, headers: { "content-type": "application/json" } });
      return h({ request, env, next, waitUntil: ctx.waitUntil.bind(ctx) });
    };
    return next();
  },
};
