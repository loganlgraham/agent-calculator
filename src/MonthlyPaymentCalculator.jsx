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

function NumberInput({ value, onChange, placeholder, decimals = 2 }) {
  const [focused, setFocused] = useState(false);
  const [display, setDisplay] = useState("");

  useEffect(() => {
    if (!focused) {
      setDisplay(value === 0 || value ? fmtNumber(value, decimals) : "");
    }
  }, [value, focused, decimals]);

  const handleFocus = (e) => {
    setFocused(true);
    setDisplay(value === 0 || value ? String(value) : "");
    requestAnimationFrame(() => {
      try {
        e.target.select();
      } catch {}
    });
  };

  const handleChange = (e) => {
    const raw = e.target.value.replace(/[^0-9.]/g, "");
    setDisplay(raw);
    const num = raw === "" ? 0 : Number(raw);
    onChange(num);
  };

  const handleBlur = () => {
    setFocused(false);
    setDisplay(value === 0 || value ? fmtNumber(value, decimals) : "");
  };

  return (
    <input
      type="text"
      value={display}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
      inputMode="decimal"
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

  const approxMonthlyTax = useMemo(() => taxModePct ? ((price * (Number(taxInput) / 100)) / 12) : ((Number(taxInput) || 0) / 12), [taxModePct, taxInput, price]);
  const approxMonthlyIns = useMemo(() => (Number(insYr) || 0) / 12, [insYr]);

  const [calc, setCalc] = useState({
    loanAmount: 0,
    pi: 0,
    miMonthly: 0,
    monthlyTax: 0,
    monthlyIns: 0,
    total: 0,
    ltvDisplay: 0,
  });

  const compute = () => {
    const baseLoan = Math.max(price - downDollar, 0);
    let financedFee = 0;
    let miMonthly = 0;
    if (program === "Conventional") {
      const ltv = price > 0 ? baseLoan / price : 0;
      const annual = convPmiAnnualRate(ltv);
      miMonthly = (annual * baseLoan) / 12;
    } else if (program === "FHA") {
      const ufmip = 0.0175 * baseLoan;
      financedFee = ufmip;
      const annual = fhaMipAnnualRate();
      miMonthly = (annual * baseLoan) / 12;
    } else if (program === "VA") {
      financedFee = vaFundingFeeRate(downPct) * baseLoan;
    }
    const loanAmount = baseLoan + financedFee;
    const pi = monthlyPI(loanAmount, rate, years);
    const monthlyTax = approxMonthlyTax;
    const monthlyIns = approxMonthlyIns;
    const total = pi + miMonthly + monthlyTax + monthlyIns + (Number(hoa) || 0);
    const ltvDisplay = price > 0 ? (loanAmount / price) * 100 : 0;
    return { loanAmount, pi, miMonthly, monthlyTax, monthlyIns, total, ltvDisplay };
  };

  const calculate = () => {
    setCalc(compute());
  };

  useEffect(() => {
    calculate();
  }, []);

  const copySummary = async () => {
    const c = compute();
    setCalc(c);
    const summary = [
      `Program: ${program}`,
      `Price: ${fmtCurrency(price)} | Down: ${fmtCurrency(downDollar)} (${fmtNumber(downPct, 1)}%)`,
      `Loan: ${fmtCurrency(c.loanAmount)} | Rate: ${fmtNumber(rate, 3)}% | Term: ${years}y`,
      `P&I: ${fmtCurrency(c.pi)} | MI/MIP: ${fmtCurrency(c.miMonthly)}`,
      `Taxes: ${fmtCurrency(c.monthlyTax)} | Ins: ${fmtCurrency(c.monthlyIns)} | HOA: ${fmtCurrency(Number(hoa) || 0)}`,
      `EST. Total Monthly: ${fmtCurrency(c.total)}`,
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
      <div className="card">
        <div className="form-grid">
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
                <NumberInput value={downInput} onChange={setDownInput} placeholder="%" decimals={2} />
              ) : (
                <CurrencyInput value={Number(downInput)||0} onChange={(v)=>setDownInput(v)} placeholder="$" />
              )}
              <div className="row" style={{marginTop:6}}>
                <button
                  className={`toggle ${downModePct ? 'active' : ''}`}
                  onClick={() => {
                    if (downModePct) {
                      const dollars = price * (Number(downInput) / 100);
                      setDownInput(Math.round(dollars));
                    } else {
                      const pct = price > 0 ? (Number(downInput) / price) * 100 : 0;
                      setDownInput(Number(pct.toFixed(2)));
                    }
                    setDownModePct(m => !m);
                  }}
                >
                  {downModePct ? 'Use $' : 'Use %'}
                </button>
              </div>
              <div className="small">= {fmtCurrency(downDollar)} ({fmtNumber(downPct,1)}%)</div>
            </div>
            <div>
              <label>Interest Rate (APR)</label>
              <NumberInput value={rate} onChange={setRate} placeholder="%" decimals={3} />
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
              {taxModePct ? (
                <NumberInput value={taxInput} onChange={setTaxInput} placeholder="%" decimals={2} />
              ) : (
                <CurrencyInput value={taxInput} onChange={setTaxInput} placeholder="$" />
              )}
              <div className="row" style={{marginTop:6}}>
                <button
                  className={`toggle ${taxModePct ? 'active' : ''}`}
                  onClick={() => {
                    if (taxModePct) {
                      const dollars = price * (Number(taxInput) / 100);
                      setTaxInput(Math.round(dollars));
                    } else {
                      const pct = price > 0 ? (Number(taxInput) / price) * 100 : 0;
                      setTaxInput(Number(pct.toFixed(2)));
                    }
                    setTaxModePct(m => !m);
                  }}
                >
                  {taxModePct ? 'Use $' : 'Use %'}
                </button>
              </div>
              <div className="small">≈ {fmtCurrency(approxMonthlyTax)} / mo</div>
            </div>
            <div>
              <label>Homeowners Insurance ($ / year)</label>
              <CurrencyInput value={insYr} onChange={setInsYr} placeholder="$" />
              <div className="small">≈ {fmtCurrency(approxMonthlyIns)} / mo</div>
            </div>
            <div>
              <label>HOA Dues ($ / month)</label>
              <CurrencyInput value={hoa} onChange={setHoa} placeholder="$" />
            </div>
          </div>
        <div className="row" style={{marginTop:16}}>
          <button className="btn" onClick={calculate}>Calculate</button>
        </div>
      </div>

      <div className="card" style={{marginTop:16}}>
        <div className="summary-grid3">
            <div>
              <div className="small">Loan Amount</div>
              <div className="h1" style={{fontSize:24}}>{fmtCurrency(calc.loanAmount)}</div>
              <div className="small">LTV ~ {fmtNumber(calc.ltvDisplay,1)}%</div>
            </div>
            <div>
              <div className="small">Principal & Interest</div>
              <div className="h1" style={{fontSize:24}}>{fmtCurrency(calc.pi)}</div>
              <div className="small">Rate {fmtNumber(rate,3)}% | {years} years</div>
            </div>
            <div>
              <div className="small">MI/MIP (if any)</div>
              <div className="h1" style={{fontSize:24}}>{fmtCurrency(calc.miMonthly)}</div>
              <div className="small">Program: {program}</div>
            </div>
        </div>
      </div>

      <div className="card" style={{marginTop:16}}>
        <div className="summary-grid4">
            <div>
              <div className="small">Taxes</div>
              <div className="h1" style={{fontSize:20}}>{fmtCurrency(calc.monthlyTax)}</div>
            </div>
            <div>
              <div className="small">Insurance</div>
              <div className="h1" style={{fontSize:20}}>{fmtCurrency(calc.monthlyIns)}</div>
            </div>
            <div>
              <div className="small">HOA</div>
              <div className="h1" style={{fontSize:20}}>{fmtCurrency(Number(hoa) || 0)}</div>
            </div>
            <div>
              <div className="small">Est. Total Monthly</div>
              <div className="h1" style={{fontSize:28}}>{fmtCurrency(calc.total)}</div>
            </div>
        </div>
      </div>

      <div className="row" style={{marginTop:16, flexWrap:'wrap', gap:12}}>
        <button className="btn" onClick={copySummary}>Copy summary</button>
        <div className="small">
          Disclaimers: Estimates only. Taxes/insurance/HOA vary. Conventional PMI, FHA MIP, and VA funding fees here are simplified. For formal quotes, ask the lender.
        </div>
      </div>
    </>
  );
}
