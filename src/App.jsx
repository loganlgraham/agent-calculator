import React, { useMemo, useState, useEffect } from "react";
import { allocation, programCapPct } from "./lib/calc";

export default function App(){
  const [dark, setDark] = useState(false);
  useEffect(()=>{ const r=document.documentElement;
dark? r.classList.add('dark') : r.classList.remove('dark'); },[dark]);

  // Inputs
  const [homePriceInput, setHomePriceInput] = useState("$400,000");
  const [commissionPctInput, setCommissionPctInput] = useState("2.5");
  const [sellerCreditsInput, setSellerCreditsInput] = useState("$0");
  const [autoSellerCredits, setAutoSellerCredits] = useState(false);
  const [otherCreditsInput, setOtherCreditsInput] = useState("$0");
  const [cashToCloseInput, setCashToCloseInput] = useState("$0");

  // Earnest money (reduces net cash to close if included)
  const [earnestMoneyInput, setEarnestMoneyInput] = useState("$0");
  const [includeEarnestInCTC, setIncludeEarnestInCTC] = useState(true);
  const [showAgentZeroCalc, setShowAgentZeroCalc] = useState(false);


  // Loan/program fields
  const [loanType, setLoanType] = useState("FHA"); // Conventional | FHA | VA
  const [occupancy, setOccupancy] = useState("Primary"); // Conventional only

  // Down payment — % and $ with two-way sync
  const [downPctInput, setDownPctInput] = useState("3.5"); // default FHA
  const [downAmtInput, setDownAmtInput] = useState("");
  const [dpLastEdited, setDpLastEdited] = useState("percent"); // 'percent' | 'dollars'

  // Closing cost % and padding
  const [closingCostPctInput, setClosingCostPctInput] = useState("3");
  const [closingCostPadPctInput, setClosingCostPadPctInput] = useState("3");

  // Auto cash to close
  const [autoEstimateCTC, setAutoEstimateCTC] = useState(false);

  // DPA
  const [dpaProgram, setDpaProgram] = useState("None"); // None | CHFA | Essex | Custom
  const [dpaMode, setDpaMode] = useState("percent"); // percent | dollars
  const [dpaAmountInput, setDpaAmountInput] = useState("3"); // default shown
  const [dpaMaxPctInput, setDpaMaxPctInput] = useState("4"); // CHFA 4%, Essex 5%
  const [dpaMinBorrowerInput, setDpaMinBorrowerInput] = useState("$1,000"); // CHFA $1k, Essex $0
  const [dpaAllowCC, setDpaAllowCC] = useState(true);
  const [dpaCountsTowardCap, setDpaCountsTowardCap] = useState(true);

  useEffect(()=>{
    if(dpaProgram==="CHFA"){ setDpaMaxPctInput("4"); setDpaMinBorrowerInput("$1,000"); if(dpaMode==="percent" && (!dpaAmountInput||dpaAmountInput==="0")) setDpaAmountInput("3"); }
    else if(dpaProgram==="Essex"){ setDpaMaxPctInput("5"); setDpaMinBorrowerInput("$0"); if(dpaMode==="percent" && (!dpaAmountInput||dpaAmountInput==="0")) setDpaAmountInput("3"); }
    else if(dpaProgram==="None"){ setDpaAmountInput("0"); }
  },[dpaProgram]);

  useEffect(()=>{
    if (loanType==='FHA'){ setDownPctInput("3.5"); }
    if (loanType==='VA'){ setDownPctInput("0"); }
    if (loanType==='Conventional'){ setDownPctInput("5"); }
  },[loanType]);

  const digitsOnly = (s) => (s||"").replace(/[^0-9.]/g,"");
  const toNumber = (v) => { if(v===""||v==null) return 0; const n=Number(digitsOnly(v)); return Number.isFinite(n)? n : 0; };
  const toCurrency = (n) => {
    const num = Number(n);
    return Number.isFinite(num)
      ? num.toLocaleString(undefined,{style:"currency",currency:"USD",maximumFractionDigits:0})
      : "$0";
  };
  const fmt = (n) => {
    const num = Number(n);
    return Number.isFinite(num)
      ? num.toLocaleString(undefined,{maximumFractionDigits:2,minimumFractionDigits:2})
      : "0.00";
  };
  const pct = (n) => {
    const num = Number(n);
    return Number.isFinite(num) ? (num*100).toFixed(2)+"%" : "0.00%";
  };
  const blurOnEnter = (e)=>{ if(e.key==='Enter') e.currentTarget.blur(); };

  const priceNum = useMemo(()=>toNumber(homePriceInput),[homePriceInput]);

  useEffect(()=>{
    if(!priceNum) { if(dpLastEdited==='percent') setDownAmtInput(""); else setDownPctInput("0"); return; }
    if(dpLastEdited==='percent'){
      const p = Math.max(0, Math.min(100, Number(digitsOnly(downPctInput)||"0")));
      const amt = priceNum * (p/100);
      setDownAmtInput(amt? toCurrency(amt) : "");
    } else {
      const amt = toNumber(downAmtInput);
      const p = priceNum? (amt/priceNum)*100 : 0;
      setDownPctInput(String(Math.max(0, Math.min(100, Number.isFinite(p)?Number(p.toFixed(2)):0))));
    }
  },[priceNum, downPctInput, downAmtInput, dpLastEdited]);

  const computeDPA = ({ downPayment, closingCosts })=>{
    let dpaRequested = 0;
    if (dpaMode==="percent"){
      dpaRequested = priceNum * (Math.max(0, Number(digitsOnly(dpaAmountInput)||"0"))/100);
    } else {
      dpaRequested = toNumber(dpaAmountInput);
    }
    const dpaMaxByProgram = priceNum * (Math.max(0, Number(digitsOnly(dpaMaxPctInput)||"0"))/100);
    let dpaAvailable = Math.min(dpaRequested, dpaMaxByProgram);
    const minBorrower = Math.max(0, toNumber(dpaMinBorrowerInput));
    const allowToDown = Math.max(0, downPayment - minBorrower);
    const dpaToDown = Math.min(dpaAvailable, allowToDown);
    dpaAvailable -= dpaToDown;
    const dpaToCC = dpaAllowCC ? Math.min(dpaAvailable, closingCosts) : 0;
    dpaAvailable -= dpaToCC;
    const dpaUnused = dpaAvailable;
    return { dpaToDown, dpaToCC, dpaUnused, dpaRequested, dpaMaxByProgram, minBorrower };
  };

  const programCap = useMemo(()=>{
    let ltv = 100 - Math.max(0, Math.min(100, Number(digitsOnly(downPctInput)||"0")));
    const capPct = programCapPct({ loanType, occupancy, ltv });
    return { capPct, amount: priceNum*capPct, ltv, ruleLabel: `${loanType}${loanType==='Conventional'?` ${occupancy}`:''}: ${Math.round(capPct*100)}%` };
  },[priceNum, loanType, occupancy, downPctInput]);

  const data = useMemo(()=>{
    const price = priceNum;
    const commRate = Math.max(0, Number(digitsOnly(commissionPctInput)||"0"))/100;

    const baseDown = dpLastEdited==='dollars' && downAmtInput!==""
      ? toNumber(downAmtInput)
      : price * (Math.max(0, Number(digitsOnly(downPctInput)||"0"))/100);
    const baseCC = price * (Math.max(0, Number(digitsOnly(closingCostPctInput)||"0"))/100);
    const ccPadPct = Math.max(0, Number(digitsOnly(closingCostPadPctInput)||"0"))/100;
    const paddedCC = baseCC * (1 + ccPadPct);

    const dpa = computeDPA({ downPayment: baseDown, closingCosts: paddedCC });

    const remainingDown = Math.max(0, baseDown - dpa.dpaToDown);
    const preCreditCC = Math.max(0, paddedCC - dpa.dpaToCC);

    const seller = Math.max(0, toNumber(sellerCreditsInput));
    const other = Math.max(0, toNumber(otherCreditsInput));
    const earnest = Math.max(0, toNumber(earnestMoneyInput));

    const minGap = Math.max(0, dpa.minBorrower - (remainingDown + preCreditCC));
    const preCreditCTC = remainingDown + preCreditCC + minGap;
    const ctcAfterDpa = Math.max(0, preCreditCTC - (includeEarnestInCTC ? earnest : 0));

    let remainingCC = Math.max(0, preCreditCC - seller - other);
    const netBeforeEarnest = remainingDown + remainingCC + minGap;
    const ctcNetCalc = Math.max(0, netBeforeEarnest - (includeEarnestInCTC ? earnest : 0));
    // Round cash-to-close to whole dollars for stability
    const ctcNet = Math.round(Math.max(dpa.minBorrower, ctcNetCalc));
    const ctcBase = Math.max(0, baseDown + paddedCC);
    const displayCC = paddedCC + minGap;

    const ctcManual = Math.max(0, toNumber(cashToCloseInput));
    const baseCap = Math.max(0, programCap.amount);

    // Cap uses the lesser of the Program Cap and Cash to Close.
    const cashToClose = autoEstimateCTC ? ctcNet : ctcManual;

    const preCredits = seller + (dpaCountsTowardCap ? (dpa.dpaToDown + dpa.dpaToCC) : 0);

    const capUsed = Math.min(baseCap, cashToClose);

    const alloc = allocation({ price, commissionRate: commRate, capAmount: capUsed, sellerCredits: preCredits });
    const { grossCommission, agentShare, ahaShare, allocatedAfc, allocatedAha, allocatedAgent, allowed, afcPlanned, ahaPlanned, agentPlanned } = alloc;

    // Credits needed (seller/DPA toward cap) to reduce Agent contribution to $0:
    // When remainingNeed <= afcPlanned + ahaPlanned, agent allocation falls to zero.
    // Round needed credits to whole dollars to prevent oscillation
    const creditsToZeroAgent = Math.max(0, Math.round((Number(capUsed)||0) - ((Number(afcPlanned)||0) + (Number(ahaPlanned)||0))));

    const agentNet = agentShare - allocatedAgent;
    const ahaNet = ahaShare - allocatedAha;

    const onePct = price * 0.01 || 1;
    const bonusProgress = Math.max(0, Math.min(1, allowed / onePct));

      return {
        price,
        commissionPct: Math.max(0, Number(digitsOnly(commissionPctInput)||"0")),
        grossCommission, agentShare, ahaShare,
        allocatedAfc, allocatedAha, allocatedAgent,
        afcAllocPct: price? allocatedAfc/price : 0,
        ahaAllocPct: price? allocatedAha/price : 0,
        agentAllocPct: price? allocatedAgent/price : 0,
        agentNet, ahaNet,
        afcPlanned, ahaPlanned, agentPlanned,
        allowedBonusTotal: allowed, capUsed,
        earnest, includeEarnestInCTC, dpaCountsTowardCap,
        buyerCreditPct: price? Math.max(0, Math.min(1, allowed/price)) : 0,

        creditsToZeroAgent,
        downPayment: baseDown,
        closingCosts: displayCC,
        seller, other,
        dpaProgram, dpaMode,
        dpaToDown: dpa.dpaToDown, dpaToCC: dpa.dpaToCC, dpaUnused: dpa.dpaUnused,
        dpaRequested: dpa.dpaRequested, dpaMaxByProgram: dpa.dpaMaxByProgram,
        dpaMinBorrower: dpa.minBorrower,
        ruleLabel: programCap.ruleLabel,
        ctcAfterDpa,
        ctcNet,
        ctcBase,
      };
      },[priceNum, commissionPctInput, sellerCreditsInput, otherCreditsInput, cashToCloseInput, programCap.amount, autoEstimateCTC, downPctInput, downAmtInput, dpLastEdited, closingCostPctInput, closingCostPadPctInput, dpaProgram, dpaMode, dpaAmountInput, dpaMaxPctInput, dpaMinBorrowerInput, dpaAllowCC, dpaCountsTowardCap, loanType, occupancy]);

  useEffect(()=>{
    if(!autoSellerCredits && !autoEstimateCTC) return;
    const other = Math.max(0, toNumber(otherCreditsInput));
    const dpaCreds = dpaCountsTowardCap ? (data.dpaToDown + data.dpaToCC) : 0;
    const baseCap = Math.max(0, programCap.amount);
    const planned = (data.afcPlanned||0) + (data.ahaPlanned||0);
    const minBorrower = data.dpaMinBorrower || 0;

    if(autoEstimateCTC){
      const preNet = data.ctcAfterDpa;
      const Cprime = Math.max(0, preNet - other);
      const maxSeller = Math.max(0, preNet - minBorrower);

      let sellerNeeded = Math.max(0, baseCap - planned - dpaCreds);
      if(sellerNeeded > preNet - baseCap){
        sellerNeeded = Math.max(0, (preNet - planned - dpaCreds) / 2);
      }
      sellerNeeded = Math.min(maxSeller, Math.round(sellerNeeded));

      const sellerInputNum = Math.max(0, toNumber(sellerCreditsInput));
      const sellerUsed = autoSellerCredits ? sellerNeeded : sellerInputNum;

      const cashNet = Math.max(minBorrower, Cprime - sellerUsed);
      const ctcNeeded = Math.round(cashNet);

      if(autoSellerCredits && sellerUsed !== sellerInputNum){
        setSellerCreditsInput(toCurrency(sellerUsed));
      }
      if(toNumber(cashToCloseInput) !== ctcNeeded){
        setCashToCloseInput(toCurrency(ctcNeeded));
      }
    } else if(autoSellerCredits){
      const cashManual = Math.max(0, toNumber(cashToCloseInput));
      const capUsed = Math.min(baseCap, cashManual);
      const needed = Math.max(0, Math.round(capUsed - planned - dpaCreds));
      const maxSeller = Math.max(0, cashManual - minBorrower);
      const sellerNeeded = Math.min(maxSeller, needed);
      if(toNumber(sellerCreditsInput) !== sellerNeeded){
        setSellerCreditsInput(toCurrency(sellerNeeded));
      }
    }
  },[autoSellerCredits, autoEstimateCTC, otherCreditsInput, sellerCreditsInput, cashToCloseInput, dpaCountsTowardCap, data.dpaToDown, data.dpaToCC, data.ctcAfterDpa, data.afcPlanned, data.ahaPlanned, programCap.amount, data.dpaMinBorrower]);

const handleDownPctChange = (e)=>{ setDpLastEdited('percent'); setDownPctInput(e.target.value); };
  const handleDownAmtChange = (e)=>{
    setDpLastEdited('dollars');
    const v=(e.target.value||'').replace(/[^0-9.]/g,'');
    setDownAmtInput(v===''? '' : Number(v).toLocaleString(undefined,{style:'currency',currency:'USD',maximumFractionDigits:0}));
  };

  return (
    <div className="app">
      <div className="header">
        <div>
          <div className="h1">AHA / AFC 1% Buyer Bonus — Program Caps</div>
          <div className="subtle">AFC 0.375% + AHA 0.375% + Agent 0.25%. If capped, agent reduces first; then AHA & AFC reduce equally.</div>
        </div>
        <div className="row">
          <button className="btn" onClick={()=>setDark(d=>!d)}>{dark? "☀️" : "🌙"}</button>
        </div>
      </div>

      <section className="grid">
        <div className="card">
          <div className="grid topguard" style={{gridTemplateColumns:'1fr 1fr', gap:12}}>
            <div>
              <label>Loan Type</label>
              <select value={loanType} onChange={e=>setLoanType(e.target.value)}>
                <option>FHA</option>
                <option>VA</option>
                <option>Conventional</option>
              </select>
            </div>
            <div>
              <label>Occupancy</label>
              <select value={occupancy} onChange={e=>setOccupancy(e.target.value)} disabled={loanType!=='Conventional'}>
                <option>Primary</option>
                <option>Second Home</option>
                <option>Investment</option>
              </select>
            </div>
          </div>

          <div className="grid" style={{gridTemplateColumns:'1fr 1fr', gap:12, marginTop:12}}>
            <div>
              <label>Home Price</label>
              <input type="text" inputMode="numeric" value={homePriceInput} onChange={e=>{
                const v=(e.target.value||'').replace(/[^0-9.]/g,''); 
                setHomePriceInput(v===''? '' : Number(v).toLocaleString(undefined,{style:'currency',currency:'USD',maximumFractionDigits:0}));
              }} onKeyDown={(e)=>{ if(e.key==='Enter') e.currentTarget.blur(); }} />
            </div>
            <div>
              <label>Agent Commission (%)</label>
              <input type="text" inputMode="decimal" value={commissionPctInput} onChange={e=>setCommissionPctInput(e.target.value)} onKeyDown={(e)=>{ if(e.key==='Enter') e.currentTarget.blur(); }} />
            </div>
          </div>

          <div className="grid" style={{gridTemplateColumns:'1fr 1fr', gap:12, marginTop:12}}>
            <div>
              <label>Down Payment (%)</label>
              <input type="text" inputMode="decimal" value={downPctInput} onChange={handleDownPctChange} onKeyDown={(e)=>{ if(e.key==='Enter') e.currentTarget.blur(); }} />
              <div className="small">FHA default 3.5%, VA 0%, Conventional 5% (editable).</div>
            </div>
            <div>
              <label>Down Payment ($)</label>
              <input type="text" inputMode="numeric" value={downAmtInput} onChange={handleDownAmtChange} onKeyDown={(e)=>{ if(e.key==='Enter') e.currentTarget.blur(); }} />
              <div className="small">Two-way sync with % (based on price).</div>
            </div>
          </div>

          <div style={{height:12}} />
          <label>Down Payment Assistance (optional)</label>
          <div className="card" style={{padding:12}}>
            <div className="grid" style={{gridTemplateColumns:'1fr 1fr', gap:12}}>
              <div>
                <label>Program</label>
                <select value={dpaProgram} onChange={e=>setDpaProgram(e.target.value)}>
                  <option>None</option>
                  <option>CHFA</option>
                  <option>Essex</option>
                  <option>Custom</option>
                </select>
              </div>
              <div>
                <label>Amount Mode</label>
                <select value={dpaMode} onChange={e=>setDpaMode(e.target.value)}>
                  <option value="percent">% of Price</option>
                  <option value="dollars">$ Flat</option>
                </select>
              </div>
              <div>
                <label>Amount ({dpaMode==="percent"?"%": "$"})</label>
                <input type="text" inputMode={dpaMode==="percent"?"decimal":"numeric"} value={dpaAmountInput} onChange={e=>setDpaAmountInput(e.target.value)} onKeyDown={blurOnEnter} />
                <div className="small">Editable. CHFA often 3–4%.</div>
              </div>
              <div>
                <label>Program Max (% of Price)</label>
                <input type="text" inputMode="decimal" value={dpaMaxPctInput} onChange={e=>setDpaMaxPctInput(e.target.value)} onKeyDown={blurOnEnter} />
                <div className="small">Defaults: CHFA 4%, Essex 5% (editable; confirm program).</div>
              </div>
              <div>
                <label>Min Borrower Contribution ($)</label>
                <input type="text" inputMode="numeric" value={dpaMinBorrowerInput} onChange={e=>{
                  const v=(e.target.value||'').replace(/[^0-9.]/g,'');
                  setDpaMinBorrowerInput(v===''? '' : Number(v).toLocaleString(undefined,{style:'currency',currency:'USD',maximumFractionDigits:0}));
                }} onKeyDown={blurOnEnter} />
                <div className="small">Defaults: CHFA $1,000; Essex $0 (editable).</div>
              </div>
            </div>
          </div>

          <div style={{height:12}} />
          <div className="row" style={{justifyContent:'space-between', alignItems:'center'}}>
            <label>Seller Credits</label>
            <label className="row" style={{gap:6}}>
              <input type="checkbox" checked={autoSellerCredits} onChange={e=>setAutoSellerCredits(e.target.checked)} />
              <span>Auto-calc Seller Credits to zero Agent</span>
            </label>
          </div>
          <input type="text" inputMode="numeric" value={sellerCreditsInput} onChange={e=>{
            const v=(e.target.value||'').replace(/[^0-9.]/g,'');
            setAutoSellerCredits(false);
            setSellerCreditsInput(v===''? '' : Number(v).toLocaleString(undefined,{style:'currency',currency:'USD',maximumFractionDigits:0}));
          }} onKeyDown={blurOnEnter} />

          <div style={{height:12}} />
          <label>Other Credits (optional)</label>
          <input type="text" inputMode="numeric" value={otherCreditsInput} onChange={e=>{
            const v=(e.target.value||'').replace(/[^0-9.]/g,'');
            setOtherCreditsInput(v===''? '' : Number(v).toLocaleString(undefined,{style:'currency',currency:'USD',maximumFractionDigits:0}));
          }} onKeyDown={blurOnEnter} />

          <div style={{height:12}} />
          <label>Closing Cost Padding (%)</label>
          <input type="text" inputMode="decimal" value={closingCostPadPctInput} onChange={e=>setClosingCostPadPctInput(e.target.value)} onKeyDown={blurOnEnter} />
          <div className="small">Adds extra % buffer to closing costs.</div>

          <div style={{height:12}} />
          <div className="row" style={{gap:12, alignItems:'center', flexWrap:'wrap'}}>
            <label className="row">
              <input type="checkbox" checked={autoEstimateCTC} onChange={e=>setAutoEstimateCTC(e.target.checked)} />
              <span style={{marginLeft:6}}>Auto-calc Cash to Close</span>
            </label>
            <label className="row">
              <input type="checkbox" checked={dpaAllowCC} onChange={e=>setDpaAllowCC(e.target.checked)} />
              <span style={{marginLeft:6}}>Allow leftover to Closing Costs</span>
            </label>
            <label className="row">
              <input type="checkbox" checked={dpaCountsTowardCap} onChange={e=>setDpaCountsTowardCap(e.target.checked)} />
              <span style={{marginLeft:6}}>Count DPA toward Cap</span>
            </label>
            <label className="row">
              <input type="checkbox" checked={includeEarnestInCTC} onChange={e=>setIncludeEarnestInCTC(e.target.checked)} />
              <span style={{marginLeft:6}}>Include Earnest Money in Net CTC</span>
            </label>
          </div>

          <div style={{height:12}} />
          <label>Cash to Close</label>
          <input type="text" inputMode="numeric" value={cashToCloseInput} onChange={e=>{ const v=(e.target.value||"").replace(/[^0-9.]/g,""); setAutoEstimateCTC(false); setCashToCloseInput(v===""? "" : Number(v).toLocaleString(undefined,{style:"currency",currency:"USD",maximumFractionDigits:0})); }} onKeyDown={blurOnEnter} />
          <div className="small">
            Auto ON: field auto-populates from net CTC after DPA and all credits.
            Auto OFF: manually enter Cash to Close; cap uses the lesser of Program Cap and this amount.
          </div>
        </div>

        <div className="card">
          <div className="kv"><span className="label">Gross Commission</span><span className="value">${fmt(data.grossCommission)}</span></div>
          <div className="kv"><span className="label">Agent Share (50%)</span><span className="value">${fmt(data.agentShare)}</span></div>
          <div className="kv"><span className="label">AHA Share (50%)</span><span className="value">${fmt(data.ahaShare)}</span></div>

          <div className="kv"><span className="label">Buyer Bonus Allowed</span>
            <span className="value">
              ${fmt(data.allowedBonusTotal)}
              <span className="subtle" style={{marginLeft:8, color:'var(--text-subtle)'}}>({((data.bonusProgress||0)*100).toFixed(2)}% of 1%)</span>
            </span>
          </div>
          <div className="progress" style={{margin:'6px 0 8px 0'}}>
            <div style={{width:`${(data.bonusProgress||0)*100}%`}}/>
          </div>

          <div className="kv"><span className="label">AFC Contribution (0.375%)</span><span className="value">${fmt(data.allocatedAfc)} ({pct(data.afcAllocPct)})</span></div>
          <div className="kv"><span className="label">AHA Contribution (0.375%)</span><span className="value">${fmt(data.allocatedAha)} ({pct(data.ahaAllocPct)})</span></div>
          <div className="kv"><span className="label nowrap">Agent Contribution (0.25%)</span><span className="value">${fmt(data.allocatedAgent)} ({pct(data.agentAllocPct)})</span></div>
          <div className="kv"><span className="label">Agent Net (after credit)</span><span className="value">${fmt(data.agentNet)}</span></div>
          <div className="kv"><span className="label">AHA Net (after credit)</span><span className="value">${fmt(data.ahaNet)}</span></div>

          <div className="kv"><span className="label">CTC (before credits & DPA)</span><span className="value">{toCurrency(data.ctcBase)}</span></div>
          <div className="kv"><span className="label">CTC (after credits & DPA)</span><span className="value">{toCurrency(data.ctcNet)}</span></div>
          <div className="kv"><span className="label">Cap Used</span><span className="value">{toCurrency(data.capUsed)}</span></div>

          <div className="card" style={{marginTop:12}}>
            <div className="kv"><span className="label">Down Payment (base)</span><span className="value">{toCurrency(data.downPayment)}</span></div>
            <div className="kv"><span className="label">Closing Costs (base)</span><span className="value">{toCurrency(data.closingCosts)}</span></div>
            <div className="kv"><span className="label">Seller Credits</span><span className="value">{toCurrency(data.seller)}</span></div>
            <div className="kv"><span className="label">Other Credits</span><span className="value">{toCurrency(data.other)}</span></div>
            <div className="kv"><span className="label">DPA to Down</span><span className="value">{toCurrency(data.dpaToDown)}</span></div>
            <div className="kv"><span className="label">DPA to Closing Costs</span><span className="value">{toCurrency(data.dpaToCC)}</span></div>
            {data.dpaUnused>0 && <div className="kv"><span className="label">DPA Unused</span><span className="value">{toCurrency(data.dpaUnused)}</span></div>}
            <div className="small" style={{marginTop:6}}>Cap rule: {data.ruleLabel}</div>
          </div>

          <div className="row" style={{gap:8, marginTop:12, flexWrap:'wrap'}}>
            <button className="btn" onClick={()=>{ 
              const lines = [
                `Home Price: $${fmt(data.price)}`,
                `Commission: ${fmt(data.commissionPct)}%`,
                `Gross Commission: $${fmt(data.grossCommission)}`,
                `Agent Share (50%): $${fmt(data.agentShare)}`,
                `AHA Share (50%): $${fmt(data.ahaShare)}`,
                ``,
                `Buyer Bonus Allowed: $${fmt(data.allowedBonusTotal)} (${((data.bonusProgress||0)*100).toFixed(2)}% of 1%)`,
                ` - AFC Contribution: $${fmt(data.allocatedAfc)} (${(data.afcAllocPct*100).toFixed(2)}%)`,
                ` - AHA Contribution: $${fmt(data.allocatedAha)} (${(data.ahaAllocPct*100).toFixed(2)}%)`,
                ` - Agent Contribution: $${fmt(data.allocatedAgent)} (${(data.agentAllocPct*100).toFixed(2)}%)`,
                ``,
                `CTC before credits & DPA: $${fmt(data.ctcBase)}`,
                `CTC after credits & DPA: $${fmt(data.ctcNet)}`,
                `Cap Used: $${fmt(data.capUsed)}`,
                ``,
                `DPA Program: ${data.dpaProgram}`,
                `DPA to Down: $${fmt(data.dpaToDown)} | DPA to CC: $${fmt(data.dpaToCC)}${data.dpaUnused>0?` | Unused: $${fmt(data.dpaUnused)}`:''}`,
                `Seller Credits: $${fmt(data.seller)} | Other Credits: $${fmt(data.other)}`,
              ].join('\n').replace(/\n/g,'\n');
              try {
                const ta = document.createElement('textarea');
                ta.value = lines; ta.style.position='fixed'; ta.style.left='-9999px'; ta.style.top='-9999px';
                document.body.appendChild(ta); ta.focus(); ta.select();
                document.execCommand('copy'); document.body.removeChild(ta);
                alert('Copied! Paste into an email/text.');
              } catch { alert(lines); }
            }}>Copy Breakdown</button>
            
            <button className="btn" onClick={()=>setDark(d=>!d)}>{dark? "☀️" : "🌙"}</button>
          </div>
        </div>
      </section>

      <div className="sticky">
        <div className="bar">
          <span className="kvpill"><span className="kicker">Buyer Bonus:</span><span className="value">${fmt(data.allowedBonusTotal)}</span></span>
          <span className="kvpill"><span className="kicker">Agent Net:</span><span className="value">${fmt(data.agentNet)}</span></span>
          <span className="kvpill"><span className="kicker">Cap Used:</span><span className="value">${fmt(data.capUsed)}</span></span>
        </div>
      </div>

      <div className="card" style={{marginTop:16}}>
        <div className="footer-note">Disclaimer: Estimates only; confirm caps, DPA eligibility, and program limits with lender guidelines.</div>
        <div className="footer-note" style={{marginTop:6}}>Build v{__APP_VERSION__}</div>
      </div>
    </div>
  );
}
