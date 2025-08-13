export function programCapPct({ loanType, occupancy, ltv }){
  if (loanType === 'Conventional'){
    if (occupancy === 'Investment') return 0.02;
    if (ltv > 90) return 0.03;
    if (ltv > 75) return 0.06;
    return 0.09;
  }
  if (loanType === 'FHA') return 0.06;
  if (loanType === 'VA') return 0.04;
  return 0;
}

// sellerCredits here is "credits before the 1% bonus" (seller + other + optional DPA if counted)
export function allocation({ price, commissionRate, capAmount, sellerCredits }){
  const grossCommission = price * commissionRate;
  const agentShare = grossCommission / 2;
  const ahaShare = grossCommission / 2;

  const afcPlanned = price * 0.00375; // 0.375%
  const ahaPlanned = price * 0.00375; // 0.375%
  const agentPlanned = price * 0.0025; // 0.25% default

  const plannedTotal = afcPlanned + ahaPlanned + agentPlanned;
  const remainingNeed = Math.max(0, capAmount - Math.max(0, sellerCredits||0));
  const allowed = Math.min(plannedTotal, remainingNeed);

  let allocatedAfc = afcPlanned, allocatedAha = ahaPlanned, allocatedAgent = agentPlanned;
  let over = Math.max(0, allocatedAfc + allocatedAha + allocatedAgent - allowed);

  if (over > 0){ const cut = Math.min(allocatedAgent, over); allocatedAgent -= cut; over -= cut; }
  if (over > 0){
    let perSide = over/2;
    const cutAha = Math.min(allocatedAha, perSide);
    const cutAfc = Math.min(allocatedAfc, perSide);
    allocatedAha -= cutAha; allocatedAfc -= cutAfc; over -= (cutAha + cutAfc);
    if (over > 0){
      if (allocatedAha >= allocatedAfc && allocatedAha > 0){ const extra = Math.min(allocatedAha, over); allocatedAha -= extra; over -= extra; }
      if (over > 0 && allocatedAfc > 0){ const extra = Math.min(allocatedAfc, over); allocatedAfc -= extra; over -= extra; }
    }
  }
  return { grossCommission, agentShare, ahaShare, allocatedAfc, allocatedAha, allocatedAgent, allowed, afcPlanned, ahaPlanned, agentPlanned, capAmount };
}
