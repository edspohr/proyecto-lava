/* DRAFT. Load into the existing private Apps Script project only after approval.
 * Requires existing lavaAccessToken(), lavaGraphQL(), LAVA_SOURCES.
 * Only reads Sheets/Pipefy. Creates a private Drive JSON and a private progress pointer.
 * No triggers, permissions, spreadsheet writes, comments, or card mutations.
 */
const LAVA_PREVIEW_INFO = {
 'País de la actividad':['País de la actividad','País de trámite','País del Trámite'],
 'Nombre del proyecto':['Nombre del proyecto'],
 'Actuación en inglés':['Actuación en inglés','Actuación SPI (AR,en)','Actuación (eng)'],
 'Actuación en español':['Actuación en español','Actuación SPI (AR,es)','Actuación (esp)']
};
function lavaPreviewHeader(value) {return String(value||'').trim().replace(/\s*\*\s*$/,'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').toLowerCase();}
function startLavaMigrationPreview() {
 const ids=[...LAVA_SOURCES,{id:'17YOFuE3ZDL8ZD8g0cPnk8QQMUO70xE0XmucPxkildDU',tab:'LAVA ADMIN',pipe:'301633616'}];
 const token=lavaAccessToken(),state={startedAt:new Date().toISOString(),discoveries:{},informationById:{},pending:[],issues:[],readOnly:true};
 const seen=new Set();
 for(const source of ids){
  const pipe=lavaGraphQL('query($id:ID!){pipe(id:$id){id start_form_fields{id label type} phases{id name fields{id label type}} reports{id name filter fields}}}',{id:source.pipe},token).pipe;
  const fields=[...new Map([...pipe.start_form_fields,...pipe.phases.flatMap(p=>p.fields)].map(f=>[String(f.id),f])).values()],mapping={};
  for(const name of Object.keys(LAVA_PREVIEW_INFO)){
   const matches=fields.filter(f=>LAVA_PREVIEW_INFO[name].map(lavaPreviewHeader).includes(lavaPreviewHeader(f.label)));
   if(matches.length===1)mapping[name]=matches[0];else state.issues.push({pipe:source.pipe,field:name,candidates:matches,reason:matches.length?'ambiguous':'missing'});
  }
  state.discoveries[source.pipe]={mapping,fields,reports:pipe.reports};
  const data=SpreadsheetApp.openById(source.id).getSheetByName(source.tab).getDataRange().getValues(),h=data.shift(),index=h.map(lavaPreviewHeader).indexOf('id');
  if(index<0)throw Error('Falta ID en '+source.tab);
  data.forEach(r=>{const id=String(r[index]||'');if(id&&!seen.has(id)){seen.add(id);state.pending.push(id);}});
 }
 // Include the current AR report membership exported by the operator, supplied in
 // the private property below as JSON {ar_colombia:["id",...],ar_global_ops:[...]}.
 // Read only an explicit private input; never infer cross-pipe identity from OT.
 const input=PropertiesService.getScriptProperties().getProperty('LAVA_PREVIEW_REPORT_IDS');
 if(!input)throw Error('Falta LAVA_PREVIEW_REPORT_IDS con los IDs de los reportes actuales');
 state.reportIds=JSON.parse(input);
 Object.values(state.reportIds).flat().forEach(id=>{id=String(id);if(!/^\d+$/.test(id))throw Error('ID de reporte inválido');if(!seen.has(id)){seen.add(id);state.pending.push(id);}});
 const file=DriveApp.createFile('LAVA-preview-'+Date.now()+'.json',JSON.stringify(state),MimeType.PLAIN_TEXT);
 PropertiesService.getScriptProperties().setProperty('LAVA_PREVIEW_FILE_ID',file.getId());
 console.log(JSON.stringify({previewFile:file.getUrl(),cards:state.pending.length,issues:state.issues}));
 return resumeLavaMigrationPreview();
}
function resumeLavaMigrationPreview() {
 const id=PropertiesService.getScriptProperties().getProperty('LAVA_PREVIEW_FILE_ID');if(!id)throw Error('Primero inicia el preview');
 const file=DriveApp.getFileById(id),state=JSON.parse(file.getBlob().getDataAsString()),token=lavaAccessToken(),started=Date.now();
 while(state.pending.length&&Date.now()-started<240000){
  const batch=state.pending.slice(0,20);if(batch.some(id=>!/^\d+$/.test(id)))throw Error('ID inválido');
  const query='query { '+batch.map((id,i)=>'c'+i+':card(id:'+id+'){id pipe{id} updated_at current_phase{name} fields{name value report_value field{id}}}').join(' ')+' }';
  const data=lavaGraphQL(query,{},token);
  for(let i=0;i<batch.length;i++){
   const card=data['c'+i];if(!card){state.issues.push({id:batch[i],reason:'card_not_accessible'});continue;}
   const discovery=state.discoveries[String(card.pipe.id)],info={};
   for(const name of Object.keys(LAVA_PREVIEW_INFO)){
    const field=discovery?.mapping[name],cell=field?card.fields.find(f=>String(f.field.id)===String(field.id)):null;
    info[name]=field?(cell?.report_value??cell?.value??''):null;
   }
   state.informationById[String(card.id)]=info;
  }
  state.pending.splice(0,batch.length);
  // Durable checkpoint before another API batch. No spreadsheet is written.
  file.setContent(JSON.stringify(state));
 }
 state.completedAt=state.pending.length?null:new Date().toISOString();file.setContent(JSON.stringify(state));
 console.log(JSON.stringify({previewFile:file.getUrl(),read: Object.keys(state.informationById).length,pending:state.pending.length,complete:!state.pending.length,issues:state.issues.length}));
 return {fileId:file.getId(),pending:state.pending.length};
}
