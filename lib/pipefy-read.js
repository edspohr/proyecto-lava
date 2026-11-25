'use strict';
const {normalize}=require('./rules');
const {INFORMATION}=require('./sheet-schema');
const LABELS={
 'País de la actividad':['País de la actividad','País de trámite','País del Trámite','País de Trámite'],
 'Nombre del proyecto':['Nombre del proyecto'],
 'Actuación en inglés':['Actuación en inglés','Actuación SPI (AR,en)','Actuación (eng)'],
 'Actuación en español':['Actuación en español','Actuación SPI (AR,es)','Actuación (esp)']
};
function discoverFields(pipe,overrides={}){
 const fields=[...(pipe.start_form_fields||[]),...(pipe.phases||[]).flatMap(p=>p.fields||[])];
 const unique=[...new Map(fields.map(f=>[String(f.id),f])).values()],mapping={},issues=[];
 for(const name of INFORMATION){
  const matches=unique.filter(f=>overrides[name]?String(f.id)===overrides[name]:LABELS[name].map(normalize).includes(normalize(f.label)));
  if(matches.length===1)mapping[name]={id:String(matches[0].id),label:matches[0].label};
  else issues.push({name,reason:matches.length?'ambiguous':'missing',candidates:matches.map(f=>({id:f.id,label:f.label}))});
 }
 return {mapping,issues,fields:unique};
}
function mapCard(card,mapping){
 const fields=new Map((card.fields||[]).map(f=>[String(f.field.id),f]));
 return Object.fromEntries(INFORMATION.map(name=>[name,mapping[name]?(fields.get(mapping[name].id)?.report_value??fields.get(mapping[name].id)?.value??''):null]));
}
function readOnlyClient(token,request=fetch){
 if(!token)throw Error('Configura PIPEFY_TOKEN fuera del código');
 return async function(query,variables={}){
  if(!/^\s*query\b/.test(query)||/\bmutation\b/.test(query))throw Error('El colector solo permite consultas Pipefy');
  const response=await request('https://api.pipefy.com/graphql',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({query,variables}),signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw Error('Lectura Pipefy HTTP '+response.status);
  const result=await response.json();if(result.errors?.length||!result.data)throw Error('Pipefy rechazó la lectura');return result.data;
 };
}
async function hydrateCards(ids,query){
 const cards=[];
 for(let start=0;start<ids.length;start+=20){
  const batch=ids.slice(start,start+20).map(String);if(batch.some(id=>!/^\d+$/.test(id)))throw Error('ID inválido para lectura');
  const result=await query('query { '+batch.map((id,i)=>`c${i}:card(id:${id}){id updated_at pipe{id} current_phase{id name} fields{name value report_value field{id}}}`).join(' ')+' }');
  batch.forEach((id,i)=>{const card=result['c'+i];if(!card||String(card.id)!==id)throw Error('Tarjeta no accesible: '+id);cards.push(card);});
 }
 return cards;
}
module.exports={LABELS,discoverFields,mapCard,readOnlyClient,hydrateCards};
