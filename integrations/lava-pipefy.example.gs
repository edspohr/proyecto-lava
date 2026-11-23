/* Public template: replace spreadsheet placeholders only in your private Apps Script project. */
/* Standalone Apps Script, owned by the operator. Never put tokens in code/cells.
 * Script properties: PIPEFY_CLIENT_ID, PIPEFY_CLIENT_SECRET.
 * Keep PIPEFY_ENABLED=false until the real pilot has passed.
 * previewLavaBatch() never posts. runLavaBatch() posts additive comments only.
 * Use this adapter OR the Node CLI, never two scheduled writers concurrently.
 */
const LAVA_SOURCES = [
 {id:'REEMPLAZAR_SPREADSHEET_ID_PI',tab:'LAVA 2026',pipe:'301834596'},
 {id:'REEMPLAZAR_SPREADSHEET_ID_AR_COLOMBIA',tab:'LAVA 2026',pipe:'301584251'},
 {id:'REEMPLAZAR_SPREADSHEET_ID_AR_GLOBAL',tab:'LAVA 2026',pipe:'307290381'}
];
// ADMIN is deliberately excluded until its universe has been reconciled.
const LAVA_CONTROL = 'REEMPLAZAR_SPREADSHEET_ID_AR_GLOBAL';
const LAVA_TIMEZONE = 'America/Santiago';
const LAVA_ALLOWED_STATES = [
 'Pendiente documentos del cliente – Faltan documentos (25% recibidos)',
 'Pendiente documentos del cliente – Faltan documentos (50% recibidos)',
 'Pendiente documentos del cliente – Faltan documentos (75% recibidos)',
 'Pendiente SPI revisión documentos','Pendiente recibir pago para radicación',
 'Proyecto en standby','OT anulada pendiente revisión administrativa',
 'OT radicada','OT no requiere radicación pero trabajo completado'
];
function lavaDigest(value) {
 return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,value,Utilities.Charset.UTF_8).map(b=>('0'+((b+256)%256).toString(16)).slice(-2)).join('');
}
function lavaDate(value) {
 if(!(value instanceof Date)||isNaN(value.getTime()))return '';
 return Utilities.formatDate(value,LAVA_TIMEZONE,'yyyy-MM-dd');
}
function lavaAccessToken() {
 const p=PropertiesService.getScriptProperties(),clientId=p.getProperty('PIPEFY_CLIENT_ID'),clientSecret=p.getProperty('PIPEFY_CLIENT_SECRET');
 if(!clientId||!clientSecret||clientId.startsWith('REEMPLAZAR_')||clientSecret.startsWith('REEMPLAZAR_'))throw Error('Completa PIPEFY_CLIENT_ID y PIPEFY_CLIENT_SECRET en propiedades del script');
 const fingerprint=lavaDigest(clientId+'\n'+clientSecret),token=p.getProperty('PIPEFY_OAUTH_ACCESS_TOKEN'),expires=Number(p.getProperty('PIPEFY_OAUTH_EXPIRES_AT'));
 if(token&&p.getProperty('PIPEFY_OAUTH_CREDENTIALS_HASH')===fingerprint&&expires>Date.now()+60000)return token;
 const response=UrlFetchApp.fetch('https://app.pipefy.com/oauth/token',{method:'post',contentType:'application/x-www-form-urlencoded',payload:{grant_type:'client_credentials',client_id:clientId,client_secret:clientSecret},muteHttpExceptions:true});
 if(response.getResponseCode()!==200)throw Error('No se pudo autenticar con Pipefy (HTTP '+response.getResponseCode()+')');
 let data;try{data=JSON.parse(response.getContentText());}catch{throw Error('Respuesta OAuth no válida');}
 const lifetime=Number(data.expires_in);
 if(typeof data.access_token!=='string'||!data.access_token||!Number.isFinite(lifetime)||lifetime<=0)throw Error('Respuesta OAuth incompleta');
 p.setProperties({PIPEFY_OAUTH_ACCESS_TOKEN:data.access_token,PIPEFY_OAUTH_EXPIRES_AT:String(Date.now()+lifetime*1000),PIPEFY_OAUTH_CREDENTIALS_HASH:fingerprint});
 return data.access_token;
}
function testLavaPipefyConnection() {
 const token=lavaAccessToken(),result=[];
 // Read-only test, including ADMIN even though its batch is not enabled yet.
 for(const id of [...LAVA_SOURCES.map(s=>s.pipe),'301633616']){
  const pipe=lavaGraphQL('query($id:ID!){pipe(id:$id){id name}}',{id},token).pipe;
  if(!pipe||String(pipe.id)!==id)throw Error('Sin acceso al pipe '+id);
  result.push({id:pipe.id,name:pipe.name,readable:true});
 }
 console.log(JSON.stringify({authenticated:true,pipes:result}));return result;
}
// Live read-only inspection. Does not change the frozen campaign universe.
function inspectLavaPipefyData() {
 const token=lavaAccessToken(),result=[];
 for(const id of [...LAVA_SOURCES.map(s=>s.pipe),'301633616']) {
  const pipe=lavaGraphQL('query($id:ID!){pipe(id:$id){id name cards_count opened_cards_count phases{id name cards_count fields{id label type}} start_form_fields{id label type}}}',{id},token).pipe;
  const phases=pipe.phases.map(p=>({id:p.id,name:p.name,count:p.cards_count}));
  const summary={readOnly:true,observedAt:new Date().toISOString(),pipe:pipe.id,name:pipe.name,total:pipe.cards_count,open:pipe.opened_cards_count,phases};
  console.log(JSON.stringify({readOnly:true,observedAt:summary.observedAt,pipe:id,total:pipe.cards_count,open:pipe.opened_cards_count}));
  phases.forEach(p=>console.log(JSON.stringify({pipe:id,phaseId:p.id,phase:p.name,count:p.count})));result.push(summary);
  if(id==='301633616') {
   const fields=[...pipe.start_form_fields,...pipe.phases.flatMap(p=>p.fields)].filter((f,i,a)=>a.findIndex(x=>x.id===f.id)===i);
   fields.filter(f=>/saldo|factur|asociad|compra|pa.s|solicitud|moneda|valor/i.test(f.label)).forEach(f=>console.log(JSON.stringify({adminField:f.id,label:f.label,type:f.type})));
  }
 }
 return result;
}
// Audit the exact source reports without changing their filters or columns.
function readLavaAdminReports() {
 const token=lavaAccessToken();
 const reports=lavaGraphQL('{pipe(id:301633616){reports{id name cardCount filter fields}}}',{},token).pipe.reports;
 for(const r of reports.filter(r=>['301134113','301134117'].includes(String(r.id)))) {
  console.log(JSON.stringify({report:r.id,name:r.name,count:r.cardCount}));
  const data=JSON.stringify({filter:r.filter,fields:r.fields});
  for(let i=0;i<data.length;i+=250)console.log(JSON.stringify({report:r.id,part:i/250,definition:data.slice(i,i+250)}));
 }
}
function lavaReadEntries() {
 const cutoff=Utilities.formatDate(new Date(),LAVA_TIMEZONE,'yyyy-MM-dd'),entries=[],seen=new Set();
 LAVA_SOURCES.forEach(source=>{
  const sheet=SpreadsheetApp.openById(source.id).getSheetByName(source.tab);
  if(!sheet)throw Error('No existe la hoja de campaña configurada');
  const data=sheet.getDataRange().getValues(),h=data[0],index=name=>h.indexOf(name);
  ['ID','PIPE ID','OT','Responsable','ESTADO LAVA','FECHA DE GESTIÓN','OBSERVACIÓN LAVA','SINCRONIZACIÓN'].forEach(name=>{if(index(name)<0)throw Error('Falta columna '+name);});
  data.slice(1).forEach(row=>{
   const val=name=>String(row[index(name)]||'').trim(),id=val('ID'),ot=val('OT');if(!ot)return;
   if(!/^\d+$/.test(id)||val('PIPE ID')!==source.pipe)throw Error('ID o pipe alterado');
   const key=source.pipe+':'+id+':ota';if(seen.has(key))throw Error('ID duplicado');seen.add(key);
   const state=val('ESTADO LAVA'),date=lavaDate(row[index('FECHA DE GESTIÓN')]),observation=val('OBSERVACIÓN LAVA'),responsible=val('Responsable'),evidence=index('EVIDENCIA')<0?'':val('EVIDENCIA');
   if(!LAVA_ALLOWED_STATES.includes(state)||!date||date>cutoff||date>'2026-12-18'||!observation||!responsible)return;
   // Matches the Node adapter's hash, allowing reconciliation across manual runs.
   const payload={key,ot,state,date,observation,responsible,evidence,invoice:'',associate:'',purchaseOrder:'',associateInvoice:''};
   const hash=lavaDigest(JSON.stringify(payload)),marker='[LAVA2026:'+hash+']';
   const text=[marker,'LAVA 2026 · OT '+ot,'Responsable declarado: '+responsible,'Estado: '+state,'Fecha de gestión: '+date,'Observación y próxima acción: '+observation,...(evidence?['Evidencia: '+evidence]:[]),'Registro trasladado desde Sheets por cuenta técnica; no confirma cambio de fase.'].join('\n');
   entries.push({source,id,key,hash,marker,text,syncState:val('SINCRONIZACIÓN')});
  });
 });
 return entries;
}
function lavaGraphQL(query,variables,token) {
 const response=UrlFetchApp.fetch('https://api.pipefy.com/graphql',{method:'post',contentType:'application/json',headers:{Authorization:'Bearer '+token},payload:JSON.stringify({query,variables}),muteHttpExceptions:true});
 if(response.getResponseCode()!==200)throw Error('Pipefy HTTP '+response.getResponseCode());
 const json=JSON.parse(response.getContentText());if(json.errors||!json.data)throw Error('Pipefy rechazó la operación');return json.data;
}
function lavaReadCard(id,token) {
 const card=lavaGraphQL('query($id:ID!){card(id:$id){id updated_at pipe{id} comments{id text}}}',{id},token).card;
 if(!card||!Array.isArray(card.comments))throw Error('Tarjeta o historial no disponible');return card;
}
function lavaMark(entry,status) {
 // Re-find by immutable IDs before updating the status: never reuse a row offset.
 const sheet=SpreadsheetApp.openById(entry.source.id).getSheetByName(entry.source.tab),data=sheet.getDataRange().getValues(),h=data[0],id=h.indexOf('ID'),pipe=h.indexOf('PIPE ID'),sync=h.indexOf('SINCRONIZACIÓN');
 const matches=data.slice(1).map((r,i)=>({r,row:i+2})).filter(x=>String(x.r[id])===entry.id&&String(x.r[pipe])===entry.source.pipe);
 if(matches.length!==1)throw Error('No se puede asociar confirmación a una fila única');
 sheet.getRange(matches[0].row,sync+1).setValue(status+' · '+Utilities.formatDate(new Date(),LAVA_TIMEZONE,'yyyy-MM-dd HH:mm'));
}
function previewLavaBatch() {
 const entries=lavaReadEntries();const result={mode:'preview',completeEntries:entries.length,byPipe:{}};
 entries.forEach(e=>result.byPipe[e.source.pipe]=(result.byPipe[e.source.pipe]||0)+1);
 console.log(JSON.stringify(result));return result;
}
function runLavaBatch() {
 const properties=PropertiesService.getScriptProperties();
 if(properties.getProperty('PIPEFY_ENABLED')!=='true')return previewLavaBatch();
 const lock=LockService.getScriptLock();if(!lock.tryLock(1000))throw Error('Ya hay un lote en ejecución');
 try {
  const token=lavaAccessToken();
  const control=SpreadsheetApp.openById(LAVA_CONTROL);let log=control.getSheetByName('LAVA Sync Log');
  if(!log){log=control.insertSheet('LAVA Sync Log');log.appendRow(['Hash','Pipe','ID','Estado','Comentario','Fecha']);log.protect().setDescription('Bitácora técnica de sincronización LAVA');log.hideSheet();}
  const values=log.getDataRange().getValues(),journal={};values.slice(1).forEach((r,i)=>journal[r[0]]={row:i+2,status:r[3]});
  let handled=0;const started=Date.now(),outcomes={sent:0,uncertain:0,conflict:0,error:0};
  function save(entry,status,commentId){const row=journal[entry.hash]?.row||log.getLastRow()+1;log.getRange(row,1,1,6).setValues([[entry.hash,entry.source.pipe,entry.id,status,commentId||'',new Date()]]);SpreadsheetApp.flush();journal[entry.hash]={row,status};}
  for(const entry of lavaReadEntries()) {
   if(handled>=100||Date.now()-started>240000)break;
   if(journal[entry.hash]?.status==='sent'){if(!entry.syncState.startsWith('Enviada'))lavaMark(entry,'Enviada');continue;}
   handled++;
   try {
    const card=lavaReadCard(entry.id,token);if(String(card.pipe.id)!==entry.source.pipe){save(entry,'conflict');lavaMark(entry,'Conflicto: pipe');outcomes.conflict++;continue;}
    const existing=card.comments.find(c=>c.text.includes(entry.marker));
    if(existing){save(entry,'sent',existing.id);lavaMark(entry,'Enviada');outcomes.sent++;continue;}
    if(['sending','uncertain'].includes(journal[entry.hash]?.status)){lavaMark(entry,'Incierta: revisar antes de reenviar');outcomes.uncertain++;continue;}
    const fresh=lavaReadCard(entry.id,token);if(fresh.updated_at!==card.updated_at){save(entry,'conflict');lavaMark(entry,'Conflicto: cambio concurrente');outcomes.conflict++;continue;}
    save(entry,'sending');
    const posted=lavaGraphQL('mutation($input:CreateCommentInput!){createComment(input:$input){comment{id}}}',{input:{card_id:entry.id,text:entry.text,clientMutationId:entry.hash}},token).createComment.comment;
    if(!posted?.id||!lavaReadCard(entry.id,token).comments.some(c=>c.text.includes(entry.marker)))throw Error('Sin confirmación por relectura');
    save(entry,'sent',posted.id);lavaMark(entry,'Enviada');outcomes.sent++;
   } catch(error) {
    const uncertain=journal[entry.hash]?.status==='sending'||journal[entry.hash]?.status==='uncertain';
    save(entry,uncertain?'uncertain':'error');lavaMark(entry,uncertain?'Incierta: revisar antes de reenviar':'Error: reintentar');outcomes[uncertain?'uncertain':'error']++;
   }
  }
  console.log(JSON.stringify(outcomes));return outcomes;
 } finally {lock.releaseLock();}
}
function runLavaNightWindow() {
 const hour=Number(Utilities.formatDate(new Date(),LAVA_TIMEZONE,'H'));
 if(hour>=23||hour<=5)return runLavaBatch();
}
function installLavaNightlyTrigger() {
 const p=PropertiesService.getScriptProperties();if(p.getProperty('PIPEFY_ENABLED')!=='true'||!p.getProperty('PIPEFY_CLIENT_ID')||!p.getProperty('PIPEFY_CLIENT_SECRET'))throw Error('Primero configura credenciales y valida el piloto');
 if(!ScriptApp.getProjectTriggers().some(t=>t.getHandlerFunction()==='runLavaNightWindow'))ScriptApp.newTrigger('runLavaNightWindow').timeBased().everyHours(1).create();
}
