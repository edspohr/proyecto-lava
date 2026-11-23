'use strict';
const chapters=[['pi','PI','Propiedad Intelectual'],['ar_colombia','AR COL','AR Colombia'],['ar_global_ops','AR GLOBAL OPS','AR Global Ops'],['admin','ADMIN','Administración']];
const fmt=new Intl.NumberFormat('es-CO',{maximumFractionDigits:1});
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let busy=false,lastData=null;
function volcano(key,progress,available,unlocked){
 const level=available?Math.max(0,Math.min(100,Number(progress)||0)):0;
 const height=level*1.48,y=202-height;
 return `<div class="volcano-scene ${available?'':'volcano-dormant'} ${unlocked?'volcano-complete':''}"><span class="volcano-goal">META · 100%</span><svg viewBox="0 0 320 240" aria-hidden="true" focusable="false"><defs><linearGradient id="rock-${key}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#43526b"/><stop offset="1" stop-color="#192538"/></linearGradient><linearGradient id="lava-${key}" x1="0" y1="1" x2="0" y2="0"><stop stop-color="#ee4227"/><stop offset=".6" stop-color="#ff8b35"/><stop offset="1" stop-color="#ffdb76"/></linearGradient><clipPath id="chamber-${key}"><path d="M149 54h22v71l20 64q5 14-11 14h-40q-16 0-11-14l20-64z"/></clipPath></defs><ellipse cx="160" cy="211" rx="127" ry="13" fill="#182b4210"/><path d="M35 203 92 126 128 67 144 53h32l16 14 36 59 57 77z" fill="url(#rock-${key})"/><path d="m144 53-22 90-26 60H35l57-77 36-59z" fill="#60718a" opacity=".45"/><path d="m176 53 16 14 36 59 57 77h-55l-38-76z" fill="#122033" opacity=".45"/><path d="m82 153 14 13-20 36m155-49-14 13 20 36" fill="none" stroke="#a0aec2" stroke-opacity=".2" stroke-width="2"/><path d="M149 54h22v71l20 64q5 14-11 14h-40q-16 0-11-14l20-64z" fill="#0d1726" stroke="#a8b5c0" stroke-opacity=".25" stroke-width="2"/><g clip-path="url(#chamber-${key})"><rect class="volcano-lava" x="125" y="${y}" width="70" height="${height}" fill="url(#lava-${key})"/><path class="lava-surface" d="M125 ${y}q9-4 18 0t18 0 18 0 18 0" fill="none" stroke="#ffe6a0" stroke-width="4" opacity="${level>0?1:0}"/></g><path d="M141 53q19-8 38 0" stroke="#8795aa" stroke-width="4" fill="none"/><path class="volcano-steam" d="M153 35q-10-9 0-18m15 19q10-9 0-21" stroke="${unlocked?'#ed7338':'#94a3b8'}" stroke-width="3" stroke-linecap="round" fill="none"/><path d="M205 54h10m-10 74h10m-10 74h10" stroke="#9aabba" stroke-width="1"/><text x="224" y="58">100</text><text x="224" y="132">50</text><text x="224" y="206">0</text></svg><span class="volcano-caption">${!available?'Esperando universo validado':unlocked?'¡Llegamos a la cima!':level===0?'Todo empieza con la primera gestión':`La lava va al ${fmt.format(level)}%`}</span></div>`;
}
function render(data){
 const available=data.areas.filter(a=>['ok','partial'].includes(a.status));
 const days=Math.max(0,Math.round((Date.parse(data.deadline+'T00:00:00Z')-Date.parse(data.cutoff+'T00:00:00Z'))/86400000));
 document.querySelector('#countdown').textContent=days?`${days} días`:data.cutoff===data.deadline?'Hoy':'Plazo cerrado';
 document.querySelector('#countdown-label').textContent=days?'para completar la meta':data.cutoff===data.deadline?'Último día de campaña':'Cierre: 18 de diciembre';
 document.querySelector('#area-cards').innerHTML=chapters.map(([key,code,label])=>{
  const a=data.areas.find(v=>v.key===key),partial=a?.status==='partial',ok=['ok','partial'].includes(a?.status),countable=ok&&a.total>0;
  const unlocked=countable&&!partial&&a.benefit==='unlocked';
  const reward=!ok?'Sin datos para evaluar':!countable?'Universo por validar':partial?'Beneficio pendiente · universo en revisión':unlocked?'Beneficio desbloqueado':a.benefit==='not_met'?'Meta no alcanzada al cierre':'Beneficio pendiente';
  const tier=(name,title)=>`<div><span>${title}</span><strong>${a[name+'Done']} / ${a[name]}</strong><small>gestionadas</small></div>`;
  const adminDetail=key==='admin'?`<div class="chapter-detail">${(ok?a.fronts:[{label:'Facturación'},{label:'Asociados y corresponsales'},{label:'Validación de fases'}]).map(f=>`<div><span>${escapeHTML(f.label)}</span><strong>${ok?f.status==='pending'?`${fmt.format(f.done)} revisadas`:`${fmt.format(f.done)} / ${fmt.format(f.total)}`:'—'}</strong><small>${!ok?'universo por conciliar':f.status==='pending'?`${fmt.format(f.candidates||0)} candidatas por clasificar`:f.status==='partial'?'revisadas · alcance parcial':'revisiones registradas'}</small></div>`).join('')}</div><p class="chapter-note">ADMIN revisa OTs, no OTAs. Revisar y registrar el estado cuenta aunque el caso siga pendiente. Cada OT cuenta una vez por frente aplicable. ${partial?escapeHTML(a.message):ok?'':escapeHTML(a?.message||'Universo pendiente de validar.')}</p><a class="admin-scope-link" href="#admin">Ver los tres frentes ADMIN</a>`:'';
  const detail=key==='admin'?adminDetail:ok?`<div class="chapter-detail">${tier('historical','Histórico · >365 días')}${tier('reminder','Recordatorio · 91–365 días')}${tier('recent','Sin alerta · hasta 90 días')}</div><p class="chapter-note">${a.unknownDates} sin fecha válida · ${a.adminReferrals} derivaciones a ADMIN</p>`:`<p class="chapter-note">${escapeHTML(a?.message||'Fuente pendiente de conectar')}</p>`;
  return `<article class="area-card ${ok?'':'area-pending'}" aria-labelledby="chapter-${key}"><div class="area-top"><div><span class="area-code">${code}</span><h3 id="chapter-${key}">${label}</h3></div><span class="area-percentage">${countable?`${fmt.format(a.progress)}<small>%</small>`:'—'}</span></div><div class="volcano-meter" ${countable?`role="meter" aria-label="Revisiones registradas ${label}${partial?' sobre universo identificado':''}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${a.progress}"`:'aria-hidden="true"'}>${volcano(key,a?.progress,countable,unlocked)}</div><div class="area-bottom"><span>${partial?`${fmt.format(a.done)} de ${fmt.format(a.total)} revisiones registradas · universo parcial`:ok?`${a.done} de ${a.total} ${key==='admin'?'revisiones registradas':'OTAs revisadas'}`:key==='admin'?'Tres frentes de revisión · porcentaje pendiente':'Lectura pendiente'}</span></div><div class="chapter-benefit ${unlocked?'unlocked':''}">${unlocked?'✓':'○'} ${reward}</div>${detail}</article>`;
 }).join('');
 document.querySelector('#data-status').textContent=`${available.length} DE 4 CAPÍTULOS CON DATOS`;
 document.querySelector('#data-updated').textContent=`Consulta: ${new Intl.DateTimeFormat('es-CO',{timeZone:data.timezone,dateStyle:'short',timeStyle:'short'}).format(new Date(data.fetchedAt))}`;
 document.querySelector('#load-message').textContent=`Universo PI/AR del ${data.sourceSnapshotDate}. La hora de consulta no equivale a una nueva extracción de Pipefy. Las fuentes pendientes no bloquean el beneficio de otro equipo.`;
 document.querySelector('#sync-explanation').textContent=data.writebackEnabled?'La transferencia se ejecuta por lotes. Consulta SINCRONIZACIÓN para saber si cada gestión fue confirmada en Pipefy.':'El envío a Pipefy aún no está activado. Las gestiones quedan guardadas en Sheets; consulta SINCRONIZACIÓN. Marcar una OT como radicada no mueve su tarjeta en Pipefy.';
 document.querySelector('#announcement').textContent=data.complete?'Avance actualizado.':available.length===4?'Los cuatro capítulos tienen datos. ADMIN conserva un universo parcial en revisión.':`Se muestran ${available.length} capítulos disponibles. Los demás están pendientes de lectura o conexión.`;
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
