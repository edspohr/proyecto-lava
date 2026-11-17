'use strict';
const labels={pi:['PI','Propiedad Intelectual'],ar_colombia:['AR COL','AR Colombia'],ar_global_ops:['AR GLOBAL','AR Global']};
const order=['pi','ar_colombia','ar_global_ops'];
const fmt=new Intl.NumberFormat('es-CL',{maximumFractionDigits:1});
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let busy=false;
function render(data){
  const available=data.areas.filter(a=>a.status==='ok');
  const allDates=available.length===3 && available.every(a=>a.unknownDates===0);
  const global=data.global;
  document.querySelector('#percentage').innerHTML=global===null?'—':`${fmt.format(global)}<span>%</span>`;
  document.querySelector('#global-fill').style.width=`${global??0}%`;
  const meter=document.querySelector('#global-meter');
  if(global===null){meter.removeAttribute('aria-valuenow');meter.setAttribute('aria-valuetext','Pendiente: faltan fuentes');}
  else{meter.setAttribute('aria-valuenow',global);meter.removeAttribute('aria-valuetext');}
  document.querySelector('#stage-name').textContent=global===null?'Consolidación incompleta':'Avance por categorías';
  document.querySelector('#level-label').textContent='FÓRMULA HISTÓRICA';
  document.querySelector('#remaining').textContent=global===null?'Falta conectar o leer todas las áreas':`${fmt.format(100-global)} puntos para el 100% del indicador`;
  document.querySelector('#milestones').innerHTML=[25,50,75,100].map(mark=>`<div class="milestone ${global!==null&&global>=mark?'reached':''}"><span aria-hidden="true">${global!==null&&global>=mark?'✓':'·'}</span>${mark}%</div>`).join('');
  document.querySelector('#area-cards').innerHTML=order.map(key=>{
    const a=data.areas.find(v=>v.key===key);const [code,label]=labels[key];const ok=a?.status==='ok';const hasDates=ok&&a.unknownDates<a.total;
    return `<article class="area-card ${ok?'':'area-pending'}"><div class="area-top"><div><span class="area-code">${code}</span><h3>${label}</h3></div><span class="area-percentage">${ok?`${fmt.format(a.progress)}<small>%</small>`:'—'}</span></div><div class="area-track" ${ok?`role="meter" aria-label="Indicador ${label}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${a.progress}"`:'aria-hidden="true"'}><span style="width:${ok?a.progress:0}%"></span></div><div class="area-bottom">${ok?`<span>${a.done} de ${a.total} OTAS en Listo</span><strong>${fmt.format(a.actualProgress)}% de las OTAS</strong>`:`<span>${escapeHTML(a?.message||'Lectura pendiente')}</span>`}</div>${ok?`<div class="area-aging"><span><b>${hasDates?a.overYear:'—'}</b> con más de 1 año</span><span>${hasDates?a.over90:'—'} con más de 90 días</span><span>${a.unknownDates} sin fecha válida</span></div>`:''}</article>`;
  }).join('');
  const count=field=>available.reduce((n,a)=>n+a[field],0);
  document.querySelector('#legacy-total').textContent=available.length?`${count('overYear')} ${allDates?'OTAS':'detectadas'}`:'Por calcular';
  document.querySelector('#aging-total').textContent=available.length?`${count('over90')} ${allDates?'OTAS':'detectadas'}`:'Por calcular';
  document.querySelector('#legacy-pending').textContent=available.length?`${count('overYearPending')} aún sin estado Listo. Corte: ${data.cutoff}.`:'Sin datos disponibles.';
  document.querySelector('#aging-pending').textContent=available.length?`${count('over90Pending')} aún sin estado Listo. Corte: ${data.cutoff}.`:'Sin datos disponibles.';
  document.querySelector('#priority-coverage').textContent=allDates?'COBERTURA COMPLETA':'COBERTURA PARCIAL';
  document.querySelector('#age-breakdown').innerHTML=`<div class="age-row age-header"><span>Área</span><span>Más de 1 año</span><span>Más de 90 días</span><span>Sin fecha válida</span></div>`+order.map(key=>{
    const a=data.areas.find(v=>v.key===key);const ok=a?.status==='ok';
    return `<div class="age-row"><strong>${labels[key][1]}</strong><span>${ok&&a.unknownDates<a.total?a.overYear:'—'}</span><span>${ok&&a.unknownDates<a.total?a.over90:'—'}</span><span>${ok?a.unknownDates:'—'}</span></div>`;
  }).join('');
  document.querySelector('#priority-note').textContent=`Los focos se superponen; no se suman. Antigüedad desde Fecha Solicitud OT. ${count('unknownDates')} registros sin fecha válida en las fuentes leídas.${allDates?'':' Hay fuentes o fechas pendientes; las cantidades detectadas no son el total de la campaña.'}`;
  document.querySelector('#data-status').textContent=`${available.length} DE 3 FUENTES LEÍDAS`;
  document.querySelector('#data-updated').textContent=`Consulta: ${new Intl.DateTimeFormat('es-CL',{dateStyle:'short',timeStyle:'short'}).format(new Date(data.fetchedAt))}`;
  document.querySelector('#load-message').textContent='Lectura de hojas de análisis; el contenido puede conservar datos de 2025. La hora de consulta no certifica el reemplazo del export ni la validación de la gestión.';
  document.querySelector('#announcement').textContent=available.length===3?'Fuentes actualizadas.':'Se muestran las fuentes disponibles; no se consolida un global incompleto.';
}
async function refresh(){
  if(busy)return;busy=true;const button=document.querySelector('#refresh');button.disabled=true;button.textContent='Leyendo…';
  try{
    const response=await fetch('/api/metrics',{cache:'no-store',signal:AbortSignal.timeout(20000)});
    if(!response.ok)throw new Error('Error al consultar las hojas');
    const data=await response.json();if(!Array.isArray(data.areas))throw new Error('Respuesta inesperada');render(data);
  }catch(error){
    document.querySelector('#data-status').textContent='LECTURA NO DISPONIBLE';
    document.querySelector('#load-message').textContent='No se pudo actualizar. Si hay cifras previas, corresponden a la última consulta indicada. Reintenta con el botón Actualizar datos.';
    document.querySelector('#announcement').textContent='Error de lectura. No se han modificado los archivos.';
  }finally{busy=false;button.disabled=false;button.textContent='Actualizar datos ↻';}
}
document.querySelector('#refresh').addEventListener('click',refresh);
setInterval(()=>{if(!document.hidden)refresh();},300000);
refresh();
