import React, { useState, useMemo, useEffect } from "react";

// --- Helpers ---
const fmtCurrency = (n) =>
  n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const fmtNumber = (n, d = 2) => (isFinite(n) ? Number(n).toFixed(d) : "-");

function monthlyPI(loanAmount, apr, years) {
  const r = (apr / 100) / 12;
  const n = years * 12;
  if (r === 0) return loanAmount / n;
  return loanAmount * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

function convPmiAnnualRate(ltv) {
  if (ltv <= 0.80) return 0;
  if (ltv <= 0.85) return 0.004;
  if (ltv <= 0.90) return 0.0075;
  if (ltv <= 0.95) return 0.011;
  return 0.013;
}

function fhaMipAnnualRate() {
  return 0.0055;
}

function vaFundingFeeRate(downPct) {
  if (downPct >= 10) return 0.0125;
  if (downPct >= 5) return 0.015;
  return 0.0215;
}

function CurrencyInput({ value, onChange, placeholder }) {
  const [focused, setFocused] = useState(false);
  const [display, setDisplay] = useState("");

  useEffect(() => {
    if (!focused) {
      setDisplay(value ? fmtCurrency(value) : "");
    }
  }, [value, focused]);

  const handleFocus = (e) => {
    setFocused(true);
    setDisplay(value ? String(Math.round(value)) : "");
    requestAnimationFrame(() => {
      try { e.target.select(); } catch {}
    });
  };

  const handleChange = (e) => {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    setDisplay(raw);
    const num = raw === "" ? 0 : Number(raw);
    onChange(num);
  };

  const handleBlur = () => {
    setFocused(false);
    setDisplay(value ? fmtCurrency(value) : "");
  };

  return (
    <input
      type="text"
      value={display}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
      inputMode="numeric"
    />
  );
}

export default function MonthlyPaymentCalculator(){
  const [price, setPrice] = useState(500000);
  const [downModePct, setDownModePct] = useState(false);
  const [downInput, setDownInput] = useState(50000);
  const [rate, setRate] = useState(6.75);
  const [years, setYears] = useState(30);
  const [program, setProgram] = useState("Conventional");
  const [taxModePct, setTaxModePct] = useState(true);
  const [taxInput, setTaxInput] = useState(0.60);
  const [insYr, setInsYr] = useState(1200);
  const [hoa, setHoa] = useState(0);

  const downDollar = useMemo(() => (downModePct ? (price * (Number(downInput) / 100)) : Number(downInput) || 0), [downModePct, downInput, price]);
  const downPct = useMemo(() => (price > 0 ? (downDollar / price) * 100 : 0), [downDollar, price]);

  const baseLoan = Math.max(price - downDollar, 0);

  const { financedFee, miMonthly } = useMemo(() => {
    if (program === "Conventional") {
      const ltv = price > 0 ? baseLoan / price : 0;
      const annual = convPmiAnnualRate(ltv);
      const mi = (annual * baseLoan) / 12;
      return { financedFee: 0, miMonthly: mi };
    }
    if (program === "FHA") {
      const ufmip = 0.0175 * baseLoan;
      const annual = fhaMipAnnualRate();
      const mi = (annual * baseLoan) / 12;
      return { financedFee: ufmip, miMonthly: mi };
    }
    if (program === "VA") {
      const ff = vaFundingFeeRate(downPct) * baseLoan;
      return { financedFee: ff, miMonthly: 0 };
    }
    return { financedFee: 0, miMonthly: 0 };
  }, [program, baseLoan, downPct, price]);

  const loanAmount = baseLoan + financedFee;
  const pi = monthlyPI(loanAmount, rate, years);
  const monthlyTax = taxModePct ? ((price * (Number(taxInput) / 100)) / 12) : ((Number(taxInput) || 0) / 12);
  const monthlyIns = (Number(insYr) || 0) / 12;
  const total = pi + miMonthly + monthlyTax + monthlyIns + (Number(hoa) || 0);

  const ltvDisplay = price > 0 ? (loanAmount / price) * 100 : 0;

  const copySummary = async () => {
    const summary = [
      `Program: ${program}`,
      `Price: ${fmtCurrency(price)} | Down: ${fmtCurrency(downDollar)} (${fmtNumber(downPct, 1)}%)`,
      `Loan: ${fmtCurrency(loanAmount)} | Rate: ${fmtNumber(rate, 3)}% | Term: ${years}y`,
      `P&I: ${fmtCurrency(pi)} | MI/MIP: ${fmtCurrency(miMonthly)}`,
      `Taxes: ${fmtCurrency(monthlyTax)} | Ins: ${fmtCurrency(monthlyIns)} | HOA: ${fmtCurrency(Number(hoa) || 0)}`,
      `EST. Total Monthly: ${fmtCurrency(total)}`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(summary);
    } catch (e) {
      console.error(e);
      alert("Couldn't copy to clipboard. You can select the text on screen instead.");
    }
  };

  return (
    <>
      <div className="card" style={{marginBottom:16}}>
        <div className="h1" style={{fontSize:24}}>Agent-Friendly Monthly Payment Estimator</div>
        <div className="subtle" style={{marginTop:6}}>Quick, approximate numbers for conversations — not a loan estimate.</div>
      </div>
      <section className="grid">
        <div className="card">
          <div className="grid" style={{gridTemplateColumns:'1fr 1fr', gap:12}}>
            <div>
              <label>Purchase Price</label>
              <CurrencyInput value={price} onChange={setPrice} placeholder="$" />
            </div>
            <div>
              <label>Program</label>
              <select value={program} onChange={(e)=>setProgram(e.target.value)}>
                <option value="Conventional">Conventional</option>
                <option value="FHA">FHA</option>
                <option value="VA">VA</option>
              </select>
            </div>
            <div>
              <label>Down Payment ({downModePct ? "%" : "$"})</label>
              {downModePct ? (
                <input type="number" value={downInput} onChange={(e)=>setDownInput(Number(e.target.value || 0))} />
              ) : (
                <CurrencyInput value={Number(downInput)||0} onChange={(v)=>setDownInput(v)} placeholder="$" />
              )}
              <div className="row" style={{marginTop:6}}>
                <span className="small">Use %</span>
                <input type="checkbox" checked={downModePct} onChange={(e)=>setDownModePct(e.target.checked)} />
              </div>
              <div className="small">= {fmtCurrency(downDollar)} ({fmtNumber(downPct,1)}%)</div>
            </div>
            <div>
              <label>Interest Rate (APR)</label>
              <input type="number" step="0.001" value={rate} onChange={(e)=>setRate(Number(e.target.value || 0))} />
              <div className="row" style={{marginTop:6}}>
                {[6.5,6.75,7.0].map((r)=>(
                  <button key={r} className="btn" style={{padding:'6px 8px'}} onClick={()=>setRate(r)}>{r}%</button>
                ))}
              </div>
            </div>
            <div>
              <label>Term (years)</label>
              <select value={String(years)} onChange={(e)=>setYears(Number(e.target.value))}>
                <option value="30">30</option>
                <option value="20">20</option>
                <option value="15">15</option>
              </select>
            </div>
            <div>
              <label>Property Taxes ({taxModePct ? "% of price" : "$ / year"})</label>
              <input type="number" step={taxModePct ? 0.01 : 50} value={taxInput} onChange={(e)=>setTaxInput(e.target.value)} />
              <div className="row" style={{marginTop:6}}>
                <span className="small">Use %</span>
                <input type="checkbox" checked={taxModePct} onChange={(e)=>setTaxModePct(e.target.checked)} />
              </div>
              <div className="small">≈ {fmtCurrency(monthlyTax)} / mo</div>
            </div>
            <div>
              <label>Homeowners Insurance ($ / year)</label>
              <input type="number" value={insYr} onChange={(e)=>setInsYr(Number(e.target.value || 0))} />
              <div className="small">≈ {fmtCurrency(monthlyIns)} / mo</div>
            </div>
            <div>
              <label>HOA Dues ($ / month)</label>
              <input type="number" value={hoa} onChange={(e)=>setHoa(Number(e.target.value || 0))} />
            </div>
          </div>
        </div>
      </section>

      <section className="grid" style={{marginTop:16}}>
        <div className="card">
          <div className="grid" style={{gridTemplateColumns:'1fr 1fr 1fr', gap:12}}>
            <div>
              <div className="small">Loan Amount</div>
              <div className="h1" style={{fontSize:24}}>{fmtCurrency(loanAmount)}</div>
              <div className="small">LTV ~ {fmtNumber(ltvDisplay,1)}%</div>
            </div>
            <div>
              <div className="small">Principal & Interest</div>
              <div className="h1" style={{fontSize:24}}>{fmtCurrency(pi)}</div>
              <div className="small">Rate {fmtNumber(rate,3)}% | {years} years</div>
            </div>
            <div>
              <div className="small">MI/MIP (if any)</div>
              <div className="h1" style={{fontSize:24}}>{fmtCurrency(miMonthly)}</div>
              <div className="small">Program: {program}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid" style={{marginTop:16}}>
        <div className="card">
          <div className="grid" style={{gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:12}}>
            <div>
              <div className="small">Taxes</div>
              <div className="h1" style={{fontSize:20}}>{fmtCurrency(monthlyTax)}</div>
            </div>
            <div>
              <div className="small">Insurance</div>
              <div className="h1" style={{fontSize:20}}>{fmtCurrency(monthlyIns)}</div>
            </div>
            <div>
              <div className="small">HOA</div>
              <div className="h1" style={{fontSize:20}}>{fmtCurrency(Number(hoa) || 0)}</div>
            </div>
            <div>
              <div className="small">Est. Total Monthly</div>
              <div className="h1" style={{fontSize:28}}>{fmtCurrency(total)}</div>
            </div>
          </div>
        </div>
      </section>

      <div className="row" style={{marginTop:16, flexWrap:'wrap', gap:12}}>
        <button className="btn" onClick={copySummary}>Copy summary</button>
        <div className="small">
          Disclaimers: Estimates only. Taxes/insurance/HOA vary. Conventional PMI, FHA MIP, and VA funding fees here are simplified. For formal quotes, ask the lender.
        </div>
      </div>
    </>
  );
}
