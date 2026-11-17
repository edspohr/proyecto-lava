const {test}=require('node:test');
const assert=require('node:assert/strict');
const {parseCSV,parseDate,summarize,GROUPS}=require('../lib/otas');
const h=['OT','Fase actual','GRUPO DE ACCIÓN','ESTADO','Fecha Solicitud OT'];
const row=(ot,date,state='Listo',group=GROUPS[0],phase='OTAS - Solicitud')=>[ot,phase,group,state,date];
test('CSV: BOM, multiline notes, commas and escaped quotes',()=>{
 assert.deepEqual(parseCSV('\ufeffA,B\r\n"one,two","line1\n""two"""\r\n'),[['A','B'],['one,two','line1\n"two"']]);
 assert.throws(()=>parseCSV('a,"unterminated'));
});
test('thresholds are strict; leap calendar year is clamped',()=>{
 let s=summarize([h,row('1','2026-08-19'),row('2','2026-08-18'),row('3','2025-11-17'),row('4','2025-11-16','Pendiente')],'2026-11-17');
 assert.equal(s.over90,3);assert.equal(s.overYear,1);assert.equal(s.overYearPending,1);
 s=summarize([h,row('1','2023-02-28'),row('2','2023-02-27')],'2024-02-29');assert.equal(s.overYear,1);
});
test('dates: request date, serials, missing and future dates',()=>{
 assert.equal(parseDate('2026-02-30'),null);assert.equal(parseDate('17/11/2026'),Date.UTC(2026,10,17));
 assert.equal(parseDate('45208'),Date.UTC(2023,9,9));
 const s=summarize([h,row('1',''),row('2','2027-01-01'),row('3','2023-10-09')],'2026-11-17');
 assert.equal(s.unknownDates,2);assert.equal(s.overYear,1);
});
test('historical category mean differs from actual row compliance',()=>{
 const s=summarize([h,row('1','2023-01-01'),row('2','2023-01-01','Pendiente'),row('3','2023-01-01','Listo',GROUPS[1])],'2026-11-17');
 assert.equal(s.progress,37.5);assert(Math.abs(s.actualProgress-200/3)<1e-10);assert.equal(s.overYear,3);assert.equal(s.over90,3);
});
test('header order can change; missing request date is explicit',()=>{
 const s=summarize([['ESTADO','OT','Fase actual','GRUPO DE ACCIÓN'],['Listo','1','OTAS sin radicar/Gestión PI',GROUPS[0]]],'2026-11-17');
 assert.equal(s.done,1);assert.equal(s.unknownDates,1);
});
test('closed phases are excluded; missing headers, duplicates and empty inputs fail visibly',()=>{
 assert.equal(summarize([h,row('1','2023-01-01'),row('2','2023-01-01','Listo',GROUPS[0],'Cerrada')],'2026-11-17').total,1);
 assert.throws(()=>summarize([h,row('1',''),row('1','')],'2026-11-17'),/duplicado/);
 assert.throws(()=>summarize([['OT'],['1']],'2026-11-17'),/encabezados/);
 assert.throws(()=>summarize([h],'2026-11-17'),/Sin OTAS/);
});
test('API returns partial aggregates without raw rows or invented AR Global',async()=>{
 const original=global.fetch;global.fetch=async()=>({ok:true,text:async()=>h.join(',')+'\n'+row('1','2023-01-01').join(',')});
 try{
  let body;const res={setHeader(){},end(v){body=JSON.parse(v)}};
  await require('../api/metrics')({method:'GET'},res);
  assert.equal(body.global,null);assert.equal(body.complete,false);
  assert.equal(body.areas.find(a=>a.key==='ar_global_ops').status,'pending');
  assert(!JSON.stringify(body).includes('2023-01-01'));assert(!('rows' in body.areas[0]));
 }finally{global.fetch=original;}
});

test('two cards can share an OT; card ID determines uniqueness when present',()=>{
 const s=summarize([[...h,'ID'],[...row('1','2023-01-01'),'a'],[...row('1','2023-01-01'),'b']],'2026-11-17');assert.equal(s.total,2);
});
