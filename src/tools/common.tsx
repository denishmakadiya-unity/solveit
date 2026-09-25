import { useState } from "react";
import { track } from "../lib/analytics";
import type { ToolDefinition } from "../registry/types";

export type ToolProps = { tool: ToolDefinition };

export function useRunner(toolId: string) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | undefined>();
  const [error, setError] = useState<string>();
  const run = async <T,>(fn: (onProgress: (p: number) => void) => Promise<T>): Promise<T | undefined> => {
    setBusy(true);
    setError(undefined);
    setProgress(undefined);
    track("tool_start", { tool: toolId });
    const t0 = performance.now();
    try {
      // Yield so the "processing" state paints before heavy work starts.
      await new Promise((r) => setTimeout(r, 30));
      const r = await fn((p) => setProgress(p));
      track("tool_success", { tool: toolId, value: performance.now() - t0 });
      return r;
    } catch (e: any) {
      const msg = e?.message || String(e);
      setError(msg);
      track("tool_error", { tool: toolId, meta: msg.slice(0, 60) });
      return undefined;
    } finally {
      setBusy(false);
    }
  };
  return { busy, progress, error, setError, run };
}

export const blobOf = (bytes: Uint8Array, type = "application/pdf") => new Blob([bytes as BlobPart], { type });
export const readBytes = async (f: Blob) => new Uint8Array(await f.arrayBuffer());

export function move<T>(arr: T[], i: number, d: number) {
  const j = i + d;
  if (j < 0 || j >= arr.length) return arr;
  const a = arr.slice();
  [a[i], a[j]] = [a[j], a[i]];
  return a;
}
