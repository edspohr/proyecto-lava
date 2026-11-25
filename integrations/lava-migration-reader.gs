/* Read-only card collector, loaded separately from the unchanged production adapter.
 * Resumes the private preview created by startLavaMigrationPreview().
 * Minimal Card selection verified live; no writes to Sheets or Pipefy.
 */
function resumeLavaMigrationPreviewV3() {
 const id=PropertiesService.getScriptProperties().getProperty('LAVA_PREVIEW_FILE_ID');
 if(!id)throw Error('Falta snapshot privado');
 const file=DriveApp.getFileById(id),state=JSON.parse(file.getBlob().getDataAsString()),token=lavaAccessToken(),started=Date.now();
 while(state.pending.length&&Date.now()-started<240000){
  const batch=state.pending.slice(0,20);
  if(batch.some(x=>!/^\d+$/.test(x)))throw Error('ID inválido');
  const query='query { '+batch.map((x,i)=>'c'+i+':card(id:'+x+'){id pipe{id} fields{name value field{id}}}').join(' ')+' }';
  const response=UrlFetchApp.fetch('https://api.pipefy.com/graphql',{method:'post',contentType:'application/json',headers:{Authorization:'Bearer '+token},payload:JSON.stringify({query}),muteHttpExceptions:true});
  const result=JSON.parse(response.getContentText()),errors=result.errors||[];
  const denied=new Set(errors.filter(e=>e.extensions?.code==='PERMISSION_DENIED').map(e=>e.path?.[0]));
  const unexpected=errors.filter(e=>e.extensions?.code!=='PERMISSION_DENIED');
  if(response.getResponseCode()!==200||unexpected.length||!result.data){
   console.log(JSON.stringify({http:response.getResponseCode(),errors}));
   throw Error('Error de lectura; progreso conservado');
  }
  for(let i=0;i<batch.length;i++){
   const card=result.data['c'+i];
   if(denied.has('c'+i)||!card){state.issues.push({id:batch[i],reason:denied.has('c'+i)?'permission_denied':'card_not_accessible'});continue;}
   const mapping=state.discoveries[String(card.pipe.id)]?.mapping,info={};
   for(const name of Object.keys(LAVA_PREVIEW_INFO)){
    const mapped=mapping?.[name],field=mapped?card.fields.find(f=>String(f.field.id)===String(mapped.id)):null;
    info[name]=mapped?(field?.value??''):null;
   }
   state.informationById[String(card.id)]=info;
  }
  state.pending.splice(0,batch.length);
  file.setContent(JSON.stringify(state));
 }
 state.completedAt=state.pending.length?null:new Date().toISOString();file.setContent(JSON.stringify(state));
 console.log(JSON.stringify({previewFile:file.getUrl(),read:Object.keys(state.informationById).length,pending:state.pending.length,complete:!state.pending.length,issues:state.issues.length}));
}
