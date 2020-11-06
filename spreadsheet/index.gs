const scriptProperties = PropertiesService.getScriptProperties();

const apikey = scriptProperties.getProperty("x-api-key");
const key = scriptProperties.getProperty("KEY");
const secret = scriptProperties.getProperty("SECRET");
const dns = scriptProperties.getProperty("cloudfront");
const bucket = scriptProperties.getProperty("bucket");
const rulesFile = scriptProperties.getProperty("rules");
const regexpFile = scriptProperties.getProperty("regexp");

const rulesSheet = "Rules";
const invalidationsSheet = "Invalidations";
const regexpSheet = "RegExp";

const ss = SpreadsheetApp.getActiveSpreadsheet();
const rules = ss.getSheetByName(rulesSheet);
const invalidations = ss.getSheetByName(invalidationsSheet);
const regExp = ss.getSheetByName(regexpSheet);

function onOpen() {
  var ui = SpreadsheetApp.getUi();

  ui.createMenu('Cloud Redirector')
      .addItem('Sincronitzar regles', "s3uploadRules")
      .addItem('Sincronitzar regexp', "s3uploadRegexp")
      .addItem('Forçar invalidació', "forceInvalidation")
      .addToUi();
  
  
  ScriptApp.newTrigger('change')
    .forSpreadsheet(ss)
    .onChange()
}

function onEdit(e) {
  if(e.source.getActiveSheet().getName()!==rulesSheet){
    return; 
  }
  const row = e.range.getRow();
  let value = rules.getRange("B"+row).getValue();
  value = value==="" ? "/" : value;
  invalidations.appendRow([value])
}

function change(e){
  //Browser.msgBox(e)
  if(e.source.getActiveSheet().getName()!==rulesSheet){
    return; 
  }
  //Browser.msgBox(e.range.getRow())
}

function getCSVData(_sheet){

  const range = _sheet.getDataRange();
  const values = range.getValues();
  let rows = [];
  let row;

  for (var i = 0; i < values.length; i++) {
    row = "";
    for (var j = 0; j < values[i].length; j++) {
      if (values[i][j]) {
        row = row + values[i][j];
      }
      row = row + ",";
    }
    rows.push(row);
  }
  return rows;
}

function invalidateRules(){
  const range = invalidations.getDataRange();
  const values = range.getValues();

  let options = {
    'method' : 'post',
    'headers' : {
      'x-api-key' : apikey,
    }
  };

  const endpoint = `https://${dns}/invalidate/`;
  const newValue = [""];
  let rows = [];

  options.headers["x-invalidatepaths"] = values.join(",");
  UrlFetchApp.fetch(endpoint, options);

  for (var i = 0; i < values.length; i++) {
      rows.push(newValue);
  }
  range.setValues(rows);
}

function s3uploadRules(){
  const s3 = S3.getInstance(key, secret);
  const blob = Utilities.newBlob(getCSVData(rules).join("\n", "text/csv"));
  s3.putObject(bucket, rulesFile, blob, {logRequests:true});
  invalidateRules();
  Browser.msgBox("Sincronitzat!");
}

function forceInvalidation(){
  let paths = Browser.inputBox("Paths a invalidar (separat per coma)");
  if(!paths){
    Browser.msgBox("Has d'informar un o més paths!");
    return;
  }
  
  if(paths==='cancel'){
    return;
  }
  
  paths = paths.split(",");
  paths = paths.map(item => item.charAt(0)!=="/" ? "/" + item : item);
  paths = paths.join(",");
    
  const options = {
    'method' : 'post',
    'headers' : {
      'x-api-key' : apikey,
      'x-invalidatepaths': paths
    }
  };

  const endpoint = `https://${dns}/invalidate/`;
  UrlFetchApp.fetch(endpoint, options);
  Browser.msgBox("Petició enviada!");
}

function s3uploadRegexp(){
  const s3 = S3.getInstance(key, secret);
  const blob = Utilities.newBlob(getCSVData(regExp).join("\n", "text/csv"));
  s3.putObject(bucket, regexpFile, blob, {logRequests:true});
  let options = {
    'method' : 'post',
    'headers' : {
      'x-api-key' : apikey,
    }
  };
  const endpoint = `https://${dns}/`;
  UrlFetchApp.fetch(endpoint, options);
  Browser.msgBox("Sincronitzat!");
}