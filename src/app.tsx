import type { ReactElement } from "react";
import { Layout } from "./components/Layout";
import type { Route } from "./routes";
import { toolById } from "./registry/tools";
import { TOOL_COMPONENTS } from "./tools";

export async function loadPage(route: Pick<Route, "page" | "params" | "path">): Promise<ReactElement> {
  const p = route.params || {};
  let el: ReactElement;
  switch (route.page) {
    case "home": { const m = await import("./pages/home"); el = <m.default />; break; }
    case "search": { const m = await import("./pages/solve"); el = <m.SearchPage />; break; }
    case "solve": { const m = await import("./pages/solve"); el = <m.SolvePage />; break; }
    case "assistant": { const m = await import("./pages/solve"); el = <m.AssistantPage />; break; }
    case "all-tools": { const m = await import("./pages/tools"); el = <m.AllToolsPage />; break; }
    case "category": { const m = await import("./pages/tools"); el = <m.CategoryPage slug={p.slug} />; break; }
    case "tool": {
      const [m, Comp] = await Promise.all([import("./pages/tools"), TOOL_COMPONENTS[p.id]()]);
      el = <m.ToolPage tool={toolById(p.id)!} Comp={Comp} />;
      break;
    }
    case "result": { const m = await import("./pages/tools"); el = <m.ResultPage />; break; }
    case "workflows": { const m = await import("./pages/workflows"); el = <m.WorkflowsPage />; break; }
    case "workflow": { const m = await import("./pages/workflows"); el = <m.WorkflowDetailPage slug={p.slug} />; break; }
    case "builder": { const m = await import("./pages/workflows"); el = <m.BuilderPage />; break; }
    case "templates": { const m = await import("./pages/workflows"); el = <m.TemplatesPage />; break; }
    case "template-category": { const m = await import("./pages/workflows"); el = <m.TemplateCategoryPage id={p.id} />; break; }
    case "workspace": { const m = await import("./pages/workspace"); el = <m.WorkspacePage />; break; }
    case "account": { const m = await import("./pages/workspace"); el = <m.AccountPage />; break; }
    case "pricing": { const m = await import("./pages/workspace"); el = <m.PricingPage />; break; }
    case "guides": { const m = await import("./pages/content"); el = <m.GuidesPage />; break; }
    case "guide": { const m = await import("./pages/content"); el = <m.GuidePage slug={p.slug} />; break; }
    case "help": { const m = await import("./pages/content"); el = <m.HelpPage />; break; }
    case "about": { const m = await import("./pages/content"); el = <m.AboutPage />; break; }
    case "contact": { const m = await import("./pages/content"); el = <m.ContactPage />; break; }
    case "privacy": { const m = await import("./pages/content"); el = <m.PrivacyPage />; break; }
    case "terms": { const m = await import("./pages/content"); el = <m.TermsPage />; break; }
    case "admin": { const m = await import("./pages/admin"); el = <m.AdminPage />; break; }
    default: { const m = await import("./pages/content"); el = <m.NotFoundPage />; }
  }
  return <Layout path={route.path}>{el}</Layout>;
}
