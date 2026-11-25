// Read-only discovery + hydration. Does not modify Apps Script, Sheets, or Pipefy.
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {readOnlyClient,discoverFields,mapCard,hydrateCards}=require('../lib/pipefy-read');
const {rowsOf,value}=require('../lib/migration');
const {headerIndex}=require('../lib/sheet-schema');
async function main(){
 const input=path.resolve(process.argv[2]||''),data=JSON.parse(fs.readFileSync(input,'utf8')),query=readOnlyClient(process.env.PIPEFY_TOKEN);
 const allIds=new Set(),pipeIds=new Set();
 for(const [team,book] of Object.entries(data.books)){
  if(team==='dashboard')continue;
  const sheet=book.sheets.find(s=>s.properties.title===(team==='admin'?'LAVA ADMIN':'LAVA 2026')),rows=rowsOf(sheet),ix=headerIndex(rows[0].map(value));
  for(const row of rows.slice(1)){const id=String(value(row[ix('ID')]));if(id){allIds.add(id);pipeIds.add(String(value(row[ix('PIPE ID')])));}}
 }
 for(const cards of Object.values(data.inventory))for(const card of cards){allIds.add(String(card.id));pipeIds.add(String(card.pipeId));}
 const discoveries={};
 for(const id of pipeIds){
  const {pipe}=await query('query($id:ID!){pipe(id:$id){id start_form_fields{id label type} phases{id name fields{id label type}}}}',{id});
  discoveries[id]=discoverFields(pipe,data.fieldOverrides?.[id]);
 }
 const cards=await hydrateCards([...allIds],query),informationById={};
 for(const card of cards){const discovery=discoveries[String(card.pipe.id)];informationById[String(card.id)]=discovery?mapCard(card,discovery.mapping):{};}
 const live=new Map(cards.map(c=>[String(c.id),c]));
 for(const inventory of Object.values(data.inventory))for(const item of inventory){const card=live.get(String(item.id));if(String(card.pipe.id)!==String(item.pipeId)||card.current_phase.name!==item.phase)throw Error('Pipe o fase cambió desde el export; obtener nuevos reportes antes de continuar');}
 const output=path.join(path.dirname(input),'hydrated-'+Date.now()+'.json');
 fs.writeFileSync(output,JSON.stringify({...data,informationById,discoveries,pipefyObservedAt:new Date().toISOString()}),{mode:0o600,flag:'wx'});
 console.log(JSON.stringify({mode:'read-only',output,cards:cards.length,issues:Object.fromEntries(Object.entries(discoveries).map(([id,d])=>[id,d.issues]))},null,2));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
