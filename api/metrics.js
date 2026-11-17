'use strict';
const config = require('../sources.json');
const {parseCSV,summarize,parseSummary}=require('../lib/otas');
module.exports=async function handler(req,res){
  if(req.method!=='GET'){res.statusCode=405;res.setHeader('Allow','GET');return res.end();}
  const now=new Date();
  const cutoff=new Intl.DateTimeFormat('en-CA',{timeZone:config.agePolicy.timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
  const areas=await Promise.all(config.sources.map(async source=>{
    const base={key:source.key,label:source.label,sheetUrl:source.readMode==='published_summary'?source.summaryUrl:source.spreadsheetId?`https://docs.google.com/spreadsheets/d/${source.spreadsheetId}/edit#gid=${source.gid}`:null};
    if(!source.spreadsheetId && source.readMode!=='published_summary')return {...base,status:'pending',message:'Archivo pendiente de conectar'};
    try{
      const url=new URL(source.readMode==='published_summary'?source.summaryUrl:`https://docs.google.com/spreadsheets/d/${source.spreadsheetId}/gviz/tq`);
      if(source.readMode!=='published_summary'){url.searchParams.set('tqx','out:csv');url.searchParams.set('gid',source.gid);url.searchParams.set('headers','1');}
      const response=await fetch(url,{signal:AbortSignal.timeout(12000),headers:{'Cache-Control':'no-cache'}});
      if(!response.ok)throw new Error('La hoja no está disponible para lectura');
      const text=await response.text();
      if(/^\s*</.test(text))throw new Error('La hoja requiere acceso o devuelve una página de inicio de sesión');
      return {...base,status:'ok',...(source.readMode==='published_summary'?parseSummary(parseCSV(text),cutoff):summarize(parseCSV(text),cutoff,source.includedPhases))};
    }catch(error){return {...base,status:'error',message:error.name==='TimeoutError'?'La lectura tardó demasiado':error.message};}
  }));
  const available=areas.filter(a=>a.status==='ok');
  const complete=available.length===config.sources.length;
  const global=complete?available.reduce((n,a)=>n+a.progress,0)/areas.length:null;
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store');
  res.statusCode=200;
  // Only aggregates leave this endpoint; no clients, notes, assignees or card contents.
  res.end(JSON.stringify({fetchedAt:now.toISOString(),cutoff,timezone:config.agePolicy.timezone,formula:'historical_category_average',campaignRulesConfirmed:false,sourceSnapshotDate:config.dataset?.exportedOn,global,complete,areas}));
};
