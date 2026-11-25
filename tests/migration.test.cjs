const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm'),fs=require('node:fs');
const {planMigration,planRollback,inputCell,rowsOf,value,digest}=require('../lib/migration');
const {headerIndex,INFORMATION}=require('../lib/sheet-schema');
const {recordsFromRows,summarize}=require('../lib/otas');const {prepareBatch}=require('../lib/writeback');
const {discoverFields,mapCard,readOnlyClient}=require('../lib/pipefy-read');
test('live preview preserves readable data and records denied cards without retrying their access',()=>{
 let state={pending:['1','2'],issues:[],informationById:{},discoveries:{pipe:{mapping:Object.fromEntries(INFORMATION.map((label,i)=>[label,{id:String(i)}]))}}};
 let reads=0;const logs=[];
 const file={getBlob:()=>({getDataAsString:()=>JSON.stringify(state)}),setContent:s=>{state=JSON.parse(s)},getUrl:()=> 'private-preview'};
 const context={Date,console:{log:s=>logs.push(s)},DriveApp:{getFileById:()=>file},PropertiesService:{getScriptProperties:()=>({getProperty:()=> 'preview'})},lavaAccessToken:()=> 'fake-secret',LAVA_PREVIEW_INFO:Object.fromEntries(INFORMATION.map(h=>[h,[]])),SpreadsheetApp:new Proxy({},{get(){throw Error('No spreadsheet operation allowed')}}),UrlFetchApp:{fetch:(url,options)=>{
  reads++;assert.equal(url,'https://api.pipefy.com/graphql');assert.match(JSON.parse(options.payload).query,/^query/);assert(!JSON.parse(options.payload).query.includes('mutation'));
  return {getResponseCode:()=>200,getContentText:()=>JSON.stringify({data:{c0:{id:'1',pipe:{id:'pipe'},fields:INFORMATION.map((h,i)=>({field:{id:String(i)},value:'Data '+i}))},c1:null},errors:[{extensions:{code:'PERMISSION_DENIED'},path:['c1']}]})};
 }}};
 vm.createContext(context);vm.runInContext(fs.readFileSync('integrations/lava-migration-reader.gs','utf8')+'\nresumeLavaMigrationPreviewV3();',context);
 assert.equal(reads,1);assert.equal(state.pending.length,0);assert.equal(state.informationById['1']['Nombre del proyecto'],'Data 1');assert.equal(state.informationById['2'],undefined);assert.deepEqual(state.issues,[{id:'2',reason:'permission_denied'}]);assert(!logs.join('').includes('fake-secret'));
 vm.runInContext('resumeLavaMigrationPreviewV3();',context);assert.equal(reads,1);assert.equal(state.issues.length,1);
});
const headers=['ID','PIPE ID','OT','Cliente','Fase actual','Fecha Solicitud OT','Responsable','ESTADO LAVA','FECHA DE GESTIÓN','OBSERVACIÓN LAVA','EVIDENCIA','GESTIÓN COMPLETA','TIER','DERIVACIÓN ADMIN','SINCRONIZACIÓN'];
const metricNames=['version','cutoff','snapshot','total','done','historical','historicalDone','reminder','reminderDone','recent','recentDone','unknownDates','unknownDatesDone','adminReferrals'];
const pipes={ar_colombia:'301584251',ar_global_ops:'307290381',pi:'301834596'};
const info=Object.fromEntries(INFORMATION.map(h=>[h,'Dato Pipefy']));
const card=(id,team)=>({id,pipeId:pipes[team],ot:'OT-'+id,phase:'Nueva fase',info});
function book(team,ids){const prefix=team==='ar_global_ops'?'v2_':'';return {spreadsheetId:team,sheets:[{properties:{sheetId:1,title:'LAVA 2026',gridProperties:{rowCount:20,columnCount:20}},columnMetadata:[{}, {hiddenByUser:true}],basicFilter:{range:{sheetId:1,endRowIndex:20,endColumnIndex:15}},filterViews:[{filterViewId:6,title:'Responsable',range:{sheetId:1,endRowIndex:20,endColumnIndex:15}}],protectedRanges:[],data:[{rowData:[{values:headers.map(inputCell)},...ids.map(id=>({values:[id,pipes[team],'OT-'+id,'Cliente','Fase antigua',45000,'Persona','OT Cancelada',46350,'Revisada; cerrar expediente','https://evidencia',false,'Histórico','',''].map(inputCell)}))]}]},{properties:{sheetId:2,title:'Resumen LAVA',gridProperties:{rowCount:100,columnCount:3}},data:[{rowData:[{values:['metric','value'].map(inputCell)},...metricNames.map(k=>({values:[prefix+k,k==='snapshot'?'2026-11-17':k==='version'?2:0].map(inputCell)}))]}]}]};}
function apply(book,requests){const b=structuredClone(book);for(const request of requests){
 if(request.updateCells){const q=request.updateCells,s=b.sheets.find(s=>s.properties.sheetId===q.start.sheetId);s.data=[{rowData:rowsOf(s).map(values=>({values}))}];const d=s.data[0].rowData;for(const [i,row] of q.rows.entries())for(const [j,cell] of row.values.entries()){const r=q.start.rowIndex+i,c=q.start.columnIndex+j;d[r]??={values:[]};d[r].values[c]??={};for(const field of q.fields.split(','))if(cell[field]===undefined)delete d[r].values[c][field];else d[r].values[c][field]=structuredClone(cell[field]);}}
 else if(request.appendDimension){const q=request.appendDimension,s=b.sheets.find(s=>s.properties.sheetId===q.sheetId);s.properties.gridProperties[q.dimension==='ROWS'?'rowCount':'columnCount']+=q.length;}
 else if(request.updateDimensionProperties){const q=request.updateDimensionProperties,s=b.sheets.find(s=>s.properties.sheetId===q.range.sheetId);s.columnMetadata??=[];s.columnMetadata[q.range.startIndex]={hiddenByUser:true};}
 else if(request.setBasicFilter){const q=request.setBasicFilter;b.sheets.find(s=>s.properties.sheetId===q.filter.range.sheetId).basicFilter=structuredClone(q.filter);}
 else if(request.updateFilterView){const q=request.updateFilterView;for(const s of b.sheets)for(const v of s.filterViews||[])if(v.filterViewId===q.filter.filterViewId)v.range=structuredClone(q.filter.range);}
 else throw Error('Unexpected mutation '+Object.keys(request)[0]);
 }return b;}
test('cancelled OT requires date and observation; annotated/reordered headers remain readable',()=>{
 const h=headers.map(h=>['ESTADO LAVA','FECHA DE GESTIÓN','OBSERVACIÓN LAVA'].includes(h)?h+' *':h);
 const row=['1',pipes.pi,'OT1','','',45000,'Persona','OT cancelada',46350,'Revisada','','','','',''];
 const rows=[h,row].map(r=>r.toReversed());assert.equal(summarize(rows,'2026-11-24').done,1);
 row[9]='';assert.equal(summarize([h,row],'2026-11-24').done,0);row[9]='Revisada';row[8]=46351;assert.equal(summarize([h,row],'2026-11-24').done,0);
 assert.throws(()=>recordsFromRows([[...h,'ESTADO LAVA'],[...row,'']]),/duplicados/);
});
test('transfer by immutable ID preserves human values and archives source without duplicating denominator',()=>{
 const books={ar_colombia:book('ar_colombia',['1','2']),ar_global_ops:book('ar_global_ops',[])};
 const inventory={ar_colombia:[card('2','ar_colombia')],ar_global_ops:[card('1','ar_global_ops'),card('3','ar_global_ops')]};
 const plan=planMigration(books,inventory,{absentPolicy:'archive'});assert.equal(plan.report.conflicts.length,0);
 assert.equal(plan.report.stats.ar_global_ops.movedIn,1);assert.equal(plan.report.stats.ar_global_ops.new,1);assert.equal(plan.report.stats.ar_colombia.movedOut,1);
 const updated=Object.fromEntries(Object.entries(books).map(([t,b])=>[t,apply(b,plan.plans[t].requests)]));
 const rows=rowsOf(updated.ar_global_ops.sheets[0]),ix=headerIndex(rows[0].map(value));
 assert.equal(value(rows[1][ix('OBSERVACIÓN LAVA')]),'Revisada; cerrar expediente');assert.equal(value(rows[1][ix('Responsable')]),'Persona');
 const srcRows=rowsOf(updated.ar_colombia.sheets[0]),si=headerIndex(srcRows[0].map(value));assert.equal(value(srcRows[1][si('LAVA ACTIVA')]),false);
 assert.equal(value(srcRows[1][si('OBSERVACIÓN LAVA')]),'Revisada; cerrar expediente');
 for(const t of Object.keys(books))for(const k of ['basicFilter','filterViews','protectedRanges'])assert.equal(digest(books[t].sheets[0][k]),digest(updated[t].sheets[0][k]));
 const again=planMigration(updated,inventory,{absentPolicy:'archive'});assert.equal(again.plans.ar_global_ops.requests.length,0);assert.equal(again.plans.ar_colombia.requests.length,0);
 assert.equal(again.report.stats.ar_global_ops.movedIn,0);assert.equal(again.report.stats.ar_global_ops.new,0);
 const records=recordsFromRows(rows.map(r=>r.map(value)));assert.equal(records.length,2);assert.equal(prepareBatch(records,'2026-11-24').length,1);
});
test('archive never deletes existing observations; default retains unknown exits',()=>{
 const b=book('ar_colombia',['1']);const archived=planMigration({ar_colombia:b},{ar_colombia:[]},{absentPolicy:'archive',requireInformation:false});
 assert.equal(archived.report.stats.ar_colombia.retired,1);assert.equal(archived.plans.ar_colombia.rows.length,2);
 assert.equal(value(archived.plans.ar_colombia.rows[1][9]),'Revisada; cerrar expediente');
 const retained=planMigration({ar_colombia:b},{ar_colombia:[]},{requireInformation:false});assert.equal(retained.report.stats.ar_colombia.after,1);assert(retained.report.warnings.some(w=>w.type==='absent_card_retained_pending_destination'));
});
test('conflicting edits, duplicate exports and missing discovery block effective migration',()=>{
 const a=book('ar_colombia',['1']),b=book('ar_global_ops',['1']);b.sheets[0].data[0].rowData[1].values[9]=inputCell('Otra observación');
 const p=planMigration({ar_colombia:a,ar_global_ops:b},{ar_colombia:[card('1','ar_colombia')],ar_global_ops:[]});assert(p.report.conflicts.some(c=>c.type==='conflicting_management'));assert.equal(p.report.canApply,false);
 assert.throws(()=>planMigration({ar_colombia:a},{ar_colombia:[card('1','ar_colombia'),card('1','ar_colombia')]}),/duplicado/);
 const missing=planMigration({ar_colombia:a},{ar_colombia:[{...card('1','ar_colombia'),info:{}}]});assert.equal(missing.report.canApply,false);
});
test('PI cards outside its frozen universe do not require hydration or create rows',()=>{
 const b=book('pi',['1']);const inventory={pi:[card('1','pi'),{...card('2','pi'),info:{}}]};
 const p=planMigration({pi:b},inventory);assert.equal(p.plans.pi.rows.length,2);assert.equal(p.report.stats.pi.after,1);assert.equal(p.report.conflicts.length,0);
});
test('existing dropdown additions and input guidance survive migration without broadening completion rules',()=>{
 const b=book('ar_colombia',['1']);const original={condition:{type:'ONE_OF_LIST',values:[{userEnteredValue:'Estado adicional del equipo'},{userEnteredValue:'OT cancelada'}]},strict:true,showCustomUi:true,inputMessage:'Guía del equipo'};
 b.sheets[0].data[0].rowData[1].values[7].dataValidation=original;
 const p=planMigration({ar_colombia:b},{ar_colombia:[card('1','ar_colombia'),card('2','ar_colombia')]});const updated=apply(b,p.plans.ar_colombia.requests),rows=rowsOf(updated.sheets[0]);
 assert.deepEqual(rows[1][7].dataValidation,original);assert.deepEqual(rows[2][7].dataValidation,original);
 assert(!require('../lib/rules').OTA_STATES.includes('Estado adicional del equipo'));
});
test('new rows outside fixed filter ranges are reported without altering filters',()=>{
 const b=book('ar_colombia',['1']);b.sheets[0].basicFilter.range.endRowIndex=2;
 const p=planMigration({ar_colombia:b},{ar_colombia:[card('1','ar_colombia'),card('2','ar_colombia')]});assert(p.report.warnings.some(w=>w.type==='filter_range_does_not_cover_new_rows'));
 assert(!p.plans.ar_colombia.requests.some(r=>r.setBasicFilter||r.updateFilterView||r.updateProtectedRange));
});
test('field IDs come from discovery; ambiguous labels never choose the first field',async()=>{
 const fields=INFORMATION.map((label,i)=>({id:'actual_'+i,label}));const d=discoverFields({start_form_fields:fields,phases:[]});assert.equal(d.issues.length,0);
 assert.equal(mapCard({fields:[{field:{id:'actual_1'},value:'Proyecto'}]},d.mapping)['Nombre del proyecto'],'Proyecto');
 assert(discoverFields({start_form_fields:[...fields,{id:'another',label:'País de trámite'}]}).issues.some(i=>i.reason==='ambiguous'));
 let calls=0;const query=readOnlyClient('fake',async()=>{calls++;return {ok:true,json:async()=>({data:{ok:true}})}});await assert.rejects(query('mutation {createComment}'),/solo/);assert.equal(calls,0);await query('query { pipe(id:1){id} }');assert.equal(calls,1);
});
test('authorized extension changes only filter ranges, preserves criteria/protections and is idempotent',()=>{
 const b=book('ar_colombia',['1']);b.sheets[0].basicFilter.range.endRowIndex=2;b.sheets[0].filterViews[0].range.endRowIndex=2;
 b.sheets[0].basicFilter.criteria={'6':{hiddenValues:['Persona B']}};b.sheets[0].filterViews[0].criteria={'6':{hiddenValues:['Persona C']}};
 const inv={ar_colombia:[card('1','ar_colombia'),card('2','ar_colombia')]};
 const p=planMigration({ar_colombia:b},inv,{extendFilterRanges:true});assert.equal(p.report.warnings.length,0);
 const after=apply(b,p.plans.ar_colombia.requests);assert.equal(after.sheets[0].basicFilter.range.endRowIndex,3);assert.equal(after.sheets[0].basicFilter.range.endColumnIndex,19);
 assert.deepEqual(after.sheets[0].basicFilter.criteria,b.sheets[0].basicFilter.criteria);assert.deepEqual(after.sheets[0].filterViews[0].criteria,b.sheets[0].filterViews[0].criteria);assert.deepEqual(after.sheets[0].protectedRanges,b.sheets[0].protectedRanges);
 assert.equal(planMigration({ar_colombia:after},inv,{extendFilterRanges:true}).plans.ar_colombia.requests.length,0);
 const current=structuredClone(after);current.sheets[0].basicFilter.criteria={'6':{hiddenValues:['Edición posterior']}};
 const rollback=planRollback(b,after,current);assert.equal(rollback.canApply,true);const reverted=apply(current,rollback.requests);
 assert.deepEqual(reverted.sheets[0].basicFilter.range,b.sheets[0].basicFilter.range);assert.deepEqual(reverted.sheets[0].basicFilter.criteria,current.sheets[0].basicFilter.criteria);
});
test('rollback restores only migration edits, retains new user input and refuses concurrent formula changes',()=>{
 const before=book('ar_colombia',['1']);const p=planMigration({ar_colombia:before},{ar_colombia:[card('2','ar_colombia')]},{absentPolicy:'archive',requireInformation:false});
 const after=apply(before,p.plans.ar_colombia.requests),current=structuredClone(after),rows=current.sheets[0].data[0].rowData;
 rows[2].values[9]=inputCell('Gestión nueva posterior a migración');
 const rollback=planRollback(before,after,current);assert.equal(rollback.canApply,true);const reverted=apply(current,rollback.requests),v=rowsOf(reverted.sheets[0]),ix=headerIndex(v[0].map(value));
 assert.equal(value(v[1][ix('LAVA ACTIVA')]),true);assert.equal(value(v[2][ix('LAVA ACTIVA')]),false);assert.equal(value(v[2][9]),'Gestión nueva posterior a migración');
 rows[1].values[11]={userEnteredValue:{formulaValue:'=FALSE'}};assert.equal(planRollback(before,after,current).canApply,false);
});
test('Apps Script and Node readers agree on decorated headings, cancellation, inactive rows and markers',()=>{
 const src=fs.readFileSync('integrations/lava-pipefy.gs','utf8');let captured;
 const rows=[headers.map(h=>h==='ESTADO LAVA'?h+' *':h).concat('LAVA ACTIVA'),['1',pipes.pi,'OT1','','',45000,'Persona','OT Cancelada',new Date('2026-11-24T12:00:00Z'),'Revisada','','','','','',true],['2',pipes.pi,'OT2','','',45000,'Persona','OT Cancelada',new Date('2026-11-24T12:00:00Z'),'Archivada','','','','','',false]];
 const context={Date,console,Utilities:{formatDate:date=>date.toISOString().slice(0,10)},SpreadsheetApp:{openById:()=>({getSheetByName:()=>({getDataRange:()=>({getValues:()=>structuredClone(rows)})})})}};
 vm.createContext(context);vm.runInContext(src+'\nLAVA_SOURCES.splice(1); lavaDigest=value=>value; captured=lavaReadEntries();',context);captured=context.captured;assert.equal(captured.length,1);assert.match(captured[0].text,/OT Cancelada/);
});

test('approved denied-access exception preserves PI universe and annotates only informational cells',()=>{
 const b=book('pi',['1']),options={informationExceptions:{'1':{team:'pi',reason:'permission_denied',approved:true}}};
 const blocked=planMigration({pi:b},{pi:[]});assert.equal(blocked.report.canApply,false);
 const p=planMigration({pi:b},{pi:[]},options);assert.equal(p.report.canApply,true);assert.equal(p.report.stats.pi.after,1);
 const result=apply(b,p.plans.pi.requests),rows=rowsOf(result.sheets[0]),ix=headerIndex(rows[0].map(value));
 for(const h of INFORMATION){assert.equal(value(rows[1][ix(h)]),'');assert.equal(rows[1][ix(h)].note,'No disponible: acceso denegado por Pipefy');}
 const second=planMigration({pi:result},{pi:[]},options);assert.equal(second.plans.pi.requests.length,0);
 assert.equal(planMigration({pi:b},{pi:[]},{informationExceptions:{'1':{team:'admin',reason:'permission_denied',approved:true}}}).report.canApply,false);
});

test('new report dates become native Sheets dates while existing dates remain unchanged',()=>{
 const b=book('ar_colombia',['1']);const before=structuredClone(rowsOf(b.sheets[0])[1][5]);
 for(const date of ['2026-11-24','24/11/2026',46350]){
  const p=planMigration({ar_colombia:b},{ar_colombia:[card('1','ar_colombia'),{...card('2','ar_colombia'),date}]},{informationById:{'1':info}});
  const result=apply(b,p.plans.ar_colombia.requests),rows=rowsOf(result.sheets[0]);
  assert.deepEqual(rows[1][5],before);assert.equal(rows[2][5].userEnteredValue.numberValue,46350);assert.equal(value(rows[2][5]),46350);
 }
});
