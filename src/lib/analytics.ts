// Privacy-first product analytics. Never includes file contents, file names or typed text —
// only event names, tool/workflow ids, search queries and coarse numbers.
export type EventName =
  | "tool_view" | "tool_start" | "tool_success" | "tool_error" | "tool_download"
  | "search_submit" | "search_result_click" | "search_no_result"
  | "workflow_start" | "workflow_success" | "workflow_error" | "workflow_step_added" | "workflow_step_removed"
  | "related_tool_click" | "page_view" | "solve_submit";

let sid = "";
function sessionId() {
  if (sid) return sid;
  try {
    sid = sessionStorage.getItem("solveit:sid") || "";
    if (!sid) {
      sid = crypto.randomUUID();
      sessionStorage.setItem("solveit:sid", sid);
    }
  } catch {
    sid = Math.random().toString(36).slice(2);
  }
  return sid;
}

export function track(event: EventName, props: { tool?: string; workflow?: string; q?: string; value?: number; meta?: string } = {}) {
  if (typeof window === "undefined") return;
  try {
    if ((navigator as any).globalPrivacyControl === true) return;
    const body = JSON.stringify({
      e: event,
      t: props.tool,
      w: props.workflow,
      q: props.q ? props.q.slice(0, 120) : undefined,
      v: typeof props.value === "number" ? Math.round(props.value) : undefined,
      m: props.meta ? props.meta.slice(0, 60) : undefined,
      p: location.pathname.slice(0, 120),
      s: sessionId(),
    });
    const blob = new Blob([body], { type: "application/json" });
    if (!navigator.sendBeacon?.("/api/track", blob)) {
      fetch("/api/track", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true }).catch(() => {});
    }
  } catch {
    /* never break the UI for analytics */
  }
}
