const scriptProperties = PropertiesService.getScriptProperties();

const apikey = scriptProperties.getProperty("x-api-key");
const key = scriptProperties.getProperty("KEY");
const secret = scriptProperties.getProperty("SECRET");
const dns = scriptProperties.getProperty("cloudfront");
const bucket = scriptProperties.getProperty("bucket");
const rulesFile = scriptProperties.getProperty("rules");

const rulesSheet = "Rules";
const invalidationsSheet = "Invalidations";

const ss = SpreadsheetApp.getActiveSpreadsheet();
const rules = ss.getSheetByName(rulesSheet);
const invalidations = ss.getSheetByName(invalidationsSheet);

function onOpen() {
  var ui = SpreadsheetApp.getUi();

  ui.createMenu('Cloud Redirector')
      .addItem('Sincronitzar regles', "s3upload")
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

function getCSVData(){

  const range = rules.getDataRange();
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

function s3upload(){
  const s3 = S3.getInstance(key, secret);
  const blob = Utilities.newBlob(getCSVData().join("\n", "text/csv"));
  s3.putObject(bucket, rulesFile, blob, {logRequests:true});
  invalidateRules();
  Browser.msgBox("Sincronitzat!");
}