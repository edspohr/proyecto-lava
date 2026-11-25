// Private, dry-run-first operator. No Pipefy mutations or deployment capability.
'use strict';
const fs=require('node:fs');const path=require('node:path');
const {planMigration,digest,rowsOf,value}=require('../lib/migration');
function save(file,data){fs.writeFileSync(file,JSON.stringify(data,null,2),{mode:0o600,flag:'wx'});}
async function google(url,options={}){
 const token=process.env.GOOGLE_ACCESS_TOKEN;if(!token)throw Error('Configura GOOGLE_ACCESS_TOKEN fuera del repositorio');
 const response=await fetch('https://sheets.googleapis.com/v4/spreadsheets/'+url,{...options,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},signal:AbortSignal.timeout(60000)});
 if(!response.ok)throw Error('Google Sheets HTTP '+response.status);return response.json();
}
async function main(){
 const args=process.argv.slice(2),input=args.find(a=>!a.startsWith('--'));
 if(!input)throw Error('Uso: node scripts/lava-migrate.cjs input.json [--capture] [--apply --approved=HASH --maintenance-window]');
 const absolute=path.resolve(input),dir=path.dirname(absolute),data=JSON.parse(fs.readFileSync(absolute,'utf8'));
 if(args.includes('--capture')){
  if(args.includes('--apply'))throw Error('Captura y aplicación son pasos separados');
  const books={};for(const [team,id] of Object.entries(data.spreadsheetIds))books[team]=await google(id+'?includeGridData=true');
  const target=path.join(dir,'capture-'+Date.now()+'.json');save(target,{...data,books,completeBackup:true,observedAt:new Date().toISOString()});
  console.log(JSON.stringify({mode:'read-only-capture',file:target}));return;
 }
 const plan=planMigration(data.books,data.inventory,{snapshot:data.snapshot,absentPolicy:data.absentPolicy||'retain',informationById:data.informationById,informationExceptions:data.informationExceptions,extendFilterRanges:data.extendFilterRanges===true});
 if(!args.includes('--apply')){
  const target=path.join(dir,'plan-'+Date.now()+'.json');save(target,plan);
  const categories=items=>Object.fromEntries([...new Set(items.map(i=>i.type))].map(type=>[type,items.filter(i=>i.type===type).length]));
  console.log(JSON.stringify({mode:'dry-run',digest:plan.digest,report:{...plan.report,conflicts:categories(plan.report.conflicts),warnings:categories(plan.report.warnings)},file:target},null,2));return;
 }
 if(args.find(a=>a.startsWith('--approved='))?.slice('--approved='.length)!==plan.digest)throw Error('Se requiere autorización del hash exacto del dry-run');
 if(!args.includes('--maintenance-window'))throw Error('Coordina una pausa de edición antes de aplicar');
 if(!data.completeBackup)throw Error('Falta captura completa y reciente de todos los archivos');
 if(!data.pipefyObservedAt||Date.now()-Date.parse(data.pipefyObservedAt)>15*60000)throw Error('Requiere lectura Pipefy de menos de 15 minutos');
 if(!plan.report.canApply)throw Error('Dry-run bloqueado: resolver conflictos y advertencias antes de aplicar');
 const lock=path.join(dir,'migration.lock');const fd=fs.openSync(lock,'wx',0o600);
 try{
  // All workbooks are backed up before the first production write.
  const before={};for(const [team,p] of Object.entries(plan.plans)){
   before[team]=await google(p.spreadsheetId+'?includeGridData=true');
   if(digest(before[team])!==p.sourceDigest)throw Error('Cambio concurrente en '+team+': genera un nuevo dry-run');
  }
  const backup=path.join(dir,'before-apply-'+Date.now()+'.json');save(backup,before);
  const journal=path.join(dir,'apply-'+Date.now()+'.json'),state={digest:plan.digest,backup,teams:{}};save(journal,state);
  const persist=()=>fs.writeFileSync(journal,JSON.stringify(state,null,2),{mode:0o600});
  for(const [team,p] of Object.entries(plan.plans)){
   if(!p.requests.length)continue;
   const current=await google(p.spreadsheetId+'?includeGridData=true');
   if(digest(current)!==p.sourceDigest)throw Error('Cambio concurrente en '+team+'; detener y reconciliar');
   state.teams[team]='sending';persist();
   // Each workbook batch is atomic. Cross-workbook transactions do not exist.
   await google(p.spreadsheetId+':batchUpdate',{method:'POST',body:JSON.stringify({requests:p.requests})});
   const after=await google(p.spreadsheetId+'?includeGridData=true');
   for(const sheet of before[team].sheets){
    const fresh=after.sheets.find(s=>s.properties.sheetId===sheet.properties.sheetId);
    for(const field of ['basicFilter','filterViews','protectedRanges']){
     const expected=sheet.properties.sheetId===p.sheetId&&p.expectedFilters&&field!=='protectedRanges'?p.expectedFilters[field]:sheet[field];
     if(digest(expected)!==digest(fresh[field]))throw Error('Verificación fallida: '+field+' en '+team);
    }
   }
   // Verify user-entered management fields are unchanged in all original rows.
   const original=before[team].sheets.find(s=>s.properties.sheetId===p.sheetId),fresh=after.sheets.find(s=>s.properties.sheetId===p.sheetId);
   const oldRows=rowsOf(original),newRows=rowsOf(fresh);
   const {headerIndex}=require('../lib/sheet-schema'),ix=headerIndex(oldRows[0].map(value));
   for(let r=1;r<oldRows.length;r++)for(const h of ['Responsable','ESTADO LAVA','FECHA DE GESTIÓN','OBSERVACIÓN LAVA','EVIDENCIA','FACTURA','ASOCIADO','OC','FACTURA ASOCIADO','SINCRONIZACIÓN']){
    const c=ix(h);if(c>=0&&digest(oldRows[r]?.[c]?.userEnteredValue)!==digest(newRows[r]?.[c]?.userEnteredValue))throw Error('Gestión alterada durante verificación en '+team);
   }
   state.teams[team]='verified';persist();
   save(path.join(dir,'after-'+team+'-'+Date.now()+'.json'),after);
  }
  console.log(JSON.stringify({mode:'applied',journal,backup,teams:state.teams}));
 }finally{fs.closeSync(fd);fs.unlinkSync(lock);}
}
if(require.main===module)main().catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports={main};
