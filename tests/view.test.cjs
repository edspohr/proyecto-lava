const{test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
test('view keeps three areas, withholds global and does not claim zero when all dates are missing',async()=>{
 const nodes=new Map();const document={hidden:false,querySelector(k){if(!nodes.has(k))nodes.set(k,{style:{},setAttribute(){},removeAttribute(){},addEventListener(){}});return nodes.get(k)}};
 const ok=(key,unknownDates)=>({key,status:'ok',progress:50,actualProgress:50,total:10,done:5,overYear:unknownDates?0:3,over90:unknownDates?0:7,overYearPending:1,over90Pending:2,unknownDates});
 const data={areas:[ok('pi',10),ok('ar_colombia',0),{key:'ar_global_ops',status:'pending',message:'Archivo pendiente de conectar'}],global:null,complete:false,cutoff:'2026-11-17',fetchedAt:'2026-11-17T12:00:00Z'};
 const ctx={document,Intl,AbortSignal,setInterval(){},fetch:async()=>({ok:true,json:async()=>data})};
 vm.runInNewContext(fs.readFileSync('app.js','utf8'),ctx);await new Promise(setImmediate);
 assert.equal(document.querySelector('#percentage').innerHTML,'—');
 const html=document.querySelector('#area-cards').innerHTML;assert.equal((html.match(/class="area-card/g)||[]).length,3);assert(html.includes('AR Colombia'));assert(html.includes('AR Global'));assert(html.includes('<b>—</b> con más de 1 año'));
 assert.match(document.querySelector('#priority-coverage').textContent,/PARCIAL/);assert.equal(document.querySelector('#legacy-total').textContent,'3 detectadas');
});
