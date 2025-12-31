function doGet(e) {   // updateConfigTime {"parameter": {"functionName": "updateConfigTime", "time": "NOW"}}
  const functionName = e.parameter.functionName
  log.info(`functionName: ${functionName}`)
  let response = {};

  try {
    if (functionName === "updateConfigTime") {
      log.debug(`python_api.gs | doGet(e) | updateConfigTime`);
      updateEmails() 
      simulatedTime = e.parameter.time
      // Update the time in the Config sheet
      response.message = updateConfigTime(simulatedTime);  // If simulatedTime is null, updateConfigTime will default to "NOW"
      processAzureStorage()
      sendAllStudyEmails()
    } else if (functionName === "updateExperimentUrl") {
      log.debug(`python_api.gs | doGet(e) | updateExperimentUrl`);
      experimentUrl = e.parameter.url;
      updateExperimentUrl(experimentUrl);
    } else if (functionName === "getCurrentDate") {
      log.debug(`python_api.gs | doGet(e) | getCurrentDate`);
      response.message = getCurrentDate();
    } else if (functionName === "runClean") {
      log.debug(`python_api.gs | doGet(e) | runClean`);
      response.message = runClean();
    } else if (functionName === "getFormUrlPublished") {
      log.debug(`python_api.gs | doGet(e) | getFormUrlPublished`);
      response = getFormUrlPublished(e.parameter.formName);
    } else if (functionName === "sendAllStudyEmails") {
      log.debug(`python_api.gs | doGet(e) | sendAllStudyEmails`);
      sendAllStudyEmails();
      response = {"message": "success"}
    } else if (functionName === "getSessionCompletionTime") { 
      log.debug(`python_api.gs | doGet(e) | getSessionCompletionTime`);
      var study = e.parameter.study;
      var fileData = e.parameter.fileData;
      var sessionNumber = e.parameter.sessionNumber;
    
      response = getSessionCompletionTime(study, fileData, sessionNumber);
    } else if (functionName === "getLastTrialCompletedTime") {
      log.debug(`python_api.gs | doGet(e) | getLastTrialCompletedTime`);
      var study = e.parameter.study;
      var fileData = e.parameter.fileData;
      var sessionNumber = e.parameter.sessionNumber;

      response = getLastTrialCompletedTime(study, fileData, sessionNumber);
    } else if (functionName === "reactivateUser") {
      log.debug(`python_api.gs | doGet(e) | reactivateUser`);
      const participantId = e.parameter.participantId;
      const timestamp = e.parameter.timestamp;
      response = reactivateUser(participantId, timestamp);
      
    } else if (functionName === "rescheduleUser") {
      log.debug(`python_api.gs | doGet(e) | rescheduleUser`);
      const participantId = e.parameter.participantId;
      const timestamp = e.parameter.timestamp;
      response = rescheduleUser(participantId, timestamp);
      
    } else if (functionName === "renameUserId") {
      log.debug(`python_api.gs | doGet(e) | renameUserId`);
      const oldId = e.parameter.oldId;
      const newId = e.parameter.newId;
      response = renameUserId(oldId, newId);

    } else {
      response.error = "Invalid function name";
    }
  } catch (error) {
    response.error = `An error occurred: ${error.message}`;
  }

  log.info(`functionName: ${functionName} | responseText: ${JSON.stringify(response)}`);

  // Return the JSON response
  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

function getFormUrlPublished(formName) {
  const sheet = SpreadsheetApp.openByUrl(SPREADSHEET_URL).getSheetByName("Config");
  const Avals = sheet.getRange("A1:A").getValues();  // Get all values in column A
  let publishedUrl = null;

  // Loop through the rows to find the specified form name
  for (let i = 0; i < Avals.length; i++) {
    if (Avals[i][0] && Avals[i][0].toUpperCase() === formName.toUpperCase()) {
      publishedUrl = sheet.getRange(i + 1, 3).getValue();  // Get value from column C in the found row
      break;
    }
  }

  // Return the published URL as an object or an error if not found
  if (publishedUrl) {
    log.info(`FORM_URL_PUBLISHED for ${formName}: ${publishedUrl}`);
    return { url: publishedUrl };
  } else {
    log.info(`FORM_URL_PUBLISHED not found for form: ${formName}`);
    return { error: "Form URL not found" };
  }
}


function findUserCell(participantId) {
  const studyName = "GABLE_01";  
  const sheet = SpreadsheetApp.openByUrl(SPREADSHEET_URL).getSheetByName(studyName);
  if (!sheet) {
    return { error: `Sheet not found: ${studyName}` };
  }

  const data = sheet.getDataRange().getValues();

  for (let i = 0; i < data.length; i++) {
    if (data[i][COLUMNS.ID - 1] == participantId) {
      let lastSessionCol = -1;

      for (let j = COLUMNS.FIRST_SCHED - 1; j < data[i].length; j++) {
        if (data[i][j] !== "") {
          lastSessionCol = j;
        }
      }

      if (lastSessionCol > -1) {
        const cell = sheet.getRange(i + 1, lastSessionCol + 1);
        return {
          sheet,
          cell,
          rowIndex: i + 1,
          lastSessionCol,
          bgColor: cell.getBackground().toLowerCase(),
          completedVal: data[i][COLUMNS.COMPLETED - 1]
        };
      }
    }
  }

  return { error: `User not found: ${participantId}` };
}


function reactivateUser(participantId, timestamp) {
  const result = findUserCell(participantId);
  if (result.error) return result;

  const { sheet, cell, lastSessionCol, bgColor, completedVal, rowIndex } = result;

  if (bgColor === RED && completedVal === "Invalid") {
    sheet.getRange(rowIndex, COLUMNS.COMPLETED).setValue("");
    cell.setValue(timestamp);

    if (lastSessionCol === COLUMNS.FIRST_SCHED - 1) {
      cell.setBackground(WHITE);
    } else {
      cell.setBackground(CALENDER_GREEN);
    }

    return { message: `Reactivated ${participantId} at ${timestamp}` };
  }

  return {
    error: `Conditions not met for ${participantId}. Completed='${completedVal}', bg='${bgColor}'.`
  };
}


function rescheduleUser(participantId, timestamp) {
  const result = findUserCell(participantId);
  if (result.error) return result;

  const { cell, bgColor } = result;

  if (bgColor === WHITE || bgColor === CALENDER_GREEN || bgColor === YELLOW) {
    cell.setValue(timestamp);
    cell.setBackground(bgColor); // keep same color
    return { message: `Rescheduled ${participantId} at ${timestamp}` };
  }

  return {
    error: `Reschedule not allowed: unexpected bg color '${bgColor}' for ${participantId}`
  };
}


function renameUserId(oldId, newId) {
  const studyName = "GABLE_01";  
  const sheet = SpreadsheetApp.openByUrl(SPREADSHEET_URL).getSheetByName(studyName);
  if (!sheet) return { error: `Sheet not found: ${studyName}` };

  if (!oldId || !newId) return { error: "Both oldId and newId are required." };
  if (oldId === newId) return { message: "IDs are identical, nothing to change." };

  const data = sheet.getDataRange().getValues();

  // ⚡ Skip header row by starting at i = 1
  for (let i = 1; i < data.length; i++) {
    if (data[i][COLUMNS.ID - 1] == oldId) {
      sheet.getRange(i + 1, COLUMNS.ID).setValue(newId);  // +1 because getRange is 1-based

      log.info(`Renamed ID from ${oldId} → ${newId} (row ${i + 1})`);
      return { message: `Renamed ${oldId} → ${newId}` };
    }
  }

  return { error: `User not found: ${oldId}` };
}


function myDebug() {
  // console.log(CALENDER_GREEN);
  renameUserId("P1177ce8c59", "P1117ce8c59");
  // const testId = "P001a3644e8"; // test ID
  // const testTimestamp = "8/28/2025 18:10:00";
  // const result = reactivateUser(testId, testTimestamp);
  // console.log(result);
  // return result;
}

