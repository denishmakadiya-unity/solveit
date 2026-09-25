import { useEffect, useMemo, useState } from "react";
import { Alert, Field, NumberInput, Seg } from "../components/ui";
import { inr, num } from "../lib/format";
import { track } from "../lib/analytics";
import type { ToolProps } from "./common";

const n = (v: string) => (v.trim() === "" ? NaN : Number(v));

function useCalcTrack(toolId: string, deps: any[]) {
  const [first, setFirst] = useState(true);
  useEffect(() => {
    if (first) { setFirst(false); return; }
    const t = setTimeout(() => track("tool_success", { tool: toolId }), 1500);
    return () => clearTimeout(t);
  }, deps);
}

function Stat({ k, v, s, hero, testid }: { k: string; v: string; s?: string; hero?: boolean; testid?: string }) {
  return <div className={"stat" + (hero ? " hero-stat" : "")}><div className="k">{k}</div><div className="v" data-testid={testid}>{v}</div>{s && <div className="s">{s}</div>}</div>;
}

// ── Percentage ──
export function PercentageCalculator({ tool }: ToolProps) {
  const [a, setA] = useState("18");
  const [b, setB] = useState("2500");
  const [c, setC] = useState("450");
  const [d, setD] = useState("1800");
  const [e1, setE1] = useState("1200");
  const [e2, setE2] = useState("1500");
  useCalcTrack(tool.id, [a, b, c, d, e1, e2]);
  const r1 = (n(a) / 100) * n(b), r2 = (n(c) / n(d)) * 100, r3 = ((n(e2) - n(e1)) / n(e1)) * 100;
  return (
    <div className="stack">
      <div className="card flat">
        <h3 style={{ marginBottom: 12 }}>What is X% of Y?</h3>
        <div className="form-grid">
          <Field label="Percentage" htmlFor="pa"><NumberInput id="pa" value={a} onChange={setA} suffix="%" /></Field>
          <Field label="Of value" htmlFor="pb"><NumberInput id="pb" value={b} onChange={setB} /></Field>
          <Stat k="Answer" v={num(r1, 4)} hero testid="pct1" s={`${a}% × ${b} ÷ 100`} />
        </div>
      </div>
      <div className="card flat">
        <h3 style={{ marginBottom: 12 }}>X is what percent of Y?</h3>
        <div className="form-grid">
          <Field label="Value X" htmlFor="pc"><NumberInput id="pc" value={c} onChange={setC} /></Field>
          <Field label="Total Y" htmlFor="pd"><NumberInput id="pd" value={d} onChange={setD} /></Field>
          <Stat k="Answer" v={isFinite(r2) ? num(r2, 4) + "%" : "—"} hero s={`${c} ÷ ${d} × 100`} />
        </div>
      </div>
      <div className="card flat">
        <h3 style={{ marginBottom: 12 }}>Percentage increase or decrease</h3>
        <div className="form-grid">
          <Field label="From" htmlFor="pe1"><NumberInput id="pe1" value={e1} onChange={setE1} /></Field>
          <Field label="To" htmlFor="pe2"><NumberInput id="pe2" value={e2} onChange={setE2} /></Field>
          <Stat k={r3 >= 0 ? "Increase" : "Decrease"} v={isFinite(r3) ? num(Math.abs(r3), 4) + "%" : "—"} hero s="(New − Old) ÷ Old × 100" />
        </div>
      </div>
    </div>
  );
}

// ── Age ──
function ageBetween(dob: Date, on: Date) {
  let y = on.getFullYear() - dob.getFullYear(), m = on.getMonth() - dob.getMonth(), d = on.getDate() - dob.getDate();
  if (d < 0) { m--; d += new Date(on.getFullYear(), on.getMonth(), 0).getDate(); }
  if (m < 0) { y--; m += 12; }
  return { y, m, d };
}
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function AgeCalculator({ tool }: ToolProps) {
  const [dob, setDob] = useState("2000-08-15");
  const [on, setOn] = useState("");
  useEffect(() => setOn(iso(new Date())), []);
  useCalcTrack(tool.id, [dob]);
  const D = new Date(dob + "T00:00:00"), O = new Date((on || "2000-01-01") + "T00:00:00");
  const valid = !!on && !isNaN(+D) && !isNaN(+O) && D <= O;
  const a = valid ? ageBetween(D, O) : null;
  const days = valid ? Math.round((+O - +D) / 864e5) : 0;
  let next = new Date(O.getFullYear(), D.getMonth(), D.getDate());
  if (next < O) next = new Date(O.getFullYear() + 1, D.getMonth(), D.getDate());
  const toNext = Math.round((+next - +O) / 864e5);
  const weekday = valid ? D.toLocaleDateString("en-IN", { weekday: "long" }) : "";
  return (
    <div className="stack">
      <div className="form-grid">
        <Field label="Date of birth" htmlFor="dob"><input id="dob" type="date" className="input" value={dob} max={on} onChange={(e) => setDob(e.target.value)} /></Field>
        <Field label="Age on" htmlFor="on" hint="Change this for exam cut-off dates"><input id="on" type="date" className="input" value={on} onChange={(e) => setOn(e.target.value)} /></Field>
      </div>
      {!on ? null : !valid ? <Alert kind="warn">Enter a date of birth that is on or before the “Age on” date.</Alert> : (
        <div className="stat-grid">
          <Stat hero k="Age" v={`${a!.y} years`} s={`${a!.m} months, ${a!.d} days`} testid="age" />
          <Stat k="Total days" v={days.toLocaleString("en-IN")} s={`${Math.floor(days / 7).toLocaleString("en-IN")} weeks`} />
          <Stat k="Total months" v={(a!.y * 12 + a!.m).toLocaleString("en-IN")} />
          <Stat k="Next birthday" v={toNext === 0 ? "Today" : `${toNext} days`} s={next.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} />
          <Stat k="Born on a" v={weekday} />
        </div>
      )}
    </div>
  );
}

// ── EMI ──
export function EmiCalculator({ tool }: ToolProps) {
  const [p, setP] = useState("1000000");
  const [rate, setRate] = useState("8.5");
  const [years, setYears] = useState("20");
  const [unit, setUnit] = useState<"years" | "months">("years");
  useCalcTrack(tool.id, [p, rate, years, unit]);
  const P = n(p), R = n(rate) / 1200, N = Math.round(unit === "years" ? n(years) * 12 : n(years));
  const valid = P > 0 && N > 0 && n(rate) >= 0 && N <= 600;
  const emi = !valid ? NaN : R === 0 ? P / N : (P * R * Math.pow(1 + R, N)) / (Math.pow(1 + R, N) - 1);
  const total = emi * N, interest = total - P;
  const schedule = useMemo(() => {
    if (!valid) return [];
    const rows: { year: number; principal: number; interest: number; balance: number }[] = [];
    let bal = P;
    for (let m = 1; m <= N; m++) {
      const i = bal * R, pr = emi - i;
      bal = Math.max(0, bal - pr);
      const y = Math.ceil(m / 12);
      if (!rows[y - 1]) rows[y - 1] = { year: y, principal: 0, interest: 0, balance: 0 };
      rows[y - 1].principal += pr; rows[y - 1].interest += i; rows[y - 1].balance = bal;
    }
    return rows;
  }, [P, R, N, emi, valid]);
  return (
    <div className="stack">
      <div className="form-grid">
        <Field label="Loan amount" htmlFor="lp"><NumberInput id="lp" value={p} onChange={setP} prefix="₹" min={0} /></Field>
        <Field label="Interest rate (per year)" htmlFor="lr"><NumberInput id="lr" value={rate} onChange={setRate} suffix="%" step={0.05} min={0} /></Field>
        <Field label="Tenure" htmlFor="ly">
          <div className="row" style={{ gap: 8, flexWrap: "nowrap" }}>
            <NumberInput id="ly" value={years} onChange={setYears} min={1} />
            <select className="select" style={{ width: 120 }} value={unit} onChange={(e) => setUnit(e.target.value as any)} aria-label="Tenure unit"><option value="years">Years</option><option value="months">Months</option></select>
          </div>
        </Field>
      </div>
      <input type="range" aria-label="Loan amount slider" min={50000} max={20000000} step={50000} value={isFinite(P) ? P : 0} onChange={(e) => setP(e.target.value)} />
      {!valid ? <Alert kind="warn">Enter a loan amount, an interest rate of 0% or more and a tenure up to 50 years.</Alert> : (
        <>
          <div className="stat-grid">
            <Stat hero k="Monthly EMI" v={inr(emi)} testid="emi" />
            <Stat k="Total interest" v={inr(interest)} />
            <Stat k="Total payment" v={inr(total)} s={`${N} monthly payments`} />
          </div>
          <div>
            <div className="bar" role="img" aria-label={`Principal ${num((P / total) * 100, 1)}%, interest ${num((interest / total) * 100, 1)}%`}><i style={{ width: `${(P / total) * 100}%` }} /></div>
            <div className="legend"><span style={{ ["--c" as any]: "var(--brand)" }}>Principal {num((P / total) * 100, 1)}%</span><span style={{ ["--c" as any]: "var(--sun)" }}>Interest {num((interest / total) * 100, 1)}%</span></div>
          </div>
          <details className="card flat" open={schedule.length <= 10}>
            <summary style={{ cursor: "pointer", fontWeight: 650 }}>Year-by-year schedule</summary>
            <div className="table-wrap" style={{ marginTop: 12 }}>
              <table>
                <thead><tr><th>Year</th><th className="num">Principal paid</th><th className="num">Interest paid</th><th className="num">Balance</th></tr></thead>
                <tbody>{schedule.map((r) => <tr key={r.year}><td>{r.year}</td><td className="num">{inr(r.principal)}</td><td className="num">{inr(r.interest)}</td><td className="num">{inr(r.balance)}</td></tr>)}</tbody>
              </table>
            </div>
          </details>
          <p className="hint">Estimates only. Your lender's figures may differ slightly due to rounding, fees and the exact disbursement date.</p>
        </>
      )}
    </div>
  );
}

// ── GST ──
export function GstCalculator({ tool }: ToolProps) {
  const [amt, setAmt] = useState("10000");
  const [rate, setRate] = useState("18");
  const [mode, setMode] = useState<"add" | "remove">("add");
  const [supply, setSupply] = useState<"intra" | "inter">("intra");
  useCalcTrack(tool.id, [amt, rate, mode]);
  const A = n(amt), Rt = n(rate);
  const base = mode === "add" ? A : (A * 100) / (100 + Rt);
  const gst = mode === "add" ? (A * Rt) / 100 : A - base;
  return (
    <div className="stack">
      <div className="row" style={{ gap: 16 }}>
        <Seg label="Mode" value={mode} onChange={setMode} options={[{ value: "add", label: "Add GST (exclusive)" }, { value: "remove", label: "Remove GST (inclusive)" }]} />
        <Seg label="Supply" value={supply} onChange={setSupply} options={[{ value: "intra", label: "Same state" }, { value: "inter", label: "Other state" }]} />
      </div>
      <div className="form-grid">
        <Field label={mode === "add" ? "Amount before GST" : "Amount including GST"} htmlFor="ga"><NumberInput id="ga" value={amt} onChange={setAmt} prefix="₹" min={0} /></Field>
        <Field label="GST rate">
          <div className="chips">{["0.25", "3", "5", "12", "18", "28", "40"].map((r) => <button key={r} type="button" className="chip" aria-pressed={rate === r} onClick={() => setRate(r)}>{r}%</button>)}</div>
        </Field>
      </div>
      {!(A >= 0) ? <Alert kind="warn">Enter an amount.</Alert> : (
        <div className="stat-grid">
          <Stat hero k={mode === "add" ? "Total with GST" : "Price without GST"} v={inr(mode === "add" ? A + gst : base, 2)} testid="gst-main" />
          <Stat k="GST amount" v={inr(gst, 2)} />
          <Stat k="Base price" v={inr(base, 2)} />
          {supply === "intra"
            ? <Stat k="CGST + SGST" v={`${inr(gst / 2, 2)} + ${inr(gst / 2, 2)}`} s={`${Rt / 2}% each`} />
            : <Stat k="IGST" v={inr(gst, 2)} s={`${Rt}%`} />}
        </div>
      )}
      <p className="hint">Common rates are shown; check the current rate for your item's HSN/SAC code on the GST portal.</p>
    </div>
  );
}

// ── Discount ──
export function DiscountCalculator({ tool }: ToolProps) {
  const [price, setPrice] = useState("2499");
  const [d1, setD1] = useState("40");
  const [d2, setD2] = useState("10");
  const [flat, setFlat] = useState("0");
  useCalcTrack(tool.id, [price, d1, d2, flat]);
  const P = n(price);
  const after1 = P * (1 - (n(d1) || 0) / 100), after2 = after1 * (1 - (n(d2) || 0) / 100), final = Math.max(0, after2 - (n(flat) || 0));
  return (
    <div className="stack">
      <div className="form-grid">
        <Field label="Original price (MRP)" htmlFor="dp"><NumberInput id="dp" value={price} onChange={setPrice} prefix="₹" min={0} /></Field>
        <Field label="Discount" htmlFor="dd1"><NumberInput id="dd1" value={d1} onChange={setD1} suffix="%" min={0} max={100} /></Field>
        <Field label="Extra discount" htmlFor="dd2" hint="Coupon or bank offer on top"><NumberInput id="dd2" value={d2} onChange={setD2} suffix="%" min={0} max={100} /></Field>
        <Field label="Flat cashback" htmlFor="df"><NumberInput id="df" value={flat} onChange={setFlat} prefix="₹" min={0} /></Field>
      </div>
      {!(P > 0) ? <Alert kind="warn">Enter the original price.</Alert> : (
        <div className="stat-grid">
          <Stat hero k="You pay" v={inr(final, 2)} testid="disc" />
          <Stat k="You save" v={inr(P - final, 2)} />
          <Stat k="Effective discount" v={num(((P - final) / P) * 100, 2) + "%"} s={n(d2) ? `Not ${num((n(d1) || 0) + (n(d2) || 0))}% — discounts stack` : undefined} />
        </div>
      )}
    </div>
  );
}

// ── Unit converter ──
type UnitSet = Record<string, number>;
const UNITS: Record<string, { units: UnitSet; note?: string }> = {
  Length: { units: { Millimeter: 0.001, Centimeter: 0.01, Meter: 1, Kilometer: 1000, Inch: 0.0254, Foot: 0.3048, Yard: 0.9144, Mile: 1609.344 } },
  Weight: { units: { Milligram: 1e-6, Gram: 0.001, Kilogram: 1, Quintal: 100, Tonne: 1000, Ounce: 0.028349523125, Pound: 0.45359237, "Tola (11.66 g)": 0.0116638 } },
  Temperature: { units: { Celsius: 0, Fahrenheit: 0, Kelvin: 0 } },
  Area: { units: { "Square meter": 1, "Square foot": 0.09290304, "Square yard / Gaj": 0.83612736, Acre: 4046.8564224, Hectare: 10000, "Square kilometer": 1e6, "Bigha (27,225 sq ft)": 2529.285264, Guntha: 101.17141056 }, note: "Bigha and some local units vary by state. Guntha = 1,089 sq ft." },
  Volume: { units: { Milliliter: 0.001, Liter: 1, "Cubic meter": 1000, Teaspoon: 0.00492892, Tablespoon: 0.0147868, Cup: 0.24, "Gallon (US)": 3.785411784, "Gallon (UK)": 4.54609 } },
  Speed: { units: { "Meters/second": 1, "Km/hour": 1 / 3.6, "Miles/hour": 0.44704, Knot: 0.514444 } },
  Data: { units: { Byte: 1, Kilobyte: 1024, Megabyte: 1024 ** 2, Gigabyte: 1024 ** 3, Terabyte: 1024 ** 4, Bit: 1 / 8, Megabit: 1024 ** 2 / 8 } },
  Time: { units: { Second: 1, Minute: 60, Hour: 3600, Day: 86400, Week: 604800, "Month (30.44 d)": 2629746, "Year (365.25 d)": 31557600 } },
};

function convertTemp(v: number, from: string, to: string) {
  const c = from === "Celsius" ? v : from === "Fahrenheit" ? ((v - 32) * 5) / 9 : v - 273.15;
  return to === "Celsius" ? c : to === "Fahrenheit" ? (c * 9) / 5 + 32 : c + 273.15;
}

export function UnitConverter({ tool }: ToolProps) {
  const [type, setType] = useState("Length");
  const units = Object.keys(UNITS[type].units);
  const [from, setFrom] = useState("Centimeter");
  const [to, setTo] = useState("Inch");
  const [val, setVal] = useState("100");
  useCalcTrack(tool.id, [type, from, to, val]);
  const changeType = (t: string) => { setType(t); const u = Object.keys(UNITS[t].units); setFrom(u[0]); setTo(u[1]); };
  const conv = (v: number, a: string, b: string) => (type === "Temperature" ? convertTemp(v, a, b) : (v * UNITS[type].units[a]) / UNITS[type].units[b]);
  const V = n(val);
  const out = conv(V, from, to);
  return (
    <div className="stack">
      <div className="chips">{Object.keys(UNITS).map((t) => <button key={t} type="button" className="chip" aria-pressed={type === t} onClick={() => changeType(t)}>{t}</button>)}</div>
      <div className="form-grid">
        <Field label="Value" htmlFor="uv"><NumberInput id="uv" value={val} onChange={setVal} /></Field>
        <Field label="From" htmlFor="uf"><select id="uf" className="select" value={from} onChange={(e) => setFrom(e.target.value)}>{units.map((u) => <option key={u}>{u}</option>)}</select></Field>
        <Field label="To" htmlFor="ut"><select id="ut" className="select" value={to} onChange={(e) => setTo(e.target.value)}>{units.map((u) => <option key={u}>{u}</option>)}</select></Field>
      </div>
      <div className="row"><button className="btn btn-ghost btn-sm" onClick={() => { setFrom(to); setTo(from); }}>Swap units</button></div>
      {isFinite(V) ? (
        <>
          <Stat hero k={`${num(V, 6)} ${from} =`} v={`${num(out, 6)} ${to}`} testid="unit" />
          <div className="table-wrap">
            <table><tbody>{units.filter((u) => u !== from).map((u) => <tr key={u}><td>{u}</td><td className="num">{num(conv(V, from, u), 6)}</td></tr>)}</tbody></table>
          </div>
        </>
      ) : <Alert kind="warn">Enter a number to convert.</Alert>}
      {UNITS[type].note && <p className="hint">{UNITS[type].note}</p>}
    </div>
  );
}

// ── Profit margin ──
export function ProfitMarginCalculator({ tool }: ToolProps) {
  const [mode, setMode] = useState<"price" | "target">("price");
  const [cost, setCost] = useState("650");
  const [price, setPrice] = useState("999");
  const [target, setTarget] = useState("35");
  useCalcTrack(tool.id, [mode, cost, price, target]);
  const C = n(cost);
  const S = mode === "price" ? n(price) : C / (1 - n(target) / 100);
  const profit = S - C, margin = (profit / S) * 100, markup = (profit / C) * 100;
  const valid = C >= 0 && S > 0 && (mode === "price" || n(target) < 100);
  return (
    <div className="stack">
      <Seg label="Mode" value={mode} onChange={setMode} options={[{ value: "price", label: "I know cost & price" }, { value: "target", label: "Find price for a margin" }]} />
      <div className="form-grid">
        <Field label="Cost price" htmlFor="mc"><NumberInput id="mc" value={cost} onChange={setCost} prefix="₹" min={0} /></Field>
        {mode === "price"
          ? <Field label="Selling price" htmlFor="ms"><NumberInput id="ms" value={price} onChange={setPrice} prefix="₹" min={0} /></Field>
          : <Field label="Target margin" htmlFor="mt"><NumberInput id="mt" value={target} onChange={setTarget} suffix="%" min={0} max={99} /></Field>}
      </div>
      {!valid ? <Alert kind="warn">Enter valid numbers. A margin must be below 100%.</Alert> : (
        <div className="stat-grid">
          {mode === "target" && <Stat hero k="Selling price" v={inr(S, 2)} testid="margin-price" />}
          <Stat hero={mode === "price"} k="Gross margin" v={num(margin, 2) + "%"} testid="margin" />
          <Stat k="Markup" v={num(markup, 2) + "%"} />
          <Stat k="Profit per unit" v={inr(profit, 2)} />
        </div>
      )}
      {valid && profit < 0 && <Alert kind="err">You're selling below cost — a loss of {inr(-profit, 2)} per unit.</Alert>}
    </div>
  );
}

// ── ROI ──
export function RoiCalculator({ tool }: ToolProps) {
  const [inv, setInv] = useState("100000");
  const [fin, setFin] = useState("165000");
  const [yrs, setYrs] = useState("4");
  useCalcTrack(tool.id, [inv, fin, yrs]);
  const I = n(inv), F = n(fin), Y = n(yrs);
  const roi = ((F - I) / I) * 100, cagr = (Math.pow(F / I, 1 / Y) - 1) * 100;
  const valid = I > 0 && F >= 0;
  return (
    <div className="stack">
      <div className="form-grid">
        <Field label="Amount invested" htmlFor="ri"><NumberInput id="ri" value={inv} onChange={setInv} prefix="₹" min={0} /></Field>
        <Field label="Final value" htmlFor="rf"><NumberInput id="rf" value={fin} onChange={setFin} prefix="₹" min={0} /></Field>
        <Field label="Duration" htmlFor="ry"><NumberInput id="ry" value={yrs} onChange={setYrs} suffix="years" min={0} step={0.5} /></Field>
      </div>
      {!valid ? <Alert kind="warn">Enter the amount invested and the final value.</Alert> : (
        <div className="stat-grid">
          <Stat hero k="Total ROI" v={num(roi, 2) + "%"} testid="roi" />
          <Stat k="Net gain" v={inr(F - I)} />
          <Stat k="Annualized (CAGR)" v={Y > 0 && isFinite(cagr) ? num(cagr, 2) + "%" : "—"} s={Y > 0 ? `over ${Y} year${Y === 1 ? "" : "s"}` : "Enter a duration"} />
        </div>
      )}
    </div>
  );
}
