import { clean, clientKey, error, json, rateLimit, readJson, type Ctx } from "../../server/lib";

const TOPICS = new Set(["support", "tool-request", "feedback", "bug", "business", "account-waitlist", "pricing-waitlist"]);

export const onRequestPost = async ({ request, env }: Ctx) => {
  if (!env.DB) return error(`The contact form isn't set up yet. Please email ${env.SUPPORT_EMAIL || "us"} instead.`, 503);
  const body = await readJson<any>(request, 12_000);
  // Bots: honeypot field filled in, or form submitted impossibly fast. Pretend success.
  if (body.website || (typeof body.elapsed === "number" && body.elapsed < 2500)) return json({ ok: true });
  const name = clean(body.name, 80) || "";
  const email = clean(body.email, 120) || "";
  const topic = TOPICS.has(body.topic) ? body.topic : "support";
  const message = typeof body.message === "string" ? body.message.replace(/\u0000/g, "").trim().slice(0, 4000) : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return error("Please enter a valid email address.");
  if (message.length < 10) return error("Please write a message of at least 10 characters.");
  if (!(await rateLimit(env, "c:" + (await clientKey(request, env)), 5, 3600))) return error("Too many messages. Please try again in an hour.", 429);
  await env.DB.prepare("INSERT INTO messages (ts, name, email, topic, message) VALUES (?, ?, ?, ?, ?)").bind(Date.now(), name, email, topic, message).run();
  return json({ ok: true });
};
