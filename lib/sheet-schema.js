'use strict';
const {normalize}=require('./rules');
// Asterisks are presentation metadata, never part of a field's identity.
const headerKey=value=>normalize(String(value??'').replace(/\s*\*\s*$/, ''));
function headerIndex(headers){
 const result=new Map();
 headers.forEach((h,i)=>{const key=headerKey(h);if(!key)return;if(result.has(key))throw Error('Encabezados duplicados: '+h);result.set(key,i);});
 return name=>result.get(headerKey(name))??-1;
}
const REQUIRED=['ESTADO LAVA','FECHA DE GESTIÓN','OBSERVACIÓN LAVA'];
const INFORMATION=['País de la actividad','Nombre del proyecto','Actuación en inglés','Actuación en español'];
const ACTIVE='LAVA ACTIVA';
function activeValue(value){
 if(value===undefined||value===null||value==='')return true; // Legacy rows.
 if(value===true||normalize(value)==='true')return true;
 if(value===false||normalize(value)==='false')return false;
 throw Error('LAVA ACTIVA debe ser TRUE o FALSE');
}
module.exports={headerKey,headerIndex,REQUIRED,INFORMATION,ACTIVE,activeValue};
