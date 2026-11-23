'use strict';
const chapters=[['pi','PI','Propiedad Intelectual'],['ar_colombia','AR COL','AR Colombia'],['ar_global_ops','AR GLOBAL OPS','AR Global Ops'],['admin','ADMIN','Administración']];
const fmt=new Intl.NumberFormat('es-CO',{maximumFractionDigits:1});
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let busy=false,lastData=null;
function render(data){
 const available=data.areas.filter(a=>a.status==='ok');
 const days=Math.max(0,Math.round((Date.parse(data.deadline+'T00:00:00Z')-Date.parse(data.cutoff+'T00:00:00Z'))/86400000));
 document.querySelector('#countdown').textContent=days?`${days} días`:data.cutoff===data.deadline?'Hoy':'Plazo cerrado';
 document.querySelector('#countdown-label').textContent=days?'para completar la meta':data.cutoff===data.deadline?'Último día de campaña':'Cierre: 18 de diciembre';
 document.querySelector('#area-cards').innerHTML=chapters.map(([key,code,label])=>{
  const a=data.areas.find(v=>v.key===key),ok=a?.status==='ok',countable=ok&&a.total>0;
  const unlocked=countable&&a.benefit==='unlocked';
  const reward=!ok?'Sin datos para evaluar':!countable?'Universo por validar':unlocked?'Beneficio desbloqueado':a.benefit==='not_met'?'Meta no alcanzada al cierre':'Beneficio pendiente';
  const tier=(name,title)=>`<div><span>${title}</span><strong>${a[name+'Done']} / ${a[name]}</strong><small>gestionadas</small></div>`;
  const detail=ok?(key==='admin'?`<div class="chapter-detail">${a.fronts.map(f=>`<div><span>${escapeHTML(f.label)}</span><strong>${f.done} / ${f.total}</strong><small>revisiones completas</small></div>`).join('')}</div><p class="chapter-note">Cada OT cuenta una vez por frente aplicable.</p>`:`<div class="chapter-detail">${tier('historical','Histórico · >365 días')}${tier('reminder','Recordatorio · 91–365 días')}${tier('recent','Sin alerta · hasta 90 días')}</div><p class="chapter-note">${a.unknownDates} sin fecha válida · ${a.adminReferrals} derivaciones a ADMIN</p>`):`<p class="chapter-note">${escapeHTML(a?.message||'Fuente pendiente de conectar')}</p>`;
  return `<article class="area-card ${ok?'':'area-pending'}" aria-labelledby="chapter-${key}"><div class="area-top"><div><span class="area-code">${code}</span><h3 id="chapter-${key}">${label}</h3></div><span class="area-percentage">${countable?`${fmt.format(a.progress)}<small>%</small>`:'—'}</span></div><div class="area-track" ${countable?`role="meter" aria-label="Cumplimiento ${label}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${a.progress}"`:'aria-hidden="true"'}><span style="width:${countable?a.progress:0}%"></span></div><div class="area-bottom"><span>${ok?`${a.done} de ${a.total} ${key==='admin'?'revisiones':'OTAs'} con gestión completa`:'Lectura pendiente'}</span></div><div class="chapter-benefit ${unlocked?'unlocked':''}">${unlocked?'✓':'○'} ${reward}</div>${detail}</article>`;
 }).join('');
 document.querySelector('#data-status').textContent=`${available.length} DE 4 CAPÍTULOS LEÍDOS`;
 document.querySelector('#data-updated').textContent=`Consulta: ${new Intl.DateTimeFormat('es-CO',{timeZone:data.timezone,dateStyle:'short',timeStyle:'short'}).format(new Date(data.fetchedAt))}`;
 document.querySelector('#load-message').textContent=`Universo PI/AR del ${data.sourceSnapshotDate}. La hora de consulta no equivale a una nueva extracción de Pipefy. Las fuentes pendientes no bloquean el beneficio de otro equipo.`;
 document.querySelector('#sync-explanation').textContent=data.writebackEnabled?'La transferencia se ejecuta por lotes. Consulta SINCRONIZACIÓN para saber si cada gestión fue confirmada en Pipefy.':'El envío a Pipefy aún no está activado. Las gestiones quedan guardadas en Sheets; consulta SINCRONIZACIÓN. Marcar una OT como radicada no mueve su tarjeta en Pipefy.';
 document.querySelector('#announcement').textContent=data.complete?'Avance actualizado.':`Se muestran ${available.length} capítulos disponibles. Los demás están pendientes de lectura o conexión.`;
}
async function refresh(){
 if(busy)return;busy=true;const button=document.querySelector('#refresh');button.disabled=true;button.textContent='Leyendo…';
 try{
  const response=await fetch('/api/metrics',{cache:'no-store',signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw Error('Lectura fallida');const data=await response.json();
  if(!Array.isArray(data.areas)||!/^\d{4}-\d{2}-\d{2}$/.test(data.cutoff)||!data.deadline)throw Error('Respuesta inválida');
  render(data);lastData=data;
 }catch{
  document.querySelector('#data-status').textContent='LECTURA NO DISPONIBLE';
  document.querySelector('#load-message').textContent=lastData?'Las cifras visibles son de la última consulta indicada; no se pudo actualizar.':'No se pudo leer el avance. Reintenta con Actualizar datos.';
  document.querySelector('#announcement').textContent='No se han actualizado las cifras.';
 }finally{busy=false;button.disabled=false;button.textContent='Actualizar datos ↻';}
}
document.querySelector('#refresh').addEventListener('click',refresh);
setInterval(()=>{if(!document.hidden)refresh();},300000);
refresh();
