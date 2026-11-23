const{test}=require('node:test');const assert=require('node:assert/strict');
const{OTA_STATES}=require('../lib/rules');const{prepareBatch,applyBatch}=require('../lib/writeback');const{buildAdminUniverse,deriveAdminReferrals}=require('../lib/admin');
const r={pipeId:'301834596',id:'123',ot:'OT1',state:OTA_STATES[7],contactDate:'2026-11-23',observation:'Radicada; enviar soporte a ADMIN',responsible:'Responsable SPI'};
test('batch preserves declared author, stable IDs and deterministic retry marker',()=>{
 const batch=prepareBatch([r],'2026-11-23');assert.equal(batch.length,1);assert.match(batch[0].text,/Responsable declarado: Responsable SPI/);assert.equal(batch[0].hash,prepareBatch([r],'2026-11-23')[0].hash);assert.notEqual(batch[0].hash,prepareBatch([{...r,observation:'Nueva revisión'}],'2026-11-23')[0].hash);
 assert.throws(()=>prepareBatch([{...r,pipeId:'999'}],'2026-11-23'),/Destino/);assert.throws(()=>prepareBatch([r,r],'2026-11-23'),/duplicada/);
});
test('re-running a successful batch does not create a second comment',async()=>{
 const entries=prepareBatch([r],'2026-11-23'),journal={},card={pipe:{id:r.pipeId},updated_at:'a',comments:[]};let writes=0,saves=0;
 const client={readCard:async()=>card,createComment:async(id,text)=>{writes++;card.comments.push({id:'comment1',text});card.updated_at='b';return{id:'comment1'};}};
 const opts={client,journal,save:async()=>{saves++}};assert.equal((await applyBatch(entries,opts))[0].status,'sent');await applyBatch(entries,opts);assert.equal(writes,1);assert(saves>=3);
});
test('lost response reconciles on next read, never blindly resends an uncertain operation',async()=>{
 const entries=prepareBatch([r],'2026-11-23'),journal={},card={pipe:{id:r.pipeId},updated_at:'a',comments:[]};let writes=0;
 const client={readCard:async()=>card,createComment:async(id,text)=>{writes++;card.comments.push({id:'1',text});throw Error('timeout after commit');}};
 const opts={client,journal,save:async()=>{}};assert.equal((await applyBatch(entries,opts))[0].status,'uncertain');assert.equal((await applyBatch(entries,opts))[0].status,'sent');assert.equal(writes,1);
 const journal2={[entries[0].hash]:{status:'sending'}};card.comments=[];assert.equal((await applyBatch(entries,{...opts,journal:journal2}))[0].status,'uncertain');assert.equal(writes,1);
});
test('conflicts and partial failures do not prevent unrelated successful operations',async()=>{
 const entries=prepareBatch([r,{...r,id:'456'}],'2026-11-23'),journal={},cards={'123':{pipe:{id:'wrong'},updated_at:'a',comments:[]},'456':{pipe:{id:r.pipeId},updated_at:'a',comments:[]}};
 const client={readCard:async id=>cards[id],createComment:async(id,text)=>{cards[id].comments.push({id:'c',text});return{id:'c'}}};
 const outcomes=await applyBatch(entries,{client,journal,save:async()=>{}});assert.deepEqual(outcomes.map(o=>o.status),['conflict','sent']);
});
test('ADMIN keeps missing balances in reconciliation and completed work since 2025 only',()=>{
 const card={id:'123',ot:'OT1',phase:'Completadas 🏁',date:'2025-01-01',country:'Peru'};
 const s=buildAdminUniverse([card]);assert.equal(s.reviews.length,2);assert.equal(s.reconciliation.length,1);
 assert.equal(buildAdminUniverse([{...card,date:'2024-12-31',balanceToInvoice:10}]).reviews.length,1);
 assert.equal(buildAdminUniverse([{...card,date:'2025-01-01',balanceToInvoice:10}]).reviews.length,3);
 assert.equal(buildAdminUniverse([{...card,phase:'Pago del Cliente Recibido💰',country:'Colombia'}]).reviews.length,1);
});
test('ADMIN referrals deduplicate by source and require one unambiguous target',()=>{
 assert.equal(deriveAdminReferrals([r,r],[{id:'admin1',ot:r.ot}]).length,1);
 assert.equal(deriveAdminReferrals([r],[{id:'a',ot:r.ot},{id:'b',ot:r.ot}])[0].status,'reconciliation');
 assert.equal(deriveAdminReferrals([r],[{id:'a',ot:r.ot}])[0].adminCardId,'a');
});
