const{test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
test('four independent cards render an earned benefit even when another source fails',async()=>{
 const nodes=new Map();const document={hidden:false,querySelector(k){if(!nodes.has(k))nodes.set(k,{style:{},setAttribute(){},removeAttribute(){},addEventListener(){}});return nodes.get(k)}};
 const data={areas:[{key:'pi',status:'ok',progress:100,total:5,done:5,historical:1,historicalDone:1,reminder:2,reminderDone:2,recent:2,recentDone:2,unknownDates:0,adminReferrals:0,benefit:'unlocked'},{key:'ar_colombia',status:'error',message:'Error <script>'},{key:'ar_global_ops',status:'pending'},{key:'admin',status:'pending'}],deadline:'2026-12-18',cutoff:'2026-11-23',timezone:'America/Santiago',fetchedAt:'2026-11-23T12:00:00Z',sourceSnapshotDate:'2026-11-17',writebackEnabled:false};
 vm.runInNewContext(fs.readFileSync('app.js','utf8'),{document,Intl,Date,AbortSignal,setInterval(){},fetch:async()=>({ok:true,json:async()=>data})});await new Promise(setImmediate);
 const html=document.querySelector('#area-cards').innerHTML;assert.equal((html.match(/<article /g)||[]).length,4);assert(html.includes('Beneficio desbloqueado'));assert(html.includes('ADMIN'));assert(!html.includes('<script>'));assert(html.includes('&lt;script&gt;'));assert.equal(document.querySelector('#countdown').textContent,'25 días');assert.match(document.querySelector('#sync-explanation').textContent,/no está activado/);
});
test('public HTML does not link private source workbooks or expose legacy rules',()=>{
 const html=fs.readFileSync('index.html','utf8');assert(!html.includes('docs.google.com'));assert(!html.includes('por confirmar'));assert(!html.includes('promedio'));assert(html.includes('18 de diciembre'));assert(html.includes('24 y 31'));
});
