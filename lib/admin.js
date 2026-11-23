'use strict';
const {normalize,parseDate,phaseKey}=require('./rules');
// Count OTs requiring invoicing; an amount is optional, never a prerequisite.
function buildAdminUniverse(cards) {
 const result={reviews:[],reconciliation:[]},seen=new Map();
 for(const card of cards){
  if(!card.id || !card.ot)throw Error('ADMIN requiere ID y OT');
  if(seen.has(card.id)){
   if(JSON.stringify(seen.get(card.id))!==JSON.stringify(card))throw Error('ADMIN: versiones conflictivas de tarjeta');
   continue;
  }
  seen.set(card.id,card);
  const base={...card,pipeId:'301633616',state:'',contactDate:'',observation:''};
  const date=parseDate(card.date),since2025=date!==null&&date>=parseDate('2025-01-01');
  const pendingInvoicing=typeof card.pendingInvoicing==='boolean'?card.pendingInvoicing:
   typeof card.balanceToInvoice==='number'&&Number.isFinite(card.balanceToInvoice)?card.balanceToInvoice>0:null;
  if(pendingInvoicing===true)result.reviews.push({...base,front:'facturacion'});
  else if(pendingInvoicing===null)result.reconciliation.push({...base,reason:'Confirmar si la OT está pendiente por facturar; no se requiere monto'});
  if(!card.country || date===null)result.reconciliation.push({...base,reason:'País o fecha faltante; validar universo de asociados'});
  else if(normalize(card.country)!=='colombia'&&since2025)result.reviews.push({...base,front:'asociados'});
  const phase=phaseKey(card.phase);
  // The supplied completed report is filtered by first entry into Completadas
  // during 2025/2026; this is distinct from the OT's request/creation date.
  if(phase&&phase!=='completadas' || phase==='completadas'&&(card.completedSince2025===true||since2025))result.reviews.push({...base,front:'fases'});
  else if(phase==='completadas'&&date===null)result.reconciliation.push({...base,reason:'Fecha faltante en Completadas; validar alcance desde 2025'});
 }
 return result;
}
function deriveAdminReferrals(otas,adminCards) {
 const byOT=new Map();
 for(const card of adminCards){const key=String(card.ot).trim();if(!byOT.has(key))byOT.set(key,[]);byOT.get(key).push(card);}
 const unique=new Map();
 for(const ota of otas){
  if(!['OT radicada','OT anulada pendiente revisión administrativa'].map(normalize).includes(normalize(ota.state)))continue;
  const matches=byOT.get(String(ota.ot).trim())||[],key=`${ota.pipeId}:${ota.id}`;
  unique.set(key,{sourceKey:key,ot:ota.ot,reason:ota.state,adminCardId:matches.length===1?matches[0].id:null,status:matches.length===1?'pending':'reconciliation'});
 }
 return [...unique.values()];
}
module.exports={buildAdminUniverse,deriveAdminReferrals};
