// This is deleteTriggersSheetsForms.gs
function runClean() {   
  deleteAllTriggers();
  deleteSheets();
  deleteFormsDocs();
  log.info(`clean.gs | All cleaned! 🧹`)
  return "All cleaned successfully! 🧹"; 
}


function deleteFormsDocs() {
  // UPDATE: we changed to handle the files that are created specific to this project(s)
  // file(s) will have prefix of "study name". That's why we iterate over studies in the config.gs should multiple studies are placed.

  for (let study of Object.keys(STUDIES)) {

    let studyName = STUDIES[study]['name']

    forms = DriveApp.getFilesByName(studyName);
    while (forms.hasNext()){
      var form = forms.next();
      log.debug(`clean.gs | File name: ${form}`)
      form.setTrashed(true);
      log.info(`deleting ${form}`);
    }
    log.info(`clean.gs | Deleted all forms.`)

    let documentName = studyName + " -- email text"

    docs = DriveApp.getFilesByName(documentName);
    var ix = 0;
    while (docs.hasNext()){
      var doc = docs.next();
      doc.setTrashed(true);
      log.info(`deleting ${doc}`);
    }
    log.info(`clean.gs | Deleted all docs.`);

  }
}

function deleteSheets() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let studyName = "GABLE_01"
  sheetNames = [`${studyName}`, `${studyName}Updates`, "GiftCards", "Config"];

  for (var i=0; i<sheetNames.length; i++){
    var sheet = spreadsheet.getSheetByName(sheetNames[i]);
    var formurl = sheet.getFormUrl()
    if (formurl){
      FormApp.openByUrl(formurl).removeDestination();
      // log.info(`removing destination ${formurl}`);
    }
    if (sheet) {
      spreadsheet.deleteSheet(sheet);
      log.info(`deleting sheet ${sheet}`);
    } else {
      log.warning(`clean.gs | Sheet not found: ${sheetNames[i]}`);
    }
  }
  log.info(`clean.gs | Deleted all unnecessary sheets.`);
}

function deleteAllTriggers() {
  // Delete all triggers when rerunning the experiment.
  var allTriggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < allTriggers.length; i++) {
    ScriptApp.deleteTrigger(allTriggers[i]);
  }
  log.info(`clean.gs | Deleted all triggers.`);
}

// Currently, we don't call this function.
function deleteFormResponse(study, index=0) {
    console.log(Object.keys(STUDIES))
    console.log(STUDIES[study])
    let form = FormApp.openByUrl(STUDIES[study].formURL)
    let formResponses = form.getResponses()
    var ss = SpreadsheetApp.openByUrl(SPREADSHEET_URL).getSheetByName(study)
    //form.deleteResponse(formResponses[index].getId())
    ss.deleteRow(2)
    if (formResponses.length <= index) {
      return false;
    }
    var ss = SpreadsheetApp.openByUrl(SPREADSHEET_URL).getSheetByName(study)
    form.deleteResponse(formResponses[index].getId())
    ss.hideRow(index+1)
    return true;
}

