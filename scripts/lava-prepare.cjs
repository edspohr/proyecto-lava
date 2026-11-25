// Assemble local connector captures and read-only report exports. No network/write APIs.
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {headerIndex,INFORMATION}=require('../lib/sheet-schema');
const {LABELS}=require('../lib/pipefy-read');
const {rowsOf,value}=require('../lib/migration');
const dir=path.resolve(process.argv[2]||'.private/lava-20261124');
const teams=['pi','ar_colombia','ar_global_ops','admin'],books={},inventory={};
const pipes={pi:'301834596',ar_colombia:'301584251',ar_global_ops:'307290381',admin:'301633616'};
for(const team of teams){
 const capture=JSON.parse(fs.readFileSync(path.join(dir,team+'-cells.json'))),extra=JSON.parse(fs.readFileSync(path.join(dir,team+'-summaries.json')));
 const sheets=new Map();
 for(const part of [...capture.parts,extra])for(const sheet of part.sheets){
  const prior=sheets.get(sheet.properties.sheetId);if(prior)prior.data.push(...sheet.data);else sheets.set(sheet.properties.sheetId,structuredClone(sheet));
 }
 books[team]={spreadsheetId:capture.metadata.spreadsheetId,sheets:[...sheets.values()]};
 const file=path.join(dir,team+'-pipefy.json');
 if(!fs.existsSync(file)){inventory[team]=[];continue;}
 const [headers,...rows]=JSON.parse(fs.readFileSync(file)),ix=headerIndex(headers);
 const find=names=>names.map(ix).find(c=>c>=0)??-1;
 const info=Object.fromEntries(INFORMATION.map(h=>[h,find(LABELS[h])]));
 const date=ix('Fecha Solicitud OT');
 inventory[team]=rows.filter(r=>r[ix('ID')]).map(r=>({id:r[ix('ID')],pipeId:pipes[team],ot:r[ix('OT')],phase:r[ix('Fase actual')],client:r[ix('Cliente')]||'',date:date>=0&&r[date]?Number(r[date])||r[date]:'',responsible:r[find(['Encargado SPI','Encargado'])]||'',info:Object.fromEntries(INFORMATION.map(h=>[h,info[h]<0?null:r[info[h]]||'']))}));
}
// Include previously-observed filter/protection metadata only as context, never as a fresh backup.
const context=path.join(dir,'structure-context.json');
if(fs.existsSync(context))for(const [team,book] of Object.entries(JSON.parse(fs.readFileSync(context))))for(const sheet of books[team].sheets){
 const source=book.sheets.find(s=>s.properties.sheetId===sheet.properties.sheetId);if(source)for(const k of ['basicFilter','filterViews','protectedRanges'])if(source[k])sheet[k]=source[k];
}
const dashboard=path.join(dir,'dashboard-cells.json');if(fs.existsSync(dashboard))books.dashboard=JSON.parse(fs.readFileSync(dashboard));
const result={snapshot:'2026-11-24',absentPolicy:'archive',extendFilterRanges:process.argv.includes('--extend-filter-ranges'),completeBackup:false,spreadsheetIds:Object.fromEntries(Object.entries(books).map(([t,b])=>[t,b.spreadsheetId])),books,inventory,notes:['Captura local de celdas; requiere --capture completo inmediatamente antes de aplicar.','Ausentes AR archivados por decisión del usuario del 24/11/2026.']};
fs.writeFileSync(path.join(dir,'migration-input.json'),JSON.stringify(result),{mode:0o600});
console.log(JSON.stringify({file:path.join(dir,'migration-input.json'),teams:Object.fromEntries(teams.map(t=>[t,{rows:rowsOf(books[t].sheets[0]).length-1,pipefy:inventory[t].length}]))}));
