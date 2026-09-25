import { renderToString } from "react-dom/server";
import { loadPage } from "./app";
import { getRoutes, type Route } from "./routes";
import { SITE } from "./config";

export function setSiteUrl(url: string) {
  SITE.url = url.replace(/\/$/, "");
}
export { getRoutes, SITE };
export type { Route };

export async function renderRoute(route: Route) {
  const el = await loadPage(route);
  return renderToString(el);
}
