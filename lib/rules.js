'use strict';
const OTA_STATES = [
  'Pendiente documentos del cliente – Faltan documentos (25% recibidos)',
  'Pendiente documentos del cliente – Faltan documentos (50% recibidos)',
  'Pendiente documentos del cliente – Faltan documentos (75% recibidos)',
  'Pendiente SPI revisión documentos', 'Pendiente recibir pago para radicación',
  'Proyecto en standby', 'OT anulada pendiente revisión administrativa',
  'OT radicada', 'OT no requiere radicación pero trabajo completado'
];
const ADMIN_STATES = {
  facturacion: ['Facturada', 'Aún no facturable (espera radicación o resolución)', 'Pendiente facturar', 'No requiere facturación'],
  asociados: ['Completa (asociado + OC con factura)', 'Falta asociado en la OT', 'Falta OC', 'OC sin detalle de factura del asociado', 'No aplica (sin asociado)'],
  pago: ['Confirmado pendiente pago', 'Pago ya recibido → mover de fase', 'Anulada'],
  recibido: ['Confirmado pendiente radicación', 'Ya radicada → mover de fase'],
  radicacion: ['Pendiente facturar', 'Pendiente recaudo', 'Completa → mover a Completadas'],
  completadas: ['Verificada completa', 'Pendiente facturación', 'Pendiente recaudo → devolver de fase']
};
const FRONT_LABELS = {facturacion:'Facturación', asociados:'Asociados y corresponsales', fases:'Validación de fases'};
const DEADLINE = '2026-12-18';
const BENEFIT_DATES = ['2026-12-24', '2026-12-31'];
function normalize(v) { return String(v ?? '').trim().replace(/\s+/g,' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(); }
function parseDate(v) {
  if(v===null || v===undefined || String(v).trim()==='')return null;
  const s=String(v).trim(); let y,m,d;
  if(/^\d{5}(?:\.\d+)?$/.test(s))return Date.UTC(1899,11,30)+Math.floor(Number(s))*86400000;
  if(/^\d{4}-\d{2}-\d{2}(?:$|T)/.test(s))[y,m,d]=s.slice(0,10).split('-').map(Number);
  else if(/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s))[d,m,y]=s.split('/').map(Number);
  else return null;
  const date=Date.UTC(y,m-1,d), check=new Date(date);
  return check.getUTCFullYear()===y && check.getUTCMonth()===m-1 && check.getUTCDate()===d?date:null;
}
function phaseKey(phase) {
  const p=normalize(phase);
  if(p.startsWith('esperando pago del cliente'))return 'pago';
  if(p.startsWith('pago del cliente recibido'))return 'recibido';
  if(p.startsWith('proceso de radicacion'))return 'radicacion';
  if(p.startsWith('completadas'))return 'completadas';
  return null;
}
function allowedStates(record) {return record.front ? ADMIN_STATES[record.front==='fases'?phaseKey(record.phase):record.front] || [] : OTA_STATES;}
function managementComplete(record, cutoff) {
  const day=parseDate(cutoff), date=parseDate(record.contactDate);
  if(day===null || date===null || date>day || date>parseDate(DEADLINE) || !String(record.observation??'').trim())return false;
  const state=normalize(record.state);
  if(!allowedStates(record).some(s=>normalize(s)===state))return false;
  if(record.front==='facturacion' && state===normalize('Facturada') && !String(record.invoice??'').trim())return false;
  if(record.front==='asociados' && state===normalize(ADMIN_STATES.asociados[0]))return Boolean(String(record.associate??'').trim() && String(record.purchaseOrder??'').trim() && String(record.associateInvoice??'').trim());
  return true;
}
function ageTier(value, cutoff) {
  const date=parseDate(value), day=parseDate(cutoff);
  if(date===null || day===null || date>day)return 'unknown';
  const days=(day-date)/86400000;
  return days>365?'historical':days>90?'reminder':'recent';
}
function benefit(total, done, cutoff) {
  if(!total)return 'pending';
  return done===total?'unlocked':cutoff>DEADLINE?'not_met':'pending';
}
module.exports={OTA_STATES,ADMIN_STATES,FRONT_LABELS,DEADLINE,BENEFIT_DATES,normalize,parseDate,phaseKey,allowedStates,managementComplete,ageTier,benefit};
