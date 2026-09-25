// Shared helpers for Cloudflare Pages Functions.
export interface D1Result<T = any> { results: T[] }
export interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  first<T = any>(col?: string): Promise<T | null>;
  all<T = any>(): Promise<D1Result<T>>;
  run(): Promise<any>;
}
export interface D1Database { prepare(sql: string): D1PreparedStatement; batch(s: D1PreparedStatement[]): Promise<any[]> }

export type Env = {
  DB?: D1Database;
  ADMIN_TOKEN?: string;
  ANTHROPIC_API_KEY?: string;
  AI_MODEL?: string;
  SUPPORT_EMAIL?: string;
};
export type Ctx = { request: Request; env: Env; next: () => Promise<Response>; waitUntil?: (p: Promise<any>) => void; data?: any };

export const DEFAULT_FLAGS = {
  adsEnabled: true, subscriptionEnabled: false, aiCreditsEnabled: false, affiliateEnabled: false,
  businessPlansEnabled: false, accountsEnabled: false, mandatoryLogin: false, aiEnabled: true, analyticsEnabled: true,
};
export type Flags = typeof DEFAULT_FLAGS;

export function json(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });
}
export const error = (message: string, status = 400) => json({ error: message }, status);

export async function readJson<T = any>(request: Request, maxBytes = 32_000): Promise<T> {
  const len = Number(request.headers.get("content-length") || 0);
  if (len > maxBytes) throw Object.assign(new Error("Request is too large."), { status: 413 });
  const text = await request.text();
  if (text.length > maxBytes) throw Object.assign(new Error("Request is too large."), { status: 413 });
  try {
    return JSON.parse(text) as T;
  } catch {
    throw Object.assign(new Error("Invalid JSON."), { status: 400 });
  }
}

export async function sha256(s: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Anonymous per-day client key: we never store raw IP addresses. */
export async function clientKey(request: Request, env: Env) {
  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "local";
  const day = new Date().toISOString().slice(0, 10);
  return (await sha256(`${ip}|${day}|${env.ADMIN_TOKEN || "solveit"}`)).slice(0, 24);
}

/** Fixed-window rate limit stored in D1. Returns true when the request is allowed. */
export async function rateLimit(env: Env, key: string, limit: number, windowSec: number) {
  if (!env.DB) return true;
  const now = Date.now();
  const exp = now + windowSec * 1000;
  try {
    const row = await env.DB.prepare(
      `INSERT INTO rate_limits (k, n, exp) VALUES (?1, 1, ?2)
       ON CONFLICT(k) DO UPDATE SET n = CASE WHEN rate_limits.exp < ?3 THEN 1 ELSE rate_limits.n + 1 END,
                                    exp = CASE WHEN rate_limits.exp < ?3 THEN ?2 ELSE rate_limits.exp END
       RETURNING n`,
    ).bind(key, exp, now).first<{ n: number }>();
    return !row || row.n <= limit;
  } catch {
    return true; // fail open for rate limiting only
  }
}

export function timingSafeEqual(a: string, b: string) {
  const ea = new TextEncoder().encode(a), eb = new TextEncoder().encode(b);
  let diff = ea.length ^ eb.length;
  for (let i = 0; i < Math.max(ea.length, eb.length); i++) diff |= (ea[i % ea.length] || 0) ^ (eb[i % eb.length] || 0);
  return diff === 0;
}

export type Settings = { flags: Flags; disabledTools: string[]; adsenseClient: string };

export async function getSettings(env: Env): Promise<Settings> {
  const base: Settings = { flags: { ...DEFAULT_FLAGS }, disabledTools: [], adsenseClient: "" };
  if (!env.DB) return base;
  try {
    const { results } = await env.DB.prepare("SELECT key, value FROM settings").all<{ key: string; value: string }>();
    for (const r of results) {
      const v = JSON.parse(r.value);
      if (r.key === "flags") base.flags = { ...base.flags, ...v, mandatoryLogin: false };
      if (r.key === "disabledTools" && Array.isArray(v)) base.disabledTools = v.filter((x) => typeof x === "string");
      if (r.key === "adsenseClient" && typeof v === "string") base.adsenseClient = v;
    }
  } catch {
    /* table missing: defaults */
  }
  return base;
}

export async function logEvent(env: Env, e: string, fields: { t?: string; w?: string; q?: string; v?: number; m?: string; p?: string; s?: string } = {}) {
  if (!env.DB) return;
  const now = Date.now();
  await env.DB.prepare("INSERT INTO events (ts, day, e, t, w, q, v, m, p, s) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(now, new Date(now).toISOString().slice(0, 10), e, fields.t ?? null, fields.w ?? null, fields.q ?? null, fields.v ?? null, fields.m ?? null, fields.p ?? null, fields.s ?? null)
    .run();
}

export const clean = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max) : undefined);
