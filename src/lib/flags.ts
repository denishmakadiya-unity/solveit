import { useEffect, useState } from "react";
import { DEFAULT_FLAGS, type FeatureFlags } from "../config";

export type RuntimeConfig = FeatureFlags & {
  aiAvailable: boolean;
  adsenseClient: string;
  disabledTools: string[];
};

const DEFAULT_RUNTIME: RuntimeConfig = { ...DEFAULT_FLAGS, aiAvailable: false, adsenseClient: "", disabledTools: [] };

let cache: RuntimeConfig | null = null;
let pending: Promise<RuntimeConfig> | null = null;
const listeners = new Set<(c: RuntimeConfig) => void>();

export function loadConfig(): Promise<RuntimeConfig> {
  if (cache) return Promise.resolve(cache);
  if (!pending) {
    pending = fetch("/api/config", { headers: { accept: "application/json" } })
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({}))
      .then((remote: Partial<RuntimeConfig>) => {
        cache = { ...DEFAULT_RUNTIME, ...remote };
        listeners.forEach((l) => l(cache!));
        return cache;
      });
  }
  return pending;
}

export function useConfig(): RuntimeConfig {
  const [c, setC] = useState<RuntimeConfig>(cache || DEFAULT_RUNTIME);
  useEffect(() => {
    listeners.add(setC);
    loadConfig().then(setC);
    return () => void listeners.delete(setC);
  }, []);
  return c;
}
