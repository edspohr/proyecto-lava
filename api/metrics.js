'use strict';
const config=require('../sources.json');
const {parseCSV,summarize,parseSummary}=require('../lib/otas');
const {DEADLINE,BENEFIT_DATES}=require('../lib/rules');
module.exports=async function handler(req,res){
 if(req.method!=='GET'){res.statusCode=405;res.setHeader('Allow','GET');return res.end();}
 const now=new Date(), cutoff=new Intl.DateTimeFormat('en-CA',{timeZone:config.agePolicy.timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 const reads=new Map();
 const areas=await Promise.all(config.sources.map(async source=>{
  const base={key:source.key,label:source.label,unit:source.key==='admin'?'revisiones':'OTAs',universeSnapshot:source.snapshot||config.dataset.exportedOn};
  if(!source.spreadsheetId && !source.summaryUrl)return {...base,status:'pending',message:source.pendingReason||'Universo pendiente de conectar'};
  try{
   const url=new URL(source.readMode==='published_summary'?source.summaryUrl:`https://docs.google.com/spreadsheets/d/${source.spreadsheetId}/gviz/tq`);
   if(source.readMode!=='published_summary'){url.searchParams.set('tqx','out:csv');url.searchParams.set('gid',source.gid);url.searchParams.set('headers','1');}
   // Google may cache a published export URL despite no-cache. Share one fresh
   // snapshot per request so all chapters are evaluated against identical bytes.
   url.searchParams.set('cache',String(now.getTime()));
   const key=url.toString();
   if(!reads.has(key))reads.set(key,(async()=>{
    const response=await fetch(url,{signal:AbortSignal.timeout(12000),headers:{'Cache-Control':'no-cache'}});
    if(!response.ok)throw new Error('Fuente no disponible');
    const csv=await response.text();if(/^\s*</.test(csv))throw new Error('Fuente privada o sin acceso');return csv;
   })());
   const csv=await reads.get(key);
   const options={admin:source.key==='admin',snapshot:source.snapshot||config.dataset.exportedOn,metricPrefix:source.metricPrefix||''};
   const summary=source.readMode==='published_summary'?parseSummary(parseCSV(csv),cutoff,options):summarize(parseCSV(csv),cutoff,options);
   return {...base,status:'ok',...summary};
  }catch{ return {...base,status:'error',message:'No se pudo validar la fuente. Reintenta o consulta al administrador.'}; }
 }));
 res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.statusCode=200;
 // Explicit aggregate-only schema: no source URLs, clients, card IDs, assignees or notes.
 res.end(JSON.stringify({fetchedAt:now.toISOString(),cutoff,timezone:config.agePolicy.timezone,deadline:DEADLINE,benefitDates:BENEFIT_DATES,formula:'complete_management_over_active_universe',campaignRulesConfirmed:true,sourceSnapshotDate:config.dataset.exportedOn,writebackEnabled:config.writeback.enabled,complete:areas.every(a=>a.status==='ok'),areas}));
};
