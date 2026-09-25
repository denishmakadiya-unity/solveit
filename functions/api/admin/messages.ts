import { json, type Ctx } from "../../../server/lib";

export const onRequestGet = async ({ env }: Ctx) => {
  const { results } = await env.DB!.prepare("SELECT id, ts, name, email, topic, message FROM messages ORDER BY ts DESC LIMIT 200").all();
  return json({ messages: results });
};
