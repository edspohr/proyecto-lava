// Generate the private supplemental-ID initializer for the approved preview.
// No network access. Output belongs next to the private input, never in Git.
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {rowsOf,value}=require('../lib/migration');const {headerIndex}=require('../lib/sheet-schema');
const input=path.resolve(process.argv[2]),data=JSON.parse(fs.readFileSync(input)),seen=new Set();
for(const [team,book] of Object.entries(data.books)){
 if(team==='dashboard')continue;
 const rows=rowsOf(book.sheets.find(s=>s.properties.title===(team==='admin'?'LAVA ADMIN':'LAVA 2026'))),ix=headerIndex(rows[0].map(value));
 rows.slice(1).forEach(row=>{const id=String(value(row[ix('ID')]));if(id)seen.add(id);});
}
const supplemental=Object.fromEntries(['ar_colombia','ar_global_ops'].map(t=>[t,data.inventory[t].map(c=>String(c.id)).filter(id=>!seen.has(id))]));
const body='function configureLavaMigrationPreview(){PropertiesService.getScriptProperties().setProperty("LAVA_PREVIEW_REPORT_IDS",'+JSON.stringify(JSON.stringify(supplemental))+');return startLavaMigrationPreview();}\n';
const file=path.join(path.dirname(input),'preview-bootstrap.gs');fs.writeFileSync(file,body,{mode:0o600});console.log(JSON.stringify({file,supplemental:Object.fromEntries(Object.entries(supplemental).map(([t,v])=>[t,v.length]))}));
