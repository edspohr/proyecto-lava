const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const metrics=require('../api/metrics');
const root=path.resolve(__dirname,'..');
const files={'/':'index.html','/index.html':'index.html','/app.js':'app.js','/styles.css':'styles.css','/favicon.svg':'favicon.svg','/img/logo.png':'img/logo.png'};
http.createServer((req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;
 if(pathname==='/api/metrics')return metrics(req,res).catch(()=>{res.statusCode=500;res.end('Error de lectura');});
 const file=files[pathname];if(!file){res.statusCode=404;return res.end('Not found');}
 const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'};
 res.setHeader('Content-Type',mime[path.extname(file)]);fs.createReadStream(path.join(root,file)).pipe(res);
}).listen(8765,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:8765'));
