'use strict';
const GROUPS = ['Ejecución Programada', 'Esperando Cliente', 'Gestión de Cierre/Baja', 'Gestión Interna / Administrativa'];
function normalize(value) { return String(value ?? '').trim().replace(/\s+/g, ' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
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
function parseDate(value) {
  if (!value) return null;
  const s = String(value).trim(); let y,m,d;
  if (/^\d{4}-\d{2}-\d{2}(?:$|T)/.test(s)) [y,m,d] = s.slice(0,10).split('-').map(Number);
  else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) [d,m,y] = s.split('/').map(Number); // es_MX: DD/MM/YYYY
  else if (/^\d{5}(?:\.\d+)?$/.test(s)) {
    const date = new Date(Date.UTC(1899,11,30) + Math.floor(Number(s))*86400000);
    return date.getTime();
  } else return null;
  const date = Date.UTC(y,m-1,d);
  const check = new Date(date);
  return check.getUTCFullYear()===y && check.getUTCMonth()===m-1 && check.getUTCDate()===d ? date : null;
}
function yearBefore(cutoff) {
  const date = new Date(cutoff); const y = date.getUTCFullYear()-1, m=date.getUTCMonth(), d=date.getUTCDate();
  return Date.UTC(y,m,Math.min(d,new Date(Date.UTC(y,m+1,0)).getUTCDate()));
}
function summarize(rows, cutoff) {
  const headers = rows[0]?.map(normalize) || [];
  const find = name => headers.indexOf(normalize(name));
  const index = {ot:find('OT'),phase:find('Fase actual'),group:find('GRUPO DE ACCIÓN'),state:find('ESTADO'),date:find('Fecha Solicitud OT'),id:find('ID')};
  if (Object.values(index).slice(0,4).some(v=>v<0)) throw new Error('Faltan encabezados OT, Fase actual, GRUPO DE ACCIÓN o ESTADO');
  if (new Set(headers.filter(Boolean)).size !== headers.filter(Boolean).length) throw new Error('Encabezados duplicados');
  const day = parseDate(cutoff); if(day===null) throw new Error('Corte inválido');
  const groups = GROUPS.map(label=>({label,total:0,done:0,progress:0}));
  const result = {total:0,done:0,over90:0,overYear:0,over90Pending:0,overYearPending:0,unknownDates:0,uncategorized:0,excluded:0,groups};
  const seen = new Set();
  for (const row of rows.slice(1)) {
    const ot=String(row[index.ot]??'').trim(); if(!ot) continue;
    if(!/^otas\b/.test(normalize(row[index.phase]))) {result.excluded++; continue;}
    const key=index.id>=0?String(row[index.id]??'').trim():ot;
    if(!key) throw new Error('Registro sin ID de tarjeta');
    if(seen.has(key)) throw new Error('Identificador duplicado en el archivo; revisar antes de consolidar');
    seen.add(key); result.total++;
    const done=normalize(row[index.state])==='listo'; if(done) result.done++;
    const group=groups.find(g=>normalize(g.label)===normalize(row[index.group]));
    if(group){group.total++; if(done)group.done++;} else result.uncategorized++;
    const requested=index.date<0?null:parseDate(row[index.date]);
    if(requested===null || requested>day){result.unknownDates++; continue;}
    if(day-requested>90*86400000){result.over90++; if(!done)result.over90Pending++;}
    if(requested<yearBefore(day)){result.overYear++; if(!done)result.overYearPending++;}
  }
  if(!result.total) throw new Error('Sin OTAS en el archivo; revisar el pegado y la fase');
  groups.forEach(g=>g.progress=g.total ? g.done/g.total*100 : 0);
  // Same category-average indicator as the historical dashboard (empty categories contribute 0).
  result.progress=groups.reduce((n,g)=>n+g.progress,0)/GROUPS.length;
  result.actualProgress=result.done/result.total*100;
  return result;
}
module.exports={GROUPS,normalize,parseCSV,parseDate,yearBefore,summarize};
