'use strict';
const crypto=require('node:crypto');
const {OTA_STATES,normalize,parseDate}=require('./rules');
const {headerIndex,headerKey,REQUIRED,INFORMATION,ACTIVE,activeValue}=require('./sheet-schema');
const digest=value=>crypto.createHash('sha256').update(JSON.stringify(value)??'undefined').digest('hex');
const value=cell=>{const v=cell?.effectiveValue||cell?.userEnteredValue||{};return v.stringValue??v.numberValue??v.boolValue??'';};
function rowsOf(sheet){
 const rows=[];
 for(const data of sheet.data||[])for(const [i,row] of (data.rowData||[]).entries())rows[(data.startRow||0)+i]=row.values||[];
 return rows;
}
const column=index=>{let text='';for(let n=index+1;n>0;n=Math.floor((n-1)/26))text=String.fromCharCode(65+(n-1)%26)+text;return text;};
const inputCell=v=>({userEnteredValue:typeof v==='boolean'?{boolValue:v}:typeof v==='number'?{numberValue:v}:{stringValue:String(v??'')}});
const formulaCell=formula=>({userEnteredValue:{formulaValue:formula}});
function put(sheetId,row,col,cell,fields='userEnteredValue'){
 return {updateCells:{start:{sheetId,rowIndex:row,columnIndex:col},rows:[{values:[cell]}],fields}};
}
const MANAGEMENT=['Responsable',...REQUIRED,'EVIDENCIA','FACTURA','ASOCIADO','OC','FACTURA ASOCIADO','SINCRONIZACIÓN'];
function managed(row,index){return MANAGEMENT.some(name=>index(name)>=0&&String(value(row[index(name)] )).trim()!=='');}
function registered(row,index){return MANAGEMENT.filter(h=>!['Responsable','SINCRONIZACIÓN'].includes(h)).some(h=>index(h)>=0&&String(value(row[index(h)])).trim()!=='');}
function equalManagement(a,ai,b,bi){return MANAGEMENT.every(h=>JSON.stringify(a[ai(h)]?.userEnteredValue||{})===JSON.stringify(b[bi(h)]?.userEnteredValue||{}));}
function otaFormula(index,row){
 const ref=name=>column(index(name))+row;
 const allowed=OTA_STATES.map(s=>`${ref('ESTADO LAVA')}=${JSON.stringify(s)}`).join(',');
 return `=AND(${ref(ACTIVE)}=TRUE,OR(${allowed}),ISNUMBER(${ref('FECHA DE GESTIÓN')}),${ref('FECHA DE GESTIÓN')}>0,${ref('FECHA DE GESTIÓN')}<=MIN(TODAY(),DATE(2026,12,18)),LEN(TRIM(${ref('OBSERVACIÓN LAVA')}))>0)`;
}
function tierFormula(index,row){const date=column(index('Fecha Solicitud OT'))+row;return `=IF(OR(NOT(ISNUMBER(${date})),${date}<=0,${date}>TODAY()),"Sin fecha válida",IF(TODAY()-INT(${date})>365,"Histórico",IF(TODAY()-INT(${date})>90,"Recordatorio","Sin alerta")))`;}
function summaryFormulas(headers,tab){
 const ix=headerIndex(headers),q="'"+tab.replace(/'/g,"''")+"'!",range=h=>q+column(ix(h))+'2:'+column(ix(h));
 const active=range(ACTIVE),done=range('GESTIÓN COMPLETA'),tier=range('TIER');
 const result={total:`=COUNTIFS(${active},TRUE,${range('OT')},"<>")`,done:`=COUNTIFS(${active},TRUE,${done},TRUE)`};
 for(const [key,label] of Object.entries({historical:'Histórico',reminder:'Recordatorio',recent:'Sin alerta',unknownDates:'Sin fecha válida'})){
  result[key]=`=COUNTIFS(${active},TRUE,${tier},"${label}")`;
  result[key+'Done']=`=COUNTIFS(${active},TRUE,${tier},"${label}",${done},TRUE)`;
 }
 result.adminReferrals=`=COUNTIFS(${active},TRUE,${range('DERIVACIÓN ADMIN')},"Pendiente ADMIN")`;
 return result;
}
/** Pure planner. Never removes/reorders a row or rewrites existing human inputs.
 * inventory: complete report exports grouped by team; immutable card ID is the join.
 * Existing rows outside the current AR reports remain in place with LAVA ACTIVA=false.
 */
function planMigration(books,inventory,{snapshot='2026-11-24',requireInformation=true,absentPolicy='retain',informationById={},informationExceptions={},extendFilterRanges=false}={}){
 if(!['retain','archive'].includes(absentPolicy))throw Error('Política de ausentes inválida');
 const conflicts=[],warnings=[],locations=new Map(),targets=new Map(),plans={};
 for(const [team,book] of Object.entries(books)){
  if(team==='dashboard'){
   const sheet=book.sheets.find(s=>s.properties.title==='LAVA 2026');if(!sheet)throw Error('Dashboard sin hoja LAVA 2026');
   const requests=[];rowsOf(sheet).forEach((row,r)=>{row.forEach((cell,c)=>{if(value(cell)==='Universo PI/AR congelado al 17/11/2026.')requests.push(put(sheet.properties.sheetId,r,c,inputCell('PI conserva el corte del 17/11/2026. AR usa los reportes actuales; las excluidas conservan su histórico.')));});});
   plans[team]={spreadsheetId:book.spreadsheetId,sheetId:sheet.properties.sheetId,requests,stats:{},sourceDigest:digest(book)};continue;
  }
  const sheet=book.sheets.find(s=>s.properties.title===(team==='admin'?'LAVA ADMIN':'LAVA 2026'));
  if(!sheet)throw Error('Hoja de gestión ausente: '+team);
  const rows=rowsOf(sheet),headers=(rows[0]||[]).map(value),ix=headerIndex(headers);
  for(const h of ['ID','PIPE ID','OT',...REQUIRED,'GESTIÓN COMPLETA'])if(ix(h)<0)throw Error('Falta encabezado '+h);
  const plan=plans[team]={spreadsheetId:book.spreadsheetId,sheetId:sheet.properties.sheetId,tab:sheet.properties.title,headers:[...headers],rows:rows.map(r=>structuredClone(r)),requests:[],stats:{before:0,after:0,new:0,movedIn:0,movedOut:0,retired:0,preservedManagement:0},sourceDigest:digest(book)};
  const local=new Set();
  for(let r=1;r<rows.length;r++){
   if(!String(value(rows[r]?.[ix('OT')])).trim())continue;
   const id=String(value(rows[r][ix('ID')]));if(!/^\d+$/.test(id))throw Error('ID inválido: '+team);
   const key=team==='admin'?id+':'+value(rows[r][ix('FRENTE')]):id;
   if(local.has(key))throw Error('ID duplicado en '+team+': '+key);local.add(key);
   const active=ix(ACTIVE)<0||activeValue(value(rows[r][ix(ACTIVE)]));
   if(active)plan.stats.before++;
   if(registered(rows[r],ix))plan.stats.preservedManagement++;
   if(team==='admin')continue;
   if(!locations.has(id))locations.set(id,[]);
   locations.get(id).push({team,row:r,cells:rows[r],ix,active});
  }
 }
 for(const [team,cards] of Object.entries(inventory)){
  if(!plans[team])throw Error('Equipo no configurado '+team);
  for(const card of cards){
   const id=String(card.id);if(!/^\d+$/.test(id)||!card.pipeId||!card.ot)throw Error('Tarjeta incompleta');
   if(targets.has(id))throw Error('ID duplicado entre reportes Pipefy: '+id);
   targets.set(id,{team,card});
  }
 }
 for(const [id,items] of locations){
  const entries=items.filter(x=>managed(x.cells,x.ix));
  for(const entry of entries.slice(1))if(!equalManagement(entries[0].cells,entries[0].ix,entry.cells,entry.ix))conflicts.push({type:'conflicting_management',id,teams:entries.map(e=>e.team)});
 }
 for(const [team,plan] of Object.entries(plans)){
  if(team==='dashboard')continue;
  const book=books[team],sheet=book.sheets.find(s=>s.properties.sheetId===plan.sheetId),originalHeaders=[...plan.headers],oldIndex=headerIndex(originalHeaders),admin=team==='admin';
  // Append, never insert among existing columns: formulas, filters and protections keep their coordinates.
  for(const h of [...INFORMATION,...(admin?[]:[ACTIVE])])if(headerIndex(plan.headers)(h)<0)plan.headers.push(h);
  const ix=headerIndex(plan.headers);
  for(const name of [...REQUIRED,...(admin?['FACTURA','ASOCIADO','OC','FACTURA ASOCIADO']:[])]){const c=ix(name);if(c>=0)plan.headers[c]=String(plan.headers[c]).replace(/\s*\*\s*$/,'')+' *';}
  plan.headers.forEach((h,c)=>{if(h!==originalHeaders[c]){
   const cell=inputCell(h),format=rowsOf(sheet)[0]?.[oldIndex('Cliente')]?.userEnteredFormat;
   if(c>=originalHeaders.length&&format)cell.userEnteredFormat=structuredClone(format);
   plan.requests.push(put(plan.sheetId,0,c,cell,cell.userEnteredFormat?'userEnteredValue,userEnteredFormat':'userEnteredValue'));
   if(c>=originalHeaders.length)plan.requests.push({updateDimensionProperties:{range:{sheetId:plan.sheetId,dimension:'COLUMNS',startIndex:c,endIndex:c+1},properties:{pixelSize:200},fields:'pixelSize'}});
  }});
  if(admin)for(const h of ['FACTURA','ASOCIADO','OC','FACTURA ASOCIADO'])if(ix(h)>=0){
   const note=h==='FACTURA'?'Obligatorio cuando el estado es Facturada.':'Obligatorio cuando el estado es Completa (asociado + OC con factura).';
   const prior=rowsOf(sheet)[0]?.[ix(h)]?.note||'';
   if(!prior.includes(note))plan.requests.push(put(plan.sheetId,0,ix(h),{note:prior?prior+'\n'+note:note},'note'));
  }
  const set=(r,c,cell,fields)=>{
   const prior=plan.rows[r]?.[c]||{};
   if(fields==='dataValidation'?digest(prior.dataValidation)===digest(cell.dataValidation):digest(prior.userEnteredValue)===digest(cell.userEnteredValue))return;
   plan.requests.push(put(plan.sheetId,r,c,cell,fields));
   if(!plan.rows[r])plan.rows[r]=[];plan.rows[r][c]={...prior,...cell};
   if(!fields||fields==='userEnteredValue'){delete plan.rows[r][c].effectiveValue;delete plan.rows[r][c].formattedValue;}
  };
  if(!admin)for(const [id,target] of targets){
   if(target.team!==team||!reconcileTeam(team))continue;
   const own=(locations.get(id)||[]).find(l=>l.team===team);
   if(own)continue;
   const candidates=locations.get(id)||[],source=candidates.find(l=>l.active&&managed(l.cells,l.ix))||candidates.find(l=>managed(l.cells,l.ix))||candidates[0];
   const card=target.card,parsedDate=parseDate(card.date),nativeDate=parsedDate===null?(card.date||''):(parsedDate-Date.UTC(1899,11,30))/86400000;
   const r=plan.rows.length,record={ID:id,'PIPE ID':String(card.pipeId),OT:String(card.ot),Cliente:card.client||'','Fase actual':card.phase||'','Fecha Solicitud OT':nativeDate,Responsable:card.responsible||'','ESTADO LAVA':'','FECHA DE GESTIÓN':'','OBSERVACIÓN LAVA':'',EVIDENCIA:'',SINCRONIZACIÓN:''};
   const byHeader=new Map(Object.entries(record).map(([h,v])=>[headerKey(h),v]));
   const cells=plan.headers.map(h=>inputCell(byHeader.get(headerKey(h))??''));
   if(source){
    // Carry every non-derived/user column, including future custom fields, by header identity.
    const derived=new Set(['ID','PIPE ID','GESTIÓN COMPLETA','TIER','DERIVACIÓN ADMIN',ACTIVE,...INFORMATION].map(headerKey));
    originalHeaders.forEach((h,c)=>{const sc=source.ix(h);if(sc>=0&&!derived.has(headerKey(h)))cells[c]=structuredClone(source.cells[sc]||{});});
    plan.stats.movedIn++;
   }else plan.stats.new++;
   plan.rows.push([]);
   cells.forEach((cell,c)=>set(r,c,cell));
   const exemplar=rowsOf(sheet)[1]||[];
   for(let c=0;c<originalHeaders.length;c++)for(const field of ['userEnteredFormat','dataValidation'])if(exemplar[c]?.[field]){
    const original=source?.cells[source.ix(originalHeaders[c])]?.[field];
    plan.requests.push(put(plan.sheetId,r,c,{[field]:structuredClone(original||exemplar[c][field])},field));
    plan.rows[r][c]={...plan.rows[r][c],[field]:structuredClone(original||exemplar[c][field])};
   }
   locations.set(id,[...(locations.get(id)||[]),{team,row:r,cells,ix,active:true,added:true}]);
  }
  for(let r=1;r<plan.rows.length;r++){
   const cells=plan.rows[r],id=String(value(cells[ix('ID')]));if(!String(value(cells[ix('OT')])).trim())continue;
   const target=targets.get(id),reconcile=['ar_colombia','ar_global_ops'].includes(team);
   const active=admin?true:reconcile?(target?target.team===team:absentPolicy==='retain'):true;
   if(reconcile&&!target&&priorLegacyActive(cells,oldIndex)&&absentPolicy==='retain')warnings.push({type:'absent_card_retained_pending_destination',team,id});
   if(active)plan.stats.after++;
   const priorActive=oldIndex(ACTIVE)<0||activeValue(value(cells[oldIndex(ACTIVE)]));
   if(!active&&priorActive){if(target&&target.team!==team)plan.stats.movedOut++;else plan.stats.retired++;}
   if(!admin)set(r,ix(ACTIVE),inputCell(active));
   const cardInfo=informationById[id]||target?.card.info;
   const exception=informationExceptions[id];
   const denied=!cardInfo&&exception?.reason==='permission_denied'&&exception?.approved===true&&exception?.team===team;
   if(requireInformation&&!cardInfo&&!denied)conflicts.push({type:'unhydrated_card',team,id});
   if(denied)for(const field of INFORMATION){
    const c=ix(field),prior=plan.rows[r][c]||{},notice='No disponible: acceso denegado por Pipefy';
    if(!String(prior.note||'').includes(notice)){
     const note=prior.note?prior.note+'\n'+notice:notice;
     plan.requests.push(put(plan.sheetId,r,c,{note},'note'));plan.rows[r][c]={...prior,note};
    }
   }
   if(cardInfo)for(const field of INFORMATION){const v=cardInfo[field];if(v!==undefined&&v!==null)set(r,ix(field),inputCell(v));else if(requireInformation)conflicts.push({type:'missing_information_field',team,id,field});}
   if(target?.team===team&&reconcile){
    set(r,ix('PIPE ID'),inputCell(String(target.card.pipeId)));
    set(r,ix('Fase actual'),inputCell(target.card.phase||''));
   }
   if(!admin){
    set(r,ix('GESTIÓN COMPLETA'),formulaCell(otaFormula(ix,r+1)));
    if(ix('TIER')>=0)set(r,ix('TIER'),formulaCell(tierFormula(ix,r+1)));
    if(ix('DERIVACIÓN ADMIN')>=0){const state=column(ix('ESTADO LAVA'))+(r+1);set(r,ix('DERIVACIÓN ADMIN'),formulaCell(`=IF(OR(${state}="OT radicada",${state}="OT anulada pendiente revisión administrativa"),"Pendiente ADMIN","")`));}
    const existing=cells[ix('ESTADO LAVA')]?.dataValidation;
    const validation=existing?.condition?.type==='ONE_OF_LIST'?structuredClone(existing):{condition:{type:'ONE_OF_LIST',values:OTA_STATES.map(s=>({userEnteredValue:s}))},strict:true,showCustomUi:true};
    if(!validation.condition.values.some(v=>normalize(v.userEnteredValue)===normalize('OT Cancelada')))validation.condition.values.push({userEnteredValue:'OT Cancelada'});
    set(r,ix('ESTADO LAVA'),{dataValidation:validation},'dataValidation');
   }
  }
  const grid=sheet.properties.gridProperties;
  if(plan.rows.length>grid.rowCount)plan.requests.unshift({appendDimension:{sheetId:plan.sheetId,dimension:'ROWS',length:plan.rows.length-grid.rowCount}});
  if(plan.headers.length>grid.columnCount)plan.requests.unshift({appendDimension:{sheetId:plan.sheetId,dimension:'COLUMNS',length:plan.headers.length-grid.columnCount}});
  if(!sheet.columnMetadata?.[ix('PIPE ID')]?.hiddenByUser)plan.requests.push({updateDimensionProperties:{range:{sheetId:plan.sheetId,dimension:'COLUMNS',startIndex:ix('PIPE ID'),endIndex:ix('PIPE ID')+1},properties:{hiddenByUser:true},fields:'hiddenByUser'}});
  if(!admin&&!sheet.columnMetadata?.[ix(ACTIVE)]?.hiddenByUser)plan.requests.push({updateDimensionProperties:{range:{sheetId:plan.sheetId,dimension:'COLUMNS',startIndex:ix(ACTIVE),endIndex:ix(ACTIVE)+1},properties:{hiddenByUser:true},fields:'hiddenByUser'}});
  const visibleColumns=admin?plan.headers.length:ix(ACTIVE);
  const extendedRange=range=>({...range,...(range.endRowIndex!==undefined?{endRowIndex:Math.max(range.endRowIndex,plan.rows.length)}:{}),...(range.endColumnIndex!==undefined?{endColumnIndex:Math.max(range.endColumnIndex,visibleColumns)}:{})});
  plan.expectedFilters={basicFilter:structuredClone(sheet.basicFilter),filterViews:structuredClone(sheet.filterViews)};
  if(extendFilterRanges){
   if(sheet.basicFilter){
    const filter={...structuredClone(sheet.basicFilter),range:extendedRange(sheet.basicFilter.range)};
    if(digest(filter)!==digest(sheet.basicFilter)){
     if(filter.tableId)warnings.push({type:'table_filter_requires_separate_review',team});
     else {plan.requests.push({setBasicFilter:{filter}});plan.expectedFilters.basicFilter=filter;}
    }
   }
   for(const view of plan.expectedFilters.filterViews||[]){const range=extendedRange(view.range);if(digest(range)!==digest(view.range)){view.range=range;plan.requests.push({updateFilterView:{filter:{filterViewId:view.filterViewId,range},fields:'range'}});}}
  }else if(sheet.basicFilter?.range?.endRowIndex<plan.rows.length)warnings.push({type:'filter_range_does_not_cover_new_rows',team,filterRows:sheet.basicFilter.range.endRowIndex,requiredRows:plan.rows.length});
  if(!admin){
   const instructions=book.sheets.find(s=>s.properties.title==='Instrucciones LAVA');
   if(instructions){
    const rows=rowsOf(instructions),stateCol=rows[0]?.findIndex(c=>normalize(value(c))==='estados permitidos')??-1;
    if(stateCol>=0&&!rows.slice(1).some(r=>normalize(value(r[stateCol]))===normalize('OT Cancelada'))){
     const empty=rows.findIndex((r,i)=>i>0&&!String(value(r[stateCol])).trim());
     if(empty>=0)plan.requests.push(put(instructions.properties.sheetId,empty,stateCol,inputCell('OT Cancelada')));
     else conflicts.push({type:'state_catalog_no_empty_slot',team});
    }
   }
   const summary=book.sheets.find(s=>s.properties.title==='Resumen LAVA');if(!summary)throw Error('Resumen ausente '+team);
   const metrics=summaryFormulas(plan.headers,plan.tab),summaryRows=rowsOf(summary);
   const prefix=team==='ar_global_ops'?'v2_':'';
   const found=new Set();
   summaryRows.forEach((cells,r)=>{
    const key=String(value(cells[0]));if(!key.startsWith(prefix))return;
    const metric=key.slice(prefix.length);if(Object.hasOwn(metrics,metric)){found.add(metric);const cell=formulaCell(metrics[metric]);if(digest(cells[1]?.userEnteredValue)!==digest(cell.userEnteredValue))plan.requests.push(put(summary.properties.sheetId,r,1,cell));}
    if(metric==='snapshot'&&reconcileTeam(team)&&String(value(cells[1]))!==snapshot)plan.requests.push(put(summary.properties.sheetId,r,1,inputCell(snapshot)));
   });
   for(const key of Object.keys(metrics))if(!found.has(key))throw Error('Métrica ausente '+team+': '+key);
  }
  plan.rows[0]=plan.headers.map(inputCell);
 }
 const report={snapshot,absentPolicy,stats:Object.fromEntries(Object.entries(plans).map(([k,p])=>[k,p.stats])),conflicts,warnings,canApply:!conflicts.length&&!warnings.length,requests:Object.fromEntries(Object.entries(plans).map(([k,p])=>[k,p.requests.length]))};
 return {report,plans,digest:digest({books,inventory,snapshot,absentPolicy,informationById,informationExceptions,extendFilterRanges,requests:Object.fromEntries(Object.entries(plans).map(([t,p])=>[t,p.requests]))})};
}
function reconcileTeam(team){return ['ar_colombia','ar_global_ops'].includes(team);}
function priorLegacyActive(cells,index){return index(ACTIVE)<0||activeValue(value(cells[index(ACTIVE)]));}
function planRollback(before,after,current){
 if(before.spreadsheetId!==after.spreadsheetId||before.spreadsheetId!==current.spreadsheetId)throw Error('Rollback: IDs de archivo distintos');
 const requests=[],conflicts=[];
 for(const oldSheet of before.sheets){
  const id=oldSheet.properties.sheetId,a=after.sheets.find(s=>s.properties.sheetId===id),c=current.sheets.find(s=>s.properties.sheetId===id);
  if(!a||!c)throw Error('Rollback: hoja ausente');
  const old=rowsOf(oldSheet),applied=rowsOf(a),live=rowsOf(c);
  if(oldSheet.basicFilter&&a.basicFilter&&c.basicFilter&&digest(oldSheet.basicFilter.range)!==digest(a.basicFilter.range)){
   if(digest(c.basicFilter.range)!==digest(a.basicFilter.range))conflicts.push({sheetId:id,field:'basicFilter.range'});
   else requests.push({setBasicFilter:{filter:{...structuredClone(c.basicFilter),range:structuredClone(oldSheet.basicFilter.range)}}});
  }
  for(const original of oldSheet.filterViews||[]){
   const installed=a.filterViews?.find(v=>v.filterViewId===original.filterViewId),now=c.filterViews?.find(v=>v.filterViewId===original.filterViewId);
   if(installed&&now&&digest(original.range)!==digest(installed.range)){
    if(digest(now.range)!==digest(installed.range))conflicts.push({sheetId:id,filterViewId:original.filterViewId,field:'range'});
    else requests.push({updateFilterView:{filter:{filterViewId:original.filterViewId,range:structuredClone(original.range)},fields:'range'}});
   }
  }
  for(let r=0;r<old.length;r++)for(let col=0;col<(old[r]||[]).length;col++)for(const field of ['userEnteredValue','dataValidation']){
   if(digest(old[r][col]?.[field])===digest(applied[r]?.[col]?.[field]))continue;
   if(digest(live[r]?.[col]?.[field])!==digest(applied[r]?.[col]?.[field])){conflicts.push({sheetId:id,row:r,column:col,field});continue;}
   requests.push(put(id,r,col,{[field]:old[r][col]?.[field]},field));
  }
  if(oldSheet.properties.title==='LAVA 2026'){
   const ix=headerIndex((live[0]||[]).map(value)),oi=headerIndex((old[0]||[]).map(value)),active=ix(ACTIVE);
   if(active>=0)for(let r=1;r<live.length;r++){
    // Preserve all appended rows and their new human inputs; only deactivate them.
    const target=r<old.length?(oi(ACTIVE)<0?true:value(old[r][oi(ACTIVE)])):false;
    if(digest(live[r]?.[active]?.userEnteredValue)!==digest(applied[r]?.[active]?.userEnteredValue)){conflicts.push({sheetId:id,row:r,column:active,field:'userEnteredValue'});continue;}
    if(digest(live[r]?.[active]?.userEnteredValue)!==digest(inputCell(target).userEnteredValue))requests.push(put(id,r,active,inputCell(target)));
   }
  }
 }
 return {spreadsheetId:before.spreadsheetId,requests,conflicts,canApply:conflicts.length===0};
}
module.exports={planMigration,planRollback,rowsOf,value,column,inputCell,formulaCell,put,digest,summaryFormulas,otaFormula};
