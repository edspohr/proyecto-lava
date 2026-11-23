const{test}=require('node:test');const assert=require('node:assert/strict');
const {parseCSV,parseDate,summarize,parseSummary,recordsFromRows}=require('../lib/otas');
const {OTA_STATES,ADMIN_STATES,managementComplete,ageTier,benefit}=require('../lib/rules');
const headers=['ID','PIPE ID','OT','Fecha Solicitud OT','Fase actual','ESTADO LAVA','FECHA DE GESTIÓN','OBSERVACIÓN LAVA'];
const row=(id,date,state=OTA_STATES[0],contact='2026-11-23',note='Falta poder; solicitarlo el 24/11')=>[id,'301834596',id,date,'StandBy por Cliente',state,contact,note];
test('CSV handles multiline quoted notes, BOM and reordered headers',()=>{
 assert.deepEqual(parseCSV('\ufeffA,B\r\n"one,two","line1\n""two"""\r\n'),[['A','B'],['one,two','line1\n"two"']]);assert.throws(()=>parseCSV('a,"unfinished'));
 const input=[headers,row('1','2025-01-01')].map(r=>r.toReversed());assert.equal(summarize(input,'2026-11-23').done,1);
});
test('exclusive age tiers include 90, 91, 365, 366 and leap-year boundaries',()=>{
 const cutoff='2026-11-23',day=parseDate(cutoff),date=days=>new Date(day-days*86400000).toISOString().slice(0,10);
 assert.equal(ageTier(date(90),cutoff),'recent');assert.equal(ageTier(date(91),cutoff),'reminder');assert.equal(ageTier(date(365),cutoff),'reminder');assert.equal(ageTier(date(366),cutoff),'historical');
 assert.equal(ageTier('2023-03-01','2024-02-29'),'reminder');assert.equal(ageTier('2023-02-28','2024-02-29'),'historical');
 const s=summarize([headers,...[90,91,365,366].map((d,i)=>row(String(i),date(d)))],cutoff);assert.equal(s.total,4);assert.equal(s.historical,1);assert.equal(s.reminder,2);assert.equal(s.recent,1);assert.equal(s.progress,100);
});
test('only allowed state + real non-future date + nonblank observation count',()=>{
 const base={state:OTA_STATES[0],contactDate:'2026-11-23',observation:'Falta documento; solicitar mañana'};
 assert(managementComplete(base,'2026-11-23'));
 for(const patch of [{state:'Listo'},{contactDate:''},{contactDate:'2026-11-24'},{contactDate:'2026-02-30'},{observation:'  \n '}])assert.equal(managementComplete({...base,...patch},'2026-11-23'),false);
 assert.equal(managementComplete({...base,contactDate:'2026-12-19'},'2026-12-20'),false);
 assert.equal(parseDate('23/11/2026'),Date.UTC(2026,10,23));assert.equal(parseDate(45208),Date.UTC(2023,9,9));
});
test('universe stays frozen after operational phase changes and includes young OTAs',()=>{
 const s=summarize([headers,row('1','2026-11-20'),['2','301834596','2','2025-01-01','Cerrada',OTA_STATES[7],'2026-11-23','Radicada; enviar soporte ADMIN']],'2026-11-23');
 assert.equal(s.total,2);assert.equal(s.done,2);assert.equal(s.adminReferrals,1);assert.equal(s.recent,1);
});
test('duplicate IDs fail, same card can count once in each ADMIN front',()=>{
 assert.throws(()=>summarize([headers,row('1',''),row('1','')],'2026-11-23'),/duplicado/);
 const h=[...headers,'FRENTE','FACTURA','ASOCIADO','OC','FACTURA ASOCIADO'];
 const a=[...row('1','2025-01-01','Facturada'),'facturacion','F-123','','',''];
 const b=[...row('1','2025-01-01',ADMIN_STATES.asociados[0]),'asociados','','Proveedor','OC-1','F-99'];
 const s=summarize([h,a,b],'2026-11-23',{admin:true});assert.equal(s.total,2);assert.equal(s.done,2);assert.equal(s.fronts[0].done,1);
 a[9]='';assert.equal(summarize([h,a,b],'2026-11-23',{admin:true}).done,1);
 b[11]='';assert.equal(summarize([h,a,b],'2026-11-23',{admin:true}).done,0);
 assert.throws(()=>recordsFromRows([h,[...row('1',''),'desconocido']],true),/Frente/);
});
test('benefits are independent, empty universe does not unlock and late input does not qualify',()=>{
 assert.equal(benefit(3,3,'2026-11-23'),'unlocked');assert.equal(benefit(3,2,'2026-11-23'),'pending');assert.equal(benefit(0,0,'2026-11-23'),'pending');assert.equal(benefit(3,2,'2026-12-19'),'not_met');
});
function summaryRows(prefix='') {return [['metric','value'],...Object.entries({version:'2',cutoff:'2026-11-23',snapshot:'2026-11-17',total:4,done:2,historical:1,historicalDone:1,reminder:2,reminderDone:0,recent:1,recentDone:1,unknownDates:0,unknownDatesDone:0,adminReferrals:1}).map(([k,v])=>[prefix+k,String(v)])];}
test('summary requires matching rules, snapshot and exclusive complete counts',()=>{
 assert.equal(parseSummary(summaryRows(),'2026-11-23').progress,50);
 assert.equal(parseSummary([['metric','value'],['version','1'],...summaryRows('v2_').slice(1)],'2026-11-23').progress,50);
 assert.equal(parseSummary(summaryRows('pi_'),'2026-11-23',{metricPrefix:'pi_'}).progress,50);
 assert.throws(()=>parseSummary(summaryRows(),'2026-11-24'),/corte/);
 assert.throws(()=>parseSummary([...summaryRows(),['done','2']],'2026-11-23'),/repetida/);
 assert.throws(()=>parseSummary(summaryRows().map(r=>r[0]==='reminder'?['reminder','3']:r),'2026-11-23'),/inconsistentes/);
 assert.throws(()=>parseSummary(summaryRows().map(r=>r[0]==='version'?['version','1']:r),'2026-11-23'),/migrar/);
});
function adminSummaryRows(cutoff='2026-11-23') {
 return Object.entries({version:'2',cutoff,snapshot:'2026-11-23',universeValidated:'FALSE',total:'4427',done:'0',facturacion_total:'0',facturacion_done:'0',facturacion_status:'pending',facturacion_candidates:'4434',asociados_total:'200',asociados_done:'0',asociados_status:'partial',fases_total:'4227',fases_done:'0',fases_status:'ok'}).map(([k,v])=>['admin_'+k,v]);
}
test('ADMIN partial counts stay visible without inventing an invoicing total or benefit',()=>{
 const rows=[['metric','value'],...adminSummaryRows()];const result=parseSummary(rows,'2026-11-23',{admin:true,snapshot:'2026-11-23',metricPrefix:'admin_'});
 assert.equal(result.status,'partial');assert.equal(result.total,4427);assert.equal(result.progress,0);assert.equal(result.progressProvisional,true);assert.equal(result.benefit,'pending');assert.equal(result.fronts[0].status,'pending');assert.equal(result.fronts[0].candidates,4434);assert.equal(result.fronts[1].total,200);assert.equal(result.fronts[2].total,4227);
 assert.throws(()=>parseSummary(rows.map(r=>r[0]==='admin_fases_total'?[r[0],'4228']:r),'2026-11-23',{admin:true,snapshot:'2026-11-23',metricPrefix:'admin_'}),/incompletos/);
});
test('API returns only aggregates, independently available chapters and no upstream error content',async()=>{
 const original=global.fetch,config=require('../sources.json'),prefixes=config.sources.filter(s=>s.summaryUrl&&s.key!=='admin').map(s=>s.metricPrefix||'v2_');
 const cutoff=new Intl.DateTimeFormat('en-CA',{timeZone:config.agePolicy.timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const csv=[['metric','value'],['version','1'],...prefixes.flatMap(p=>summaryRows(p).slice(1).map(([k,v])=>[k,k.endsWith('cutoff')?cutoff:v])),...adminSummaryRows(cutoff)].map(r=>r.join(',')).join('\n');
 global.fetch=async()=>({ok:true,text:async()=>csv});
 try{let body;await require('../api/metrics')({method:'GET'},{setHeader(){},end(v){body=JSON.parse(v)}});assert.equal(body.areas.length,4);assert.equal(body.areas[0].progress,50);assert.equal(body.areas[3].status,'partial');assert.equal(body.areas[0].benefit,'pending');assert(!JSON.stringify(body).includes('docs.google.com'));assert(!('global'in body));
 global.fetch=async()=>{throw Error('private-client-secret')};await require('../api/metrics')({method:'GET'},{setHeader(){},end(v){body=JSON.parse(v)}});assert(!JSON.stringify(body).includes('private-client-secret'));
 }finally{global.fetch=original;}
});

test('reviewed pending cases count without payment, closure, documents or an OC',()=>{
 const base={contactDate:'2026-11-23',observation:'Caso revisado; próxima acción definida',paid:false,closed:false};
 const cases=[{state:'Pendiente recibir pago para radicación'}, {state:OTA_STATES[0]}, {front:'facturacion',state:'Pendiente facturar'}, {front:'facturacion',state:'Aún no facturable (espera radicación o resolución)'}, {front:'asociados',state:'Falta OC'}, {front:'fases',phase:'Esperando Pago del Cliente 💵',state:'Confirmado pendiente pago'}, {front:'fases',phase:'Proceso de Radicación👌',state:'Pendiente recaudo'}, {front:'fases',phase:'Completadas🏁',state:'Pendiente facturación'}];
 for(const entry of cases){assert.equal(managementComplete({...base,...entry},'2026-11-23'),true,entry.state);assert.equal(managementComplete({...base,...entry,observation:''},'2026-11-23'),false);}
});
