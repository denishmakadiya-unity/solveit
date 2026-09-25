// "Upload once": keeps the latest result files in IndexedDB for this browser session so the
// next tool or workflow can continue without re-uploading. Cleared on demand and after 6 hours.
const DB = "solveit-session";
const STORE = "files";
const TTL = 6 * 60 * 60 * 1000;

export type SessionFile = { name: string; type: string; blob: Blob };

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function putSession(files: SessionFile[], source: string) {
  try {
    const db = await open();
    await new Promise<void>((res, rej) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put({ files, source, ts: Date.now() }, "current");
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
  } catch {
    /* IndexedDB unavailable — continuing without session handoff */
  }
}

export async function getSession(): Promise<{ files: SessionFile[]; source: string; ts: number } | null> {
  try {
    const db = await open();
    const v: any = await new Promise((res, rej) => {
      const req = db.transaction(STORE).objectStore(STORE).get("current");
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
    if (!v || Date.now() - v.ts > TTL) return null;
    return v;
  } catch {
    return null;
  }
}

export async function clearSession() {
  try {
    const db = await open();
    db.transaction(STORE, "readwrite").objectStore(STORE).delete("current");
  } catch {
    /* ignore */
  }
}

export function sessionToFiles(s: { files: SessionFile[] }) {
  return s.files.map((f) => new File([f.blob], f.name, { type: f.type }));
}
