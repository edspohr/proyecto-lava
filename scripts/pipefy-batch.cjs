// Private operator CLI. Never served by the website. Input is an exported LAVA campaign CSV.
const fs=require('node:fs');const path=require('node:path');
const {parseCSV,recordsFromRows}=require('../lib/otas');const {prepareBatch,applyBatch}=require('../lib/writeback');
async function main(){
 const args=process.argv.slice(2),input=args.find(a=>!a.startsWith('--'));
 if(!input)throw Error('Uso: node scripts/pipefy-batch.cjs archivo.csv [--admin] [--apply]');
 const rows=parseCSV(fs.readFileSync(input,'utf8')),records=recordsFromRows(rows,args.includes('--admin'));
 const cutoff=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const batch=prepareBatch(records,cutoff);
 if(!args.includes('--apply')){console.log(JSON.stringify({mode:'preview',entries:batch},null,2));return;}
 if(!process.env.PIPEFY_TOKEN)throw Error('Configura PIPEFY_TOKEN fuera del repositorio; no hay escritura activa.');
 const journalFile=process.env.LAVA_JOURNAL_PATH;
 if(!journalFile||!path.isAbsolute(journalFile))throw Error('LAVA_JOURNAL_PATH debe ser una ruta absoluta en almacenamiento durable privado.');
 fs.mkdirSync(path.dirname(journalFile),{recursive:true,mode:0o700});
 const lock=fs.openSync(journalFile+'.lock','wx',0o600);
 try{
  const journal=fs.existsSync(journalFile)?JSON.parse(fs.readFileSync(journalFile,'utf8')):{};
  const save=async data=>{const temp=journalFile+'.tmp',fd=fs.openSync(temp,'w',0o600);try{fs.writeFileSync(fd,JSON.stringify(data,null,2));fs.fsyncSync(fd);}finally{fs.closeSync(fd);}fs.renameSync(temp,journalFile);};
  async function graphql(query,variables){const response=await fetch('https://api.pipefy.com/graphql',{method:'POST',headers:{Authorization:'Bearer '+process.env.PIPEFY_TOKEN,'Content-Type':'application/json'},body:JSON.stringify({query,variables}),signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('Pipefy HTTP '+response.status);const result=await response.json();if(result.errors?.length)throw Error('Pipefy rechazó la operación');return result.data;}
  const client={readCard:async id=>{const data=await graphql('query($id:ID!){card(id:$id){id updated_at pipe{id} comments{id text}}}',{id});if(!data.card||!Array.isArray(data.card.comments))throw Error('Tarjeta no disponible');return data.card;},createComment:async(card_id,text,clientMutationId)=>(await graphql('mutation($input:CreateCommentInput!){createComment(input:$input){comment{id}}}',{input:{card_id,text,clientMutationId}})).createComment.comment};
  const outcomes=await applyBatch(batch,{client,journal,save});console.log(JSON.stringify({mode:'apply',outcomes},null,2));if(outcomes.some(o=>o.status!=='sent'))process.exitCode=1;
 }finally{fs.closeSync(lock);fs.unlinkSync(journalFile+'.lock');}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
