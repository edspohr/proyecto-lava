'use strict';
const crypto=require('node:crypto');
const {managementComplete}=require('./rules');
const ALLOWED_PIPES=new Set(['301834596','301584251','307290381','301633616']);
function prepareBatch(records,cutoff) {
 const seen=new Set();
 return records.filter(r=>managementComplete(r,cutoff)).map(r=>{
  if(!ALLOWED_PIPES.has(String(r.pipeId))||!/^\d+$/.test(String(r.id)))throw Error('Destino fuera del alcance autorizado');
  if(!String(r.responsible||'').trim())throw Error('Responsable requerido para conservar autoría');
  const key=[r.pipeId,r.id,r.front||'ota'].join(':');if(seen.has(key))throw Error('Revisión duplicada');seen.add(key);
  const payload={key,ot:r.ot,state:r.state,date:r.contactDate,observation:r.observation,responsible:r.responsible,evidence:r.evidence||'',invoice:r.invoice||'',associate:r.associate||'',purchaseOrder:r.purchaseOrder||'',associateInvoice:r.associateInvoice||''};
  const hash=crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  const marker=`[LAVA2026:${hash}]`;
  const text=[marker,`LAVA 2026 · OT ${r.ot}${r.front?' · '+r.front:''}`,`Responsable declarado: ${r.responsible}`,`Estado: ${r.state}`,`Fecha de gestión: ${r.contactDate}`,`Observación y próxima acción: ${r.observation}`,...[['Evidencia',r.evidence],['Factura',r.invoice],['Asociado',r.associate],['OC',r.purchaseOrder],['Factura asociado',r.associateInvoice]].filter(([,v])=>v).map(([k,v])=>`${k}: ${v}`),'Registro trasladado desde Sheets por cuenta técnica; no confirma cambio de fase.'].join('\n');
  return {key,cardId:String(r.id),pipeId:String(r.pipeId),hash,marker,text,expectedUpdatedAt:r.expectedUpdatedAt||null};
 });
}
async function applyBatch(entries,{client,journal,save}) {
 const outcomes=[];
 for(const entry of entries){
  try{
   const card=await client.readCard(entry.cardId);
   if(String(card.pipe.id)!==entry.pipeId)throw Error('conflict: tarjeta en otro pipe');
   const prior=journal[entry.hash];
   const existing=card.comments.find(c=>c.text.includes(entry.marker));
   if(existing){journal[entry.hash]={status:'sent',commentId:existing.id};await save(journal);outcomes.push({key:entry.key,status:'sent'});continue;}
   // An uncertain response must be reconciled manually if a read cannot prove success.
   // Never retry a comment whose request may already have been applied.
   if(prior?.status==='sending'||prior?.status==='uncertain'||prior?.status==='sent')throw Error('uncertain: revisar operación previa antes de reenviar');
   if(entry.expectedUpdatedAt&&card.updated_at!==entry.expectedUpdatedAt)throw Error('conflict: tarjeta modificada desde la revisión');
   const fresh=await client.readCard(entry.cardId);
   if(fresh.updated_at!==card.updated_at)throw Error('conflict: cambio concurrente');
   journal[entry.hash]={status:'sending',cardId:entry.cardId,updatedAt:card.updated_at};await save(journal);
   const comment=await client.createComment(entry.cardId,entry.text,entry.hash);
   if(!comment?.id)throw Error('Respuesta sin confirmación');
   const verified=await client.readCard(entry.cardId);
   if(!verified.comments.some(c=>c.text.includes(entry.marker)))throw Error('Comentario no confirmado por relectura');
   journal[entry.hash]={status:'sent',commentId:comment.id};await save(journal);outcomes.push({key:entry.key,status:'sent'});
  }catch(error){
   const status=journal[entry.hash]?.status==='sending'?'uncertain':error.message.startsWith('conflict:')?'conflict':error.message.startsWith('uncertain:')?'uncertain':'error';
   journal[entry.hash]={...journal[entry.hash],status};await save(journal);outcomes.push({key:entry.key,status});
  }
 }
 return outcomes;
}
module.exports={prepareBatch,applyBatch};
