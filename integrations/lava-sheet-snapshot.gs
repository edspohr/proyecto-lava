/* Full read-only Sheets snapshot for review/backups. Creates private JSON files
 * in the same user's Drive, never changes source workbooks or their sharing.
 */
function captureLavaSheetsForReview(){
 const targets={pi:'1o8ishaXM2x-radoxCsKOd4GllC1I9bFQc37hEISIkK0',ar_colombia:'19s9kD3_Gz73hheFxCRkbK5E63szhhiIWbLBVqBudnaM',ar_global_ops:'1gsQGMbHUbI3TjOjVaVsCleJi7UGab3lVnLvDmf1STj0',admin:'17YOFuE3ZDL8ZD8g0cPnk8QQMUO70xE0XmucPxkildDU',dashboard:'1UEEH3AGMiwmVyYRLPLf6CilofIbjSJTCT5jU1MzYP9g'};
 const token=ScriptApp.getOAuthToken(),captured={observedAt:new Date().toISOString(),books:{}};
 for(const team of Object.keys(targets)){
  const response=UrlFetchApp.fetch('https://sheets.googleapis.com/v4/spreadsheets/'+targets[team]+'?includeGridData=true',{headers:{Authorization:'Bearer '+token},muteHttpExceptions:true});
  if(response.getResponseCode()!==200){const error=JSON.parse(response.getContentText()).error;console.log(JSON.stringify({team,http:response.getResponseCode(),reason:error?.status,message:error?.message}));throw Error('No se pudo capturar '+team);}
  const content=response.getContentText(),book=JSON.parse(content);
  if(book.spreadsheetId!==targets[team]||!Array.isArray(book.sheets))throw Error('Respuesta Sheets incompleta');
  const file=DriveApp.createFile('LAVA-snapshot-'+team+'-'+Date.now()+'.json',content,MimeType.PLAIN_TEXT);
  captured.books[team]={spreadsheetId:targets[team],snapshotFileId:file.getId(),url:file.getUrl()};
  console.log(JSON.stringify({team,snapshotFile:file.getUrl(),sheets:book.sheets.length}));
 }
 const manifest=DriveApp.createFile('LAVA-snapshots-'+Date.now()+'.json',JSON.stringify(captured),MimeType.PLAIN_TEXT);
 PropertiesService.getScriptProperties().setProperty('LAVA_REVIEW_SNAPSHOTS',manifest.getId());
 console.log(JSON.stringify({manifest:manifest.getUrl(),complete:true}));
}
