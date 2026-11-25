'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
// Production has no transpilation/dependency step. Package only the explicit runtime.
const files=['index.html','app.js','styles.css','favicon.svg','img/logo.png','api/metrics.js','lib/otas.js','lib/rules.js','lib/sheet-schema.js','sources.json','vercel.json','package.json'];
const root=path.resolve(__dirname,'..'),out=path.join(root,'dist');fs.mkdirSync(out,{recursive:true});
for(const file of files){const source=path.join(root,file);if(file.endsWith('.js'))new vm.Script(fs.readFileSync(source,'utf8'),{filename:file});fs.mkdirSync(path.dirname(path.join(out,file)),{recursive:true});fs.copyFileSync(source,path.join(out,file));}
new vm.Script(fs.readFileSync(path.join(root,'integrations/lava-pipefy.gs'),'utf8'),{filename:'lava-pipefy.gs'});
new vm.Script(fs.readFileSync(path.join(root,'integrations/lava-migration-preview.gs'),'utf8'),{filename:'lava-migration-preview.gs'});
new vm.Script(fs.readFileSync(path.join(root,'integrations/lava-migration-reader.gs'),'utf8'),{filename:'lava-migration-reader.gs'});
new vm.Script(fs.readFileSync(path.join(root,'integrations/lava-sheet-snapshot.gs'),'utf8'),{filename:'lava-sheet-snapshot.gs'});
console.log('Build OK: '+files.length+' archivos de ejecución; datos privados e integraciones excluidos.');
