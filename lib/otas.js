'use strict';
const {normalize,parseDate,ageTier,managementComplete,benefit,FRONT_LABELS}=require('./rules');
function parseCSV(text) {
  const rows = []; let row = [], cell = '', quoted = false;
  text = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) { if (c === '"' && text[i + 1] === '"') {cell += '"'; i++;} else if (c === '"') quoted = false; else cell += c; }
    else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if(c === '\r' && text[i+1] === '\n') i++; row.push(cell); if(row.some(v => v.trim())) rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (quoted) throw new Error('CSV incompleto');
  row.push(cell); if(row.some(v => v.trim())) rows.push(row);
  return rows;
}
// The campaign sheet is a frozen, ID-keyed universe, independent of report row order.
function recordsFromRows(rows, admin=false) {
  const headers=rows[0]?.map(normalize)||[];
  if(new Set(headers.filter(Boolean)).size!==headers.filter(Boolean).length)throw new Error('Encabezados duplicados');
  const fields={id:'ID',pipeId:'PIPE ID',ot:'OT',created:'Fecha Solicitud OT',phase:'Fase actual',state:'ESTADO LAVA',contactDate:'FECHA DE GESTIÓN',observation:'OBSERVACIÓN LAVA',responsible:'Responsable',front:'FRENTE',invoice:'FACTURA',associate:'ASOCIADO',purchaseOrder:'OC',associateInvoice:'FACTURA ASOCIADO',evidence:'EVIDENCIA',expectedUpdatedAt:'PIPEFY ACTUALIZADO'};
  const indices=Object.fromEntries(Object.entries(fields).map(([k,v])=>[k,headers.indexOf(normalize(v))]));
  for(const key of ['id','pipeId','ot','state','contactDate','observation',...(admin?['front','phase']:[])])if(indices[key]<0)throw new Error('Falta encabezado '+fields[key]);
  const seen=new Set();
  return rows.slice(1).filter(row=>String(row[indices.ot]??'').trim()).map(row=>{
    const record=Object.fromEntries(Object.entries(indices).map(([k,i])=>[k,i<0?'':String(row[i]??'').trim()]));
    if(!record.id || !record.pipeId)throw new Error('Registro sin ID o pipe');
    if(admin && !Object.hasOwn(FRONT_LABELS,record.front))throw new Error('Frente ADMIN no reconocido');
    const key=[record.pipeId,record.id,admin?record.front:''].join(':');
    if(seen.has(key))throw new Error('Identificador duplicado; revisar antes de consolidar');
    seen.add(key);return record;
  });
}
function summarize(rows,cutoff,options={}) {
  if(parseDate(cutoff)===null)throw new Error('Corte inválido');
  const records=recordsFromRows(rows,options.admin);
  const result={total:records.length,done:0,historical:0,historicalDone:0,reminder:0,reminderDone:0,recent:0,recentDone:0,unknownDates:0,unknownDatesDone:0,adminReferrals:0,fronts:[]};
  const fronts=Object.fromEntries(Object.entries(FRONT_LABELS).map(([key,label])=>[key,{key,label,total:0,done:0}]));
  for(const record of records){
    const done=managementComplete(record,cutoff);if(done)result.done++;
    if(options.admin){fronts[record.front].total++;if(done)fronts[record.front].done++;}
    else {
      const tier=ageTier(record.created,cutoff), key=tier==='unknown'?'unknownDates':tier;
      result[key]++;if(done)result[key+'Done']++;
      if(['OT radicada','OT anulada pendiente revisión administrativa'].map(normalize).includes(normalize(record.state)))result.adminReferrals++;
    }
  }
  if(options.admin)result.fronts=Object.values(fronts);
  result.progress=result.total?result.done/result.total*100:null;
  result.benefit=benefit(result.total,result.done,cutoff);
  return result;
}
function parseSummary(rows,cutoff,{admin=false,snapshot='2026-11-17',metricPrefix=''}={}) {
  if(normalize(rows[0]?.[0])!=='metric'||normalize(rows[0]?.[1])!=='value')throw new Error('Resumen sin encabezados válidos');
  let metrics={};
  for(const [key,value] of rows.slice(1)){if(!key)continue;if(Object.hasOwn(metrics,key))throw new Error('Métrica repetida');metrics[key]=value;}
  const prefix=metricPrefix || (metrics.v2_version?'v2_':'');
  if(prefix)metrics=Object.fromEntries(Object.entries(metrics).filter(([k])=>k.startsWith(prefix)).map(([k,v])=>[k.slice(prefix.length),v]));
  if(metrics.version!=='2')throw new Error('Resumen pendiente de migrar a reglas 2026');
  if(metrics.cutoff!==cutoff || metrics.snapshot!==snapshot)throw new Error('Resumen con corte o universo desactualizado');
  const fields=['total','done',...(admin?Object.keys(FRONT_LABELS).flatMap(k=>[k+'_total',k+'_done']):['historical','historicalDone','reminder','reminderDone','recent','recentDone','unknownDates','unknownDatesDone','adminReferrals'])];
  const result={};
  for(const key of fields){const value=Number(metrics[key]);if(metrics[key]===undefined || String(metrics[key]).trim()==='' || !Number.isSafeInteger(value)||value<0)throw new Error('Conteos inválidos');result[key]=value;}
  if(result.done>result.total)throw new Error('Resumen inconsistente');
  if(admin){
    result.fronts=Object.entries(FRONT_LABELS).map(([key,label])=>({key,label,total:result[key+'_total'],done:result[key+'_done']}));
    for(const f of result.fronts){if(f.done>f.total)throw new Error('Frente inconsistente');delete result[f.key+'_total'];delete result[f.key+'_done'];}
    if(result.fronts.reduce((n,f)=>n+f.total,0)!==result.total || result.fronts.reduce((n,f)=>n+f.done,0)!==result.done)throw new Error('Frentes incompletos');
  }else{
    const tiers=['historical','reminder','recent','unknownDates'];
    if(tiers.some(k=>result[k+'Done']>result[k]) || tiers.reduce((n,k)=>n+result[k],0)!==result.total || tiers.reduce((n,k)=>n+result[k+'Done'],0)!==result.done || result.adminReferrals>result.total)throw new Error('Tiers inconsistentes');
    result.fronts=[];
  }
  result.progress=result.total?result.done/result.total*100:null;
  result.benefit=benefit(result.total,result.done,cutoff);return result;
}
module.exports={parseCSV,parseDate,recordsFromRows,summarize,parseSummary};
