import { DEFAULT_FLAGS, error, getSettings, json, readJson, type Ctx } from "../../../server/lib";

export const onRequestGet = async ({ env }: Ctx) => {
  const s = await getSettings(env);
  return json({ ...s, aiConfigured: Boolean(env.ANTHROPIC_API_KEY) });
};

export const onRequestPut = async ({ request, env }: Ctx) => {
  const body = await readJson<any>(request, 16_000);
  const flags: Record<string, boolean> = {};
  for (const k of Object.keys(DEFAULT_FLAGS)) flags[k] = typeof body.flags?.[k] === "boolean" ? body.flags[k] : (DEFAULT_FLAGS as any)[k];
  flags.mandatoryLogin = false; // basic tools must never require login
  const disabledTools = Array.isArray(body.disabledTools) ? body.disabledTools.filter((x: any) => typeof x === "string" && /^[a-z0-9-]{1,60}$/.test(x)).slice(0, 100) : [];
  const adsenseClient = typeof body.adsenseClient === "string" ? body.adsenseClient.trim() : "";
  if (adsenseClient && !/^ca-pub-\d{10,20}$/.test(adsenseClient)) return error("AdSense publisher ID must look like ca-pub-1234567890123456.");
  const up = (k: string, v: unknown) => env.DB!.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(k, JSON.stringify(v));
  await env.DB!.batch([up("flags", flags), up("disabledTools", disabledTools), up("adsenseClient", adsenseClient)]);
  return json({ ok: true, flags, disabledTools, adsenseClient });
};
