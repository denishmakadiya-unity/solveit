import { hydrateRoot } from "react-dom/client";
import { loadPage } from "./app";
import { track } from "./lib/analytics";

async function boot() {
  const el = document.getElementById("__route");
  const route = el ? JSON.parse(el.textContent || "{}") : { page: "notfound", path: location.pathname };
  const root = document.getElementById("root")!;
  const page = await loadPage(route);
  hydrateRoot(root, page, {
    onRecoverableError: (err) => { if (location.hostname === "localhost") console.warn("Hydration:", err); },
  });
  if (route.page !== "admin") track("page_view");
}

boot();
