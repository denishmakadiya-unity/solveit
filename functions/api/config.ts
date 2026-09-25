import { getSettings, json, type Ctx } from "../../server/lib";

// Public runtime configuration: feature flags, ad settings and disabled tools.
export const onRequestGet = async ({ env }: Ctx) => {
  const s = await getSettings(env);
  return json(
    {
      ...s.flags,
      mandatoryLogin: false,
      aiAvailable: Boolean(env.ANTHROPIC_API_KEY) && s.flags.aiEnabled,
      adsenseClient: s.flags.adsEnabled ? s.adsenseClient : "",
      disabledTools: s.disabledTools,
    },
    200,
    { "cache-control": "public, max-age=60" },
  );
};
