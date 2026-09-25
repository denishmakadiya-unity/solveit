import { error, json, readJson, type Ctx } from "../../../server/lib";

export const onRequestGet = async ({ env }: Ctx) => {
  const { results } = await env.DB!.prepare("SELECT id, ts, name, email, topic, message FROM messages ORDER BY ts DESC LIMIT 200").all();
  return json({ messages: results });
};

// Delete one message: POST { "delete": <id> }
export const onRequestPost = async ({ request, env }: Ctx) => {
  const body = await readJson<any>(request, 1_000);
  const id = Number(body?.delete);
  if (!Number.isInteger(id) || id <= 0) return error("Invalid message id.");
  await env.DB!.prepare("DELETE FROM messages WHERE id = ?").bind(id).run();
  return json({ ok: true });
};
