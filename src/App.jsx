import React, { useState, useEffect } from "react";
import OnePercentCalculator from "./OnePercentCalculator.jsx";
import MonthlyPaymentCalculator from "./MonthlyPaymentCalculator.jsx";

export default function App(){
  const [dark, setDark] = useState(false);
  const [mode, setMode] = useState("bonus");

  useEffect(()=>{
    const r = document.documentElement;
    dark ? r.classList.add('dark') : r.classList.remove('dark');
  },[dark]);

  return (
    <div className="app">
      <div className="header">
        <div>
          <div className="h1">Agent Calculators</div>
        </div>
        <div className="row">
          <button className="btn" style={{opacity: mode==='bonus'?1:0.6}} onClick={()=>setMode('bonus')}>1% Calculator</button>
          <button className="btn" style={{opacity: mode==='payment'?1:0.6}} onClick={()=>setMode('payment')}>Monthly Payment</button>
          <button className="btn" onClick={()=>setDark(d=>!d)}>{dark? '☀️' : '🌙'}</button>
        </div>
      </div>
      {mode === 'bonus' ? <OnePercentCalculator/> : <MonthlyPaymentCalculator/>}
    </div>
  );
}
