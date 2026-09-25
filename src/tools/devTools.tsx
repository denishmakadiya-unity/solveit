import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "../components/Icon";
import { Alert, CopyButton, Field, NumberInput, Seg, downloadBlob } from "../components/ui";
import { bytesToBase64, csvToObjects, detectDelimiter, fromBase64, jsonToCsv, parseJson, sortKeys, stringifyJson, toBase64 } from "../lib/data";
import { encodeQR, qrToCanvas, qrToSvg, type Ecc } from "../lib/qr";
import { md5 } from "../lib/md5";
import { formatBytes, savings } from "../lib/format";
import { track } from "../lib/analytics";
import type { ToolProps } from "./common";

const SAMPLE_JSON = `{"name":"SolveIt","tools":38,"workflows":52,"features":["Problem Solver","Smart Search","Workflows"],"privacy":{"clientSide":true,"uploads":null},"tags":[]}`;

function useDraft(key: string, initial: string) {
  const [v, setV] = useState(initial);
  useEffect(() => { try { const s = sessionStorage.getItem("solveit:draft:" + key); if (s !== null) setV(s); } catch { /* ignore */ } }, []);
  useEffect(() => { try { sessionStorage.setItem("solveit:draft:" + key, v); } catch { /* ignore */ } }, [v]);
  return [v, setV] as const;
}

function LoadFile({ onText, accept = ".json,.txt,.csv,application/json,text/plain,text/csv" }: { onText: (t: string, name: string) => void; accept?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => ref.current?.click()}><Icon name="upload" size={15} /> Open file</button>
      <input ref={ref} type="file" hidden accept={accept} onChange={async (e) => {
        const f = e.target.files?.[0];
        if (f) { if (f.size > 25 * 1024 * 1024) return alertOnce("File is larger than 25 MB."); onText(await f.text(), f.name); }
        e.target.value = "";
      }} />
    </>
  );
}
function alertOnce(m: string) { import("../components/ui").then((u) => u.toast(m)); }

function Output({ text, name, mime, toolId, label = "Result" }: { text: string; name: string; mime: string; toolId: string; label?: string }) {
  return (
    <div className="stack-sm">
      <div className="row between">
        <span className="label">{label} <span className="muted" style={{ fontWeight: 400 }}>· {formatBytes(new Blob([text]).size)}</span></span>
        <div className="row">
          <CopyButton text={text} />
          <button className="btn btn-secondary btn-sm" onClick={() => downloadBlob(new Blob([text], { type: mime }), name, toolId)}><Icon name="download" size={15} /> Download</button>
        </div>
      </div>
      <pre className="code-out" data-testid="output">{text}</pre>
    </div>
  );
}

function JsonError({ r }: { r: ReturnType<typeof parseJson> }) {
  if (r.ok) return null;
  return <Alert kind="err"><b>Invalid JSON — line {r.line}, column {r.column}.</b> {r.message}<br /><span style={{ opacity: 0.9 }}>Tip: {r.hint}</span></Alert>;
}

export function JsonFormatter({ tool }: ToolProps) {
  const [text, setText] = useDraft(tool.id, SAMPLE_JSON);
  const [indent, setIndent] = useState<"2" | "4" | "tab">("2");
  const [sort, setSort] = useState(false);
  const r = useMemo(() => parseJson(text), [text]);
  const out = r.ok ? stringifyJson(sort ? sortKeys(r.value) : r.value, indent) : "";
  useEffect(() => { if (r.ok && text) track("tool_success", { tool: tool.id }); }, [r.ok]);
  return (
    <div className="stack">
      <div className="row between"><span className="label">Paste JSON</span><div className="row"><LoadFile onText={(t) => setText(t)} /><button className="btn btn-ghost btn-sm" onClick={() => setText("")}>Clear</button></div></div>
      <textarea className="textarea code" value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} aria-label="JSON input" />
      <div className="row">
        <Seg label="Indentation" value={indent} onChange={setIndent} options={[{ value: "2", label: "2 spaces" }, { value: "4", label: "4 spaces" }, { value: "tab", label: "Tabs" }]} />
        <label className="check"><input type="checkbox" checked={sort} onChange={(e) => setSort(e.target.checked)} /> Sort keys A–Z</label>
      </div>
      {text.trim() && (r.ok ? <Output text={out} name="formatted.json" mime="application/json" toolId={tool.id} label="Formatted JSON" /> : <JsonError r={r} />)}
    </div>
  );
}

export function JsonValidator({ tool }: ToolProps) {
  const [text, setText] = useDraft(tool.id, `{\n  "name": "SolveIt",\n  "tools": 38,\n  "tags": ["pdf", "image",],\n}`);
  const r = useMemo(() => parseJson(text), [text]);
  const lines = text.split("\n");
  useEffect(() => { if (text) track(r.ok ? "tool_success" : "tool_error", { tool: tool.id }); }, [r.ok]);
  const stats = r.ok ? (() => {
    let keys = 0, depth = 0;
    const walk = (v: any, d: number) => { depth = Math.max(depth, d); if (Array.isArray(v)) v.forEach((x) => walk(x, d + 1)); else if (v && typeof v === "object") Object.values(v).forEach((x) => { keys++; walk(x, d + 1); }); };
    walk(r.value, 0);
    return { keys, depth, type: Array.isArray(r.value) ? `Array (${r.value.length} items)` : typeof r.value === "object" && r.value ? "Object" : typeof r.value };
  })() : null;
  return (
    <div className="stack">
      <div className="row between"><span className="label">Paste JSON to validate</span><LoadFile onText={(t) => setText(t)} /></div>
      <textarea className="textarea code" value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} aria-label="JSON input" />
      {!text.trim() ? null : r.ok ? (
        <>
          <Alert kind="ok"><b>Valid JSON.</b> Everything checks out.</Alert>
          <div className="stat-grid">
            <div className="stat"><div className="k">Top-level type</div><div className="v" style={{ fontSize: "1.1rem" }}>{stats!.type}</div></div>
            <div className="stat"><div className="k">Keys</div><div className="v">{stats!.keys}</div></div>
            <div className="stat"><div className="k">Max depth</div><div className="v">{stats!.depth}</div></div>
          </div>
        </>
      ) : (
        <>
          <JsonError r={r} />
          <pre className="code-out" aria-label="Error location">
            {lines.slice(Math.max(0, (r as any).line - 3), (r as any).line + 2).map((l, i) => {
              const no = Math.max(0, (r as any).line - 3) + i + 1;
              return <div key={no} style={no === (r as any).line ? { background: "var(--err-soft)", color: "var(--err)" } : undefined}>{String(no).padStart(4)}  {l}</div>;
            })}
          </pre>
          <div className="row"><a className="btn btn-soft btn-sm" href="/workflows/api-ready-json">Fix trailing commas with API-Ready JSON</a></div>
        </>
      )}
    </div>
  );
}

export function JsonMinifier({ tool }: ToolProps) {
  const [text, setText] = useDraft(tool.id, JSON.stringify(JSON.parse(SAMPLE_JSON), null, 2));
  const r = useMemo(() => parseJson(text), [text]);
  const out = r.ok ? JSON.stringify(r.value) : "";
  return (
    <div className="stack">
      <div className="row between"><span className="label">Paste JSON</span><LoadFile onText={(t) => setText(t)} /></div>
      <textarea className="textarea code" value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} aria-label="JSON input" />
      {text.trim() && (r.ok ? (
        <>
          <div className="row"><span className="badge ok">{savings(new Blob([text]).size, new Blob([out]).size)}% smaller</span><span className="muted">{formatBytes(new Blob([text]).size)} → {formatBytes(new Blob([out]).size)}</span></div>
          <Output text={out} name="minified.json" mime="application/json" toolId={tool.id} label="Minified JSON" />
        </>
      ) : <JsonError r={r} />)}
    </div>
  );
}

export function Base64Tool({ tool }: ToolProps) {
  const [mode, setMode] = useState<"encode" | "decode">("encode");
  const [text, setText] = useDraft(tool.id, "Hello from SolveIt — नमस्ते 👋");
  const [urlSafe, setUrlSafe] = useState(false);
  const [fileOut, setFileOut] = useState<{ name: string; b64: string; type: string }>();
  const fileRef = useRef<HTMLInputElement>(null);
  let out = "", err = "";
  try { out = mode === "encode" ? toBase64(text, urlSafe) : fromBase64(text); } catch { err = "This isn't valid Base64. Check for missing or extra characters."; }
  return (
    <div className="stack">
      <div className="row between">
        <Seg label="Mode" value={mode} onChange={(m) => { setMode(m); if (out && !err) setText(out); setFileOut(undefined); }} options={[{ value: "encode", label: "Encode" }, { value: "decode", label: "Decode" }]} />
        {mode === "encode" && (
          <div className="row">
            <label className="check"><input type="checkbox" checked={urlSafe} onChange={(e) => setUrlSafe(e.target.checked)} /> URL-safe</label>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => fileRef.current?.click()}><Icon name="upload" size={15} /> Encode a file</button>
            <input ref={fileRef} type="file" hidden onChange={async (e) => {
              const f = e.target.files?.[0]; e.target.value = "";
              if (!f) return;
              if (f.size > 10 * 1024 * 1024) return alertOnce("Choose a file under 10 MB.");
              setFileOut({ name: f.name, type: f.type || "application/octet-stream", b64: bytesToBase64(new Uint8Array(await f.arrayBuffer()), urlSafe) });
            }} />
          </div>
        )}
      </div>
      {fileOut ? (
        <>
          <FileNote name={fileOut.name} onClear={() => setFileOut(undefined)} />
          <Output text={fileOut.b64} name={fileOut.name + ".b64.txt"} mime="text/plain" toolId={tool.id} label="Base64" />
          <Output text={`data:${fileOut.type};base64,${fileOut.b64}`} name={fileOut.name + ".datauri.txt"} mime="text/plain" toolId={tool.id} label="Data URI" />
        </>
      ) : (
        <>
          <textarea className="textarea code" value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} aria-label={mode === "encode" ? "Text to encode" : "Base64 to decode"} />
          {err ? <Alert kind="err">{err}</Alert> : text && <Output text={out} name={mode === "encode" ? "encoded.txt" : "decoded.txt"} mime="text/plain" toolId={tool.id} label={mode === "encode" ? "Base64" : "Decoded text"} />}
        </>
      )}
    </div>
  );
}
function FileNote({ name, onClear }: { name: string; onClear: () => void }) {
  return <div className="row"><span className="badge brand"><Icon name="files" size={13} /> {name}</span><button className="btn btn-ghost btn-sm" onClick={onClear}>Back to text</button></div>;
}

export function UuidGenerator({ tool }: ToolProps) {
  const [count, setCount] = useState("10");
  const [upper, setUpper] = useState(false);
  const [hyphens, setHyphens] = useState(true);
  const [braces, setBraces] = useState(false);
  const [seed, setSeed] = useState(0);
  const [list, setList] = useState<string[]>([]);
  useEffect(() => {
    const c = Math.min(1000, Math.max(1, Math.round(+count) || 1));
    setList(Array.from({ length: c }, () => {
      let u: string = crypto.randomUUID();
      if (!hyphens) u = u.replace(/-/g, "");
      if (upper) u = u.toUpperCase();
      return braces ? `{${u}}` : u;
    }));
  }, [count, upper, hyphens, braces, seed]);
  const text = list.join("\n");
  return (
    <div className="stack">
      <div className="row" style={{ alignItems: "flex-end" }}>
        <Field label="How many" htmlFor="uc"><NumberInput id="uc" value={count} onChange={setCount} min={1} max={1000} /></Field>
        <label className="check"><input type="checkbox" checked={upper} onChange={(e) => setUpper(e.target.checked)} /> Uppercase</label>
        <label className="check"><input type="checkbox" checked={hyphens} onChange={(e) => setHyphens(e.target.checked)} /> Hyphens</label>
        <label className="check"><input type="checkbox" checked={braces} onChange={(e) => setBraces(e.target.checked)} /> {"{Braces}"}</label>
        <button className="btn btn-primary" onClick={() => { setSeed(seed + 1); track("tool_success", { tool: tool.id }); }}><Icon name="repeat2" size={16} /> Generate new</button>
      </div>
      <Output text={text} name="uuids.txt" mime="text/plain" toolId={tool.id} label={`${list.length} UUID${list.length > 1 ? "s" : ""} (v4)`} />
    </div>
  );
}

type QrType = "url" | "text" | "wifi" | "upi" | "email" | "phone";
export function QrCodeGenerator({ tool }: ToolProps) {
  const [type, setType] = useState<QrType>("url");
  const [url, setUrl] = useState("https://example.com");
  const [text, setText] = useState("Hello from SolveIt");
  const [wifi, setWifi] = useState({ ssid: "MyHomeWiFi", pass: "", sec: "WPA", hidden: false });
  const [upi, setUpi] = useState({ pa: "", pn: "", am: "", tn: "" });
  const [mail, setMail] = useState({ to: "", subject: "", body: "" });
  const [phone, setPhone] = useState("+91");
  const [ecc, setEcc] = useState<Ecc>("M");
  const [fg, setFg] = useState("#0e1525");
  const [bg, setBg] = useState("#ffffff");
  const [size, setSize] = useState("512");
  const esc = (s: string) => s.replace(/([\\;,:"])/g, "\\$1");
  const payload = (() => {
    switch (type) {
      case "url": return url.trim();
      case "text": return text;
      case "wifi": return `WIFI:T:${wifi.sec === "none" ? "nopass" : wifi.sec};S:${esc(wifi.ssid)};${wifi.sec !== "none" ? `P:${esc(wifi.pass)};` : ""}${wifi.hidden ? "H:true;" : ""};`;
      case "upi": {
        const q = new URLSearchParams();
        if (upi.pa) q.set("pa", upi.pa.trim());
        if (upi.pn) q.set("pn", upi.pn.trim());
        if (upi.am) q.set("am", (+upi.am).toFixed(2));
        if (upi.tn) q.set("tn", upi.tn.trim());
        q.set("cu", "INR");
        return `upi://pay?${q.toString().replace(/\+/g, "%20")}`;
      }
      case "email": return `mailto:${mail.to}?subject=${encodeURIComponent(mail.subject)}&body=${encodeURIComponent(mail.body)}`;
      case "phone": return `tel:${phone.replace(/[^\d+]/g, "")}`;
    }
  })();
  const problem = type === "upi" && !/^[\w.\-]{2,}@[A-Za-z]{2,}$/.test(upi.pa.trim()) ? "Enter a valid UPI ID, like name@bank." : !payload ? "Enter something to encode." : "";
  const matrix = useMemo(() => { if (problem) return null; try { return { m: encodeQR(payload, ecc) }; } catch (e: any) { return { e: e.message as string }; } }, [payload, ecc, problem]);
  const svg = matrix?.m ? qrToSvg(matrix.m, { fg, bg }) : "";
  const lowContrast = (() => { const l = (h: string) => { const v = parseInt(h.slice(1), 16); return (0.299 * (v >> 16) + 0.587 * ((v >> 8) & 255) + 0.114 * (v & 255)) / 255; }; return Math.abs(l(fg) - l(bg)) < 0.45; })();
  const dlPng = () => {
    if (!matrix?.m) return;
    qrToCanvas(matrix.m, +size, { fg, bg }).toBlob((b) => b && downloadBlob(b, "qr-code.png", tool.id), "image/png");
  };
  return (
    <div className="tool-layout" style={{ gridTemplateColumns: "minmax(0,1fr) 300px" }}>
      <div className="stack">
        <div className="chips">
          {([["url", "Link"], ["text", "Text"], ["wifi", "Wi-Fi"], ["upi", "UPI payment"], ["email", "Email"], ["phone", "Phone"]] as [QrType, string][]).map(([v, l]) => (
            <button key={v} type="button" className="chip" aria-pressed={type === v} onClick={() => setType(v)}>{l}</button>
          ))}
        </div>
        {type === "url" && <Field label="Website link" htmlFor="qu"><input id="qu" className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" /></Field>}
        {type === "text" && <Field label="Text" htmlFor="qt"><textarea id="qt" className="textarea" style={{ minHeight: 110 }} value={text} onChange={(e) => setText(e.target.value)} /></Field>}
        {type === "wifi" && (
          <div className="form-grid">
            <Field label="Network name (SSID)" htmlFor="ws"><input id="ws" className="input" value={wifi.ssid} onChange={(e) => setWifi({ ...wifi, ssid: e.target.value })} /></Field>
            <Field label="Password" htmlFor="wp"><input id="wp" className="input" value={wifi.pass} onChange={(e) => setWifi({ ...wifi, pass: e.target.value })} /></Field>
            <Field label="Security" htmlFor="wsec"><select id="wsec" className="select" value={wifi.sec} onChange={(e) => setWifi({ ...wifi, sec: e.target.value })}><option value="WPA">WPA/WPA2/WPA3</option><option value="WEP">WEP</option><option value="none">None</option></select></Field>
            <label className="check" style={{ alignSelf: "end", paddingBottom: 12 }}><input type="checkbox" checked={wifi.hidden} onChange={(e) => setWifi({ ...wifi, hidden: e.target.checked })} /> Hidden network</label>
          </div>
        )}
        {type === "upi" && (
          <div className="form-grid">
            <Field label="UPI ID" htmlFor="upa"><input id="upa" className="input" value={upi.pa} onChange={(e) => setUpi({ ...upi, pa: e.target.value })} placeholder="yourname@bank" /></Field>
            <Field label="Payee name" htmlFor="upn"><input id="upn" className="input" value={upi.pn} onChange={(e) => setUpi({ ...upi, pn: e.target.value })} /></Field>
            <Field label="Amount (optional)" htmlFor="uam"><NumberInput id="uam" value={upi.am} onChange={(v) => setUpi({ ...upi, am: v })} prefix="₹" min={0} /></Field>
            <Field label="Note (optional)" htmlFor="utn"><input id="utn" className="input" value={upi.tn} onChange={(e) => setUpi({ ...upi, tn: e.target.value })} /></Field>
          </div>
        )}
        {type === "email" && (
          <div className="form-grid">
            <Field label="To" htmlFor="mt"><input id="mt" className="input" type="email" value={mail.to} onChange={(e) => setMail({ ...mail, to: e.target.value })} /></Field>
            <Field label="Subject" htmlFor="ms"><input id="ms" className="input" value={mail.subject} onChange={(e) => setMail({ ...mail, subject: e.target.value })} /></Field>
            <Field label="Message" htmlFor="mb"><input id="mb" className="input" value={mail.body} onChange={(e) => setMail({ ...mail, body: e.target.value })} /></Field>
          </div>
        )}
        {type === "phone" && <Field label="Phone number" htmlFor="qp"><input id="qp" className="input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>}
        <div className="form-grid">
          <Field label="Error correction" htmlFor="qe"><select id="qe" className="select" value={ecc} onChange={(e) => setEcc(e.target.value as Ecc)}><option value="L">Low (7%)</option><option value="M">Medium (15%)</option><option value="Q">Quartile (25%)</option><option value="H">High (30%)</option></select></Field>
          <Field label="PNG size" htmlFor="qs"><select id="qs" className="select" value={size} onChange={(e) => setSize(e.target.value)}><option value="256">256 px</option><option value="512">512 px</option><option value="1024">1024 px</option><option value="2048">2048 px</option></select></Field>
          <Field label="Colors"><div className="row" style={{ gap: 8 }}><input type="color" className="color-input" aria-label="Foreground color" value={fg} onChange={(e) => setFg(e.target.value)} /><input type="color" className="color-input" aria-label="Background color" value={bg} onChange={(e) => setBg(e.target.value)} /></div></Field>
        </div>
      </div>
      <div className="stack" style={{ alignItems: "center" }}>
        {problem ? <Alert kind="info">{problem}</Alert> : matrix?.e ? <Alert kind="err">{matrix.e}</Alert> : (
          <>
            <div className="qr-preview" style={{ background: bg }} data-testid="qr" dangerouslySetInnerHTML={{ __html: svg.replace("<svg ", '<svg width="240" height="240" role="img" aria-label="QR code preview" ') }} />
            {lowContrast && <Alert kind="warn">Low contrast — some phones may not scan this. Use a dark code on a light background.</Alert>}
            <div className="row" style={{ justifyContent: "center" }}>
              <button className="btn btn-primary" onClick={dlPng}><Icon name="download" size={16} /> PNG</button>
              <button className="btn btn-secondary" onClick={() => downloadBlob(new Blob([svg], { type: "image/svg+xml" }), "qr-code.svg", tool.id)}><Icon name="download" size={16} /> SVG</button>
            </div>
            <p className="hint" style={{ textAlign: "center" }}>Always test-scan before printing.</p>
          </>
        )}
      </div>
    </div>
  );
}

// ── Security ──
const WORDS = "able acid aged also area army away baby back ball band bank base bath bear beat bell belt best bird blow blue boat body bone book boot born boss both bowl bulk burn bush busy cake calm camp card care cart case cash cast cell chat chip city clay club coal coat code cold cook cool cope copy core corn cost crew crop dark data date dawn deal dear deep deny desk dial diet disk dock door dose down draw drop drum duck dust duty earn east easy edge else even ever exit face fact fair fall farm fast fear feel file fill film find fine fire firm fish five flag flat flow folk food foot form fort four free frog fuel full fund gain game gate gear gift girl give glad goal gold golf good grab gray grow hair half hall hand hang hard harm head hear heat help herb hero hide high hill hint hold hole home hope horn host hour huge idea inch iron item jazz join joke jump jury keen keep kick kind king kite knee knot lake lamp land lane last late lawn lead leaf lean left lens life lift like lime line link lion list live load loan lock long look loop lord love luck lung made mail main make mall many mark mass meal meat menu mild milk mind mint miss mode moon more most move much nail name navy near neat neck need nest news next nice nine node noon norm nose note oval oven pace pack page pain pair palm park part pass path peak pear pick pine pink pipe plan play plot plug poem pole pond pool port pose post pure push race rail rain rank rare rate read real rest rice rich ride ring rise risk road rock roof room root rope rose ruby rule safe sail salt sand save seat seed self ship shoe shop shot show side sign silk sing site size skin slow snow soft soil sole song soup spin spot star stay step stop suit sure swim tail tale talk tall tank tape task team tent term test text tide tile time tiny tone tool town tree trip true tube tune turn twin type unit user vast verb view vote wage walk wall warm wave weak wear week west wide wild wind wine wing wire wise wolf wood wool word work yard year yoga zero zone".split(" ");

function rand(n: number) {
  const a = new Uint32Array(1);
  const lim = Math.floor(0x100000000 / n) * n;
  do crypto.getRandomValues(a); while (a[0] >= lim);
  return a[0] % n;
}

export function PasswordGenerator({ tool }: ToolProps) {
  const [kind, setKind] = useState<"password" | "passphrase">("password");
  const [len, setLen] = useState(18);
  const [sets, setSets] = useState({ upper: true, lower: true, digits: true, symbols: true, ambiguous: true });
  const [words, setWords] = useState(5);
  const [sep, setSep] = useState("-");
  const [seed, setSeed] = useState(0);
  const [pw, setPw] = useState("");
  useEffect(() => {
    if (kind === "passphrase") {
      const w = Array.from({ length: words }, () => WORDS[rand(WORDS.length)]);
      const ci = rand(w.length);
      w[ci] = w[ci].replace(/^./, (c) => c.toUpperCase());
      setPw(w.join(sep) + sep + rand(100));
      return;
    }
    const pools: string[] = [];
    const amb = /[Il1O0o]/g;
    const U = "ABCDEFGHIJKLMNOPQRSTUVWXYZ", L = "abcdefghijklmnopqrstuvwxyz", D = "0123456789", S = "!@#$%^&*()-_=+[]{};:,.?/";
    const clean = (s: string) => (sets.ambiguous ? s.replace(amb, "") : s);
    if (sets.upper) pools.push(clean(U));
    if (sets.lower) pools.push(clean(L));
    if (sets.digits) pools.push(clean(D));
    if (sets.symbols) pools.push(S);
    if (!pools.length) pools.push(L);
    const all = pools.join("");
    const chars = pools.map((p) => p[rand(p.length)]);
    while (chars.length < len) chars.push(all[rand(all.length)]);
    for (let i = chars.length - 1; i > 0; i--) { const j = rand(i + 1); [chars[i], chars[j]] = [chars[j], chars[i]]; }
    setPw(chars.slice(0, len).join(""));
  }, [kind, len, sets, words, sep, seed]);
  const entropy = kind === "passphrase" ? words * Math.log2(WORDS.length) + Math.log2(100) + 2 : len * Math.log2(
    (sets.upper ? 24 : 0) + (sets.lower ? 24 : 0) + (sets.digits ? 8 : 0) + (sets.symbols ? 24 : 0) || 26);
  const strength = entropy >= 90 ? ["Excellent", "var(--ok)"] : entropy >= 70 ? ["Strong", "var(--ok)"] : entropy >= 50 ? ["Fair", "var(--warn)"] : ["Weak", "var(--err)"];
  return (
    <div className="stack">
      <Seg label="Type" value={kind} onChange={setKind} options={[{ value: "password", label: "Random password" }, { value: "passphrase", label: "Memorable passphrase" }]} />
      <div className="row" style={{ alignItems: "stretch", flexWrap: "nowrap" }}>
        <pre className="code-out" style={{ flex: 1, fontSize: "1.25rem", margin: 0, display: "flex", alignItems: "center" }} data-testid="password">{pw}</pre>
        <button className="btn btn-secondary" style={{ height: "auto" }} aria-label="Generate another" onClick={() => { setSeed(seed + 1); track("tool_success", { tool: tool.id }); }}><Icon name="repeat2" /></button>
        <CopyButton text={pw} className="btn btn-primary" />
      </div>
      <div>
        <div className="row between" style={{ fontSize: "0.88rem" }}><span>Strength: <b style={{ color: strength[1] }}>{strength[0]}</b></span><span className="muted">{Math.round(entropy)} bits of entropy</span></div>
        <div className="meter"><i style={{ width: Math.min(100, entropy / 1.2) + "%", background: strength[1] }} /></div>
      </div>
      {kind === "password" ? (
        <>
          <Field label={`Length: ${len} characters`} htmlFor="pl"><input id="pl" type="range" min={8} max={64} value={len} onChange={(e) => setLen(+e.target.value)} /></Field>
          <div className="grid grid-3" style={{ gap: 10 }}>
            {([["upper", "Uppercase A–Z"], ["lower", "Lowercase a–z"], ["digits", "Numbers 0–9"], ["symbols", "Symbols !@#"], ["ambiguous", "Avoid look-alikes (I, l, 1, O, 0)"]] as const).map(([k, l]) => (
              <label key={k} className="check"><input type="checkbox" checked={(sets as any)[k]} onChange={(e) => setSets({ ...sets, [k]: e.target.checked })} /> {l}</label>
            ))}
          </div>
        </>
      ) : (
        <div className="form-grid">
          <Field label={`Words: ${words}`} htmlFor="pwn"><input id="pwn" type="range" min={3} max={10} value={words} onChange={(e) => setWords(+e.target.value)} /></Field>
          <Field label="Separator" htmlFor="psep"><select id="psep" className="select" value={sep} onChange={(e) => setSep(e.target.value)}><option value="-">Hyphen (-)</option><option value=".">Dot (.)</option><option value="_">Underscore (_)</option><option value=" ">Space</option></select></Field>
        </div>
      )}
      <p className="hint"><Icon name="lock" size={13} /> Generated on your device with a cryptographically secure random generator. Never sent or stored.</p>
    </div>
  );
}

const COMMON = new Set("123456 password 123456789 12345678 12345 qwerty 1234567 111111 1234567890 123123 abc123 password1 1234 iloveyou 000000 qwerty123 dragon sunshine princess letmein monkey football welcome admin login master hello freedom whatever shadow superman michael qazwsx trustno1 india india123 pass@123 admin123 welcome123 password@123 qwertyuiop asdfghjkl zxcvbnm 987654321 654321 121212 baseball starwars".split(" "));

export function PasswordStrengthChecker({ tool }: ToolProps) {
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const a = useMemo(() => {
    const tips: string[] = [], issues: string[] = [];
    const lower = pw.toLowerCase();
    let pool = 0;
    if (/[a-z]/.test(pw)) pool += 26;
    if (/[A-Z]/.test(pw)) pool += 26;
    if (/\d/.test(pw)) pool += 10;
    if (/[^A-Za-z0-9]/.test(pw)) pool += 33;
    let bits = pw.length * Math.log2(pool || 1);
    if (COMMON.has(lower) || COMMON.has(lower.replace(/[^a-z0-9@]/g, ""))) { bits = Math.min(bits, 8); issues.push("This is one of the most common passwords."); }
    if (/(.)\1{2,}/.test(pw)) { bits -= 10; issues.push("Repeated characters (like “aaa”)."); }
    if (/(0123|1234|2345|3456|4567|5678|6789|abcd|bcde|qwer|asdf|zxcv)/i.test(pw)) { bits -= 12; issues.push("Keyboard or number sequences."); }
    if (/(19|20)\d{2}/.test(pw)) { bits -= 6; issues.push("Looks like it contains a year."); }
    if (/^[A-Z][a-z]+\d+[!@#$]?$/.test(pw)) { bits -= 10; issues.push("Common pattern: Capital word + numbers."); }
    bits = Math.max(0, bits);
    if (pw.length < 12) tips.push("Use at least 12–14 characters.");
    if (!/[A-Z]/.test(pw) || !/[a-z]/.test(pw)) tips.push("Mix uppercase and lowercase letters.");
    if (!/\d/.test(pw)) tips.push("Add numbers.");
    if (!/[^A-Za-z0-9]/.test(pw)) tips.push("Add a symbol such as ! # %.");
    tips.push("Use a unique password for every account and store it in a password manager.");
    const guesses = Math.pow(2, bits) / 2;
    const secs = guesses / 1e10; // offline attack at 10 billion guesses/second
    const human = secs < 1 ? "instantly" : secs < 60 ? `${Math.round(secs)} seconds` : secs < 3600 ? `${Math.round(secs / 60)} minutes` : secs < 86400 ? `${Math.round(secs / 3600)} hours` : secs < 31557600 ? `${Math.round(secs / 86400)} days` : secs < 31557600 * 1000 ? `${Math.round(secs / 31557600)} years` : secs < 31557600 * 1e6 ? `${Math.round(secs / 31557600 / 1000)} thousand years` : "millions of years+";
    const score = bits < 28 ? 0 : bits < 40 ? 1 : bits < 60 ? 2 : bits < 80 ? 3 : 4;
    return { bits, human, score, tips, issues };
  }, [pw]);
  const labels = [["Very weak", "var(--err)"], ["Weak", "var(--err)"], ["Fair", "var(--warn)"], ["Strong", "var(--ok)"], ["Very strong", "var(--ok)"]];
  return (
    <div className="stack">
      <Field label="Password to check" htmlFor="pwc">
        <div className="input-group">
          <input id="pwc" className="input" type={show ? "text" : "password"} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="off" spellCheck={false} placeholder="Type a password" />
          <button type="button" className="btn btn-ghost" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"}><Icon name={show ? "eye-off" : "eye"} /></button>
        </div>
      </Field>
      {pw && (
        <>
          <div>
            <div className="row between" style={{ fontSize: "0.9rem" }}><b style={{ color: labels[a.score][1] }} data-testid="strength">{labels[a.score][0]}</b><span className="muted">≈ {Math.round(a.bits)} bits</span></div>
            <div className="meter"><i style={{ width: ((a.score + 1) / 5) * 100 + "%", background: labels[a.score][1] }} /></div>
          </div>
          <div className="stat-grid">
            <div className="stat"><div className="k">Time to crack</div><div className="v" style={{ fontSize: "1.15rem" }}>{a.human}</div><div className="s">Fast offline attack (10¹⁰ guesses/sec)</div></div>
            <div className="stat"><div className="k">Length</div><div className="v">{[...pw].length}</div></div>
          </div>
          {a.issues.length > 0 && <Alert kind="warn"><b>Problems found:</b> {a.issues.join(" ")}</Alert>}
          <div className="card flat"><h3 style={{ marginBottom: 8 }}>How to improve</h3><ul style={{ margin: 0, paddingLeft: 18 }}>{a.tips.map((t) => <li key={t}>{t}</li>)}</ul></div>
          <a className="btn btn-soft" href="/tools/security/password-generator"><Icon name="key-round" size={16} /> Generate a strong password</a>
        </>
      )}
      <p className="hint"><Icon name="lock" size={13} /> Checked entirely on your device. Nothing you type is sent or stored.</p>
    </div>
  );
}

export function HashGenerator({ tool }: ToolProps) {
  const [mode, setMode] = useState<"text" | "file">("text");
  const [text, setText] = useState("SolveIt");
  const [file, setFile] = useState<File>();
  const [hashes, setHashes] = useState<[string, string][]>([]);
  const [compare, setCompare] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      let bytes: Uint8Array;
      if (mode === "file") { if (!file) return setHashes([]); setBusy(true); bytes = new Uint8Array(await file.arrayBuffer()); }
      else bytes = new TextEncoder().encode(text);
      const hex = (b: ArrayBuffer) => Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, "0")).join("");
      const out: [string, string][] = [["MD5", md5(bytes)]];
      for (const alg of ["SHA-1", "SHA-256", "SHA-384", "SHA-512"]) out.push([alg, hex(await crypto.subtle.digest(alg, bytes as BufferSource))]);
      if (alive) { setHashes(out); setBusy(false); }
    })();
    return () => { alive = false; };
  }, [mode, text, file]);
  const cmp = compare.trim().toLowerCase();
  const match = cmp && hashes.find(([, h]) => h === cmp);
  return (
    <div className="stack">
      <Seg label="Input" value={mode} onChange={setMode} options={[{ value: "text", label: "Text" }, { value: "file", label: "File" }]} />
      {mode === "text" ? (
        <textarea className="textarea" style={{ minHeight: 110 }} value={text} onChange={(e) => setText(e.target.value)} aria-label="Text to hash" />
      ) : (
        <div className="row">
          <button className="btn btn-secondary" onClick={() => fileRef.current?.click()}><Icon name="upload" size={16} /> {file ? "Choose another file" : "Choose a file"}</button>
          {file && <span className="muted">{file.name} · {formatBytes(file.size)}</span>}
          <input ref={fileRef} type="file" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f && f.size <= 500 * 1024 * 1024) setFile(f); e.target.value = ""; }} />
        </div>
      )}
      {busy && <p className="muted">Hashing…</p>}
      <div className="table-wrap">
        <table>
          <tbody>
            {hashes.map(([alg, h]) => (
              <tr key={alg} style={match && match[0] === alg ? { background: "var(--ok-soft)" } : undefined}>
                <th style={{ width: 90 }}>{alg}</th>
                <td style={{ whiteSpace: "normal", wordBreak: "break-all", fontFamily: "var(--mono)", fontSize: "0.84rem" }} data-testid={"hash-" + alg}>{h}</td>
                <td style={{ width: 60 }}><CopyButton text={h} label="" className="btn btn-ghost btn-sm btn-icon" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Field label="Compare with an expected hash (optional)" htmlFor="hc">
        <input id="hc" className="input mono" value={compare} onChange={(e) => setCompare(e.target.value)} placeholder="Paste checksum" />
      </Field>
      {cmp && (match ? <Alert kind="ok"><b>Match!</b> The {match[0]} hash is identical.</Alert> : <Alert kind="err"><b>No match.</b> The file or text differs, or the checksum uses another algorithm.</Alert>)}
    </div>
  );
}

// ── Business data ──
export function CsvToJson({ tool }: ToolProps) {
  const [text, setText] = useDraft(tool.id, "name,city,pincode,amount\nAsha Patel,Surat,395007,1250.50\n\"Mehta, Ravi\",Ahmedabad,380015,980\nNeha Shah,Vadodara,390001,2100");
  const [header, setHeader] = useState(true);
  const [numbers, setNumbers] = useState(true);
  const [delim, setDelim] = useState("auto");
  const [pretty, setPretty] = useState(true);
  let out = "", err = "", rows = 0;
  try {
    const arr = csvToObjects(text, { header, numbers, delimiter: delim === "auto" ? undefined : delim === "tab" ? "\t" : delim });
    rows = arr.length;
    out = JSON.stringify(arr, null, pretty ? 2 : undefined);
  } catch (e: any) { err = e.message; }
  const detected = detectDelimiter(text);
  return (
    <div className="stack">
      <div className="row between"><span className="label">CSV data</span><LoadFile onText={(t) => setText(t)} accept=".csv,.tsv,.txt,text/csv" /></div>
      <textarea className="textarea code" value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} aria-label="CSV input" />
      <div className="row">
        <label className="check"><input type="checkbox" checked={header} onChange={(e) => setHeader(e.target.checked)} /> First row is header</label>
        <label className="check"><input type="checkbox" checked={numbers} onChange={(e) => setNumbers(e.target.checked)} /> Detect numbers</label>
        <label className="check"><input type="checkbox" checked={pretty} onChange={(e) => setPretty(e.target.checked)} /> Pretty print</label>
        <select className="select" style={{ width: 200 }} value={delim} onChange={(e) => setDelim(e.target.value)} aria-label="Delimiter">
          <option value="auto">Auto ({detected === "\t" ? "tab" : detected})</option><option value=",">Comma</option><option value=";">Semicolon</option><option value="tab">Tab</option><option value="|">Pipe</option>
        </select>
      </div>
      {err ? <Alert kind="err">{err}</Alert> : text.trim() && <Output text={out} name="data.json" mime="application/json" toolId={tool.id} label={`JSON · ${rows} rows`} />}
    </div>
  );
}

export function JsonToCsv({ tool }: ToolProps) {
  const [text, setText] = useDraft(tool.id, `[\n  {"id": 1, "name": "Asha", "address": {"city": "Surat", "pin": "395007"}, "tags": ["new"]},\n  {"id": 2, "name": "Ravi", "address": {"city": "Ahmedabad", "pin": "380015"}, "active": true}\n]`);
  const [delim, setDelim] = useState(",");
  const r = useMemo(() => parseJson(text), [text]);
  const res = r.ok ? jsonToCsv(r.value, delim === "tab" ? "\t" : delim) : null;
  return (
    <div className="stack">
      <div className="row between"><span className="label">JSON array</span><LoadFile onText={(t) => setText(t)} /></div>
      <textarea className="textarea code" value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} aria-label="JSON input" />
      <div className="row"><span className="label">Delimiter</span><Seg label="Delimiter" value={delim} onChange={setDelim} options={[{ value: ",", label: "Comma" }, { value: ";", label: "Semicolon" }, { value: "tab", label: "Tab" }]} /></div>
      {!text.trim() ? null : !r.ok ? <JsonError r={r} /> : (
        <>
          <div className="table-wrap" style={{ maxHeight: 280, overflow: "auto" }}>
            <table>
              <thead><tr>{res!.columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
              <tbody>{(Array.isArray(r.value) ? r.value : [r.value]).slice(0, 20).map((row: any, i: number) => {
                const flat = JSON.parse(JSON.stringify(row));
                const get = (o: any, path: string) => path.split(".").reduce((a, k) => (a == null ? a : a[k]), o);
                return <tr key={i}>{res!.columns.map((c) => { const v = get(flat, c); return <td key={c}>{v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v)}</td>; })}</tr>;
              })}</tbody>
            </table>
          </div>
          <Output text={res!.csv} name="data.csv" mime="text/csv" toolId={tool.id} label={`CSV · ${res!.rows} rows × ${res!.columns.length} columns`} />
        </>
      )}
    </div>
  );
}
