import React, { useState, useEffect } from "react";
import MonthlyPaymentCalculator from "./MonthlyPaymentCalculator.jsx";

export default function App(){
  const prefersDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const [dark, setDark] = useState(prefersDark);

  useEffect(()=>{
    const r = document.documentElement;
    dark ? r.classList.add('dark') : r.classList.remove('dark');
  },[dark]);

  return (
    <div className="app">
      <div className="header">
        <div>
          <div className="h1">Agent Monthly Payment Calculator</div>
        </div>
        <div className="row">
          <button className="btn" onClick={()=>setDark(d=>!d)}>{dark? '☀️' : '🌙'}</button>
        </div>
      </div>
      <MonthlyPaymentCalculator/>
    </div>
  );
}
