// Local-first workspace storage. Only metadata is stored — never file contents.
import type { WorkflowStep, ItemKind } from "../registry/types";

const PREFIX = "solveit:";

export function read<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(PREFIX + key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function write(key: string, value: unknown) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent("solveit:storage", { detail: key }));
  } catch {
    /* storage unavailable: ignore */
  }
}

export type RecentResult = {
  id: string; ts: number; title: string; href: string; kind: "tool" | "workflow";
  inputName?: string; inputSize?: number; outputName?: string; outputSize?: number; note?: string;
};
export type SavedWorkflow = { id: string; name: string; input: ItemKind; steps: WorkflowStep[]; ts: number; runs: number; from?: string };

export const workspace = {
  recents: () => read<RecentResult[]>("recents", []),
  addRecent(r: Omit<RecentResult, "id" | "ts">) {
    const list = workspace.recents().filter((x) => !(x.href === r.href && x.outputName === r.outputName));
    list.unshift({ ...r, id: Math.random().toString(36).slice(2), ts: Date.now() });
    write("recents", list.slice(0, 30));
  },
  clearRecents: () => write("recents", []),
  favorites: () => read<string[]>("favorites", []),
  toggleFavorite(id: string) {
    const f = workspace.favorites();
    const next = f.includes(id) ? f.filter((x) => x !== id) : [id, ...f];
    write("favorites", next);
    return next.includes(id);
  },
  saved: () => read<SavedWorkflow[]>("workflows", []),
  saveWorkflow(w: Omit<SavedWorkflow, "id" | "ts" | "runs"> & { id?: string }) {
    const list = workspace.saved();
    const id = w.id || Math.random().toString(36).slice(2, 10);
    const existing = list.find((x) => x.id === id);
    const item: SavedWorkflow = { ...w, id, ts: Date.now(), runs: existing?.runs || 0 };
    write("workflows", [item, ...list.filter((x) => x.id !== id)].slice(0, 50));
    return item;
  },
  deleteWorkflow(id: string) {
    write("workflows", workspace.saved().filter((x) => x.id !== id));
  },
  markRun(id: string) {
    write("workflows", workspace.saved().map((x) => (x.id === id ? { ...x, runs: x.runs + 1, ts: Date.now() } : x)));
  },
  searches: () => read<string[]>("searches", []),
  addSearch(q: string) {
    const s = q.trim();
    if (!s) return;
    write("searches", [s, ...workspace.searches().filter((x) => x.toLowerCase() !== s.toLowerCase())].slice(0, 12));
  },
};
