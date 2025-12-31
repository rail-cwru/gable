
function processAzureStorage() {
  let studies = Object.keys(STUDIES);
  for (let study of studies) {
      console.log("Processing study:", study);
      processSessionStorage(study)
  }
}

/**
 * Reads a file from Azure Blob Storage.
 * @param {string} study - The study identifier from the STUDIES object.
 * @param {string} filename - The filename in the Azure Blob Storage container.
 * @returns {object|null} Parsed JSON response or null in case of an error.
 */

function readAzureFile(study, filename) { 
  try {
    const { sasToken, storageAccountName, storageContainer } = STUDIES[study];
    const cleanSasToken = cleanToken(sasToken);
    const url = constructAzureBlobUrl(storageAccountName, storageContainer, filename, cleanSasToken);
    const response = UrlFetchApp.fetch(url);
    return JSON.parse(response.getContentText());
  } catch (error) {
    log.error(`Error reading file ${filename} from Azure: ${error.message}`);
    return null;
  }
}

/**
 * Constructs the Azure Blob Storage URL.
 * @param {string} account - Azure storage account name.
 * @param {string} container - Azure storage container name.
 * @param {string} filename - Filename in the container.
 * @param {string} token - SAS token for authentication.
 * @returns {string} The constructed URL.
 */

function constructAzureBlobUrl(account, container, filename, token) {
  return `https://${account}.blob.core.windows.net/${container}/${filename}?${token}`;
}


function processSessionStorage(sheetName) {
  let workSheet = SpreadsheetApp.openByUrl(SPREADSHEET_URL).getSheetByName(sheetName);
  let cell = COLUMNS.FIRST_SCHED;

  while (cell <= COLUMNS.FIRST_SCHED + NUM_SESSIONS) {
    
    // If there is no value at the cell, then we don't need to check time differential and no coloring.
    if (!workSheet.getRange(1, cell).getValue()) {
      break;
    }
    const session = (workSheet.getRange(1, cell).getValue()+"").split(" ").slice(0, -1).join("");
    
    // First row is headers.
    let rowNumber = 2;
    let latest_row = workSheet.getLastRow();
    while (rowNumber <= latest_row) {
      console.log(`Checking row ${rowNumber}, session ${session}`);
      if (!workSheet.getRange(rowNumber,COLUMNS.COMPLETED).getValue().trim()) {
        const color = workSheet.getRange(rowNumber, cell).getBackground();
        // if we sent the email for the next session, check whether user completed the session or not, if they finished it, turn it to light blue
         if ( color === CALENDER_GREEN || color === YELLOW || color === ORANGE || color == GREY || color == PURPLE) { 
          var id_in_sheets = workSheet.getRange(rowNumber, COLUMNS.ID).getValue();
          const fileNameAzure = "pID"+ id_in_sheets.substring(3) + "_gable.json";
          const fileData = readAzureFile(sheetName, fileNameAzure);
          let session_completion_time = getSessionCompletionTime(sheetName,fileData,parseInt(session, 10));
          if(session_completion_time !== ""){
            let currentCell = workSheet.getRange(rowNumber,cell);
            currentCell.setBackgroundColor(LIGHT_BLUE);
          }
          log.info("Azure.gs | processSessionStorage() | session_completion_time (" + session_completion_time +") on session " + parseInt(session, 10));
        }
      }
      rowNumber++;
    }
    cell++;
  }
}

// azure .json extension may need modification in the code
function getUsers(studyName="GABLE_01") {
  //log.debug(`Azure.gs | getUsers() | study=${studyName}`)
  const usersObject = {};
  let blobsDict = blobDictionary(studyName)
  let blobList = Object.keys(blobsDict)
  for (const blob of blobList) {
    //log.debug(`Azure.gs | ----------------------`)
    //log.debug(`Azure.gs | blob: ${blob}`)
    const filename = blob
    let [basename, extension] = filename.split('.', 2);
    //log.debug(`Azure.gs | basename: ${basename}`)
    //log.debug(`Azure.gs | extension: ${extension}`)

    // fileType is either "info" or "answer". 
    // We don't use `fileExtension` for now, as we don't have it yet.
    let fileId, fileType, sessionNumber, fileExtension;
    // `basename` always includes `_`. 
    // If this is info, then `fileSetting` is going to be undefined (split returns two items). 
    [fileId, sessionNumber, trialNumber] = basename.split('_', 3);
    // logic for fileExtension = ..... eg (filename.split('.')). 

    //log.debug(`Azure.gs | fileId: ${fileId}`);
    //log.debug(`Azure.gs | fileSetting: ${sessionNumber}`);
    //log.debug(`Azure.gs | trialNumber: ${trialNumber}`);
    fileId = fileId.trim();
    if (fileId != "positions" & !usersObject[fileId]) { // do not include position.json files inside of the users
      usersObject[fileId] = {};
    }
    
    //log.debug(`Azure.gs | blob: ${blob}`)
    if (sessionNumber !== undefined   & trialNumber !== undefined){
      usersObject[fileId][(sessionNumber+"").toUpperCase()] = blobsDict[blob];
    }
  }

  //console.log("Azure.gs | ***");
  //console.log(`Azure.gs | Type of "users": ${typeof(usersObject)}`);
  //console.log(`Azure.gs | Number of users: ${Object.keys(usersObject)}`);
  //console.log(`Azure.gs | users:`);
  //console.log(usersObject);
  return usersObject
}

function cleanToken(sasToken) {
  if (sasToken.charAt(0) == '?' || sasToken.charAt(0) == '&') {
    return sasToken.substring(1);
  }
  return sasToken;
}


function getSessionCompletionTime(study, response, sessionNumber) {

  if (response['sessionCompleted'] == true && response['sessionNumber'] === sessionNumber) {
    lastTrialCompletedTime = response['lastTrialCompletedTime'];
   
    convertedDate = convertDateFormat(lastTrialCompletedTime);
    
    return convertedDate; 
  }
  else {
    return "";
  }
}


function getFirstTrialStartTimeforPartiallyCompletedCheck(study, response, sessionNumber) {
  if (response['sessionCompleted'] == true && response['sessionNumber'] === sessionNumber && response['lastTrialCompletedTime'] !== "") {
    firstTrialStartTime = response['firstTrialStartTime'];
   
    convertedDate = convertDateFormat(firstTrialStartTime);
    shouldConsider = false
    return [shouldConsider, convertedDate]; 
  }
  else if(response['sessionCompleted'] == false && response['sessionNumber'] === sessionNumber && response['lastTrialCompletedTime'] !== "") {
    firstTrialStartTime = response['firstTrialStartTime'];
   
    convertedDate = convertDateFormat(firstTrialStartTime);
    shouldConsider = true
    return [shouldConsider, convertedDate]; 
  }
  else{
    return [false,""];
  }
}

function getSessionStartTime(study, response, sessionNumber) {
  if(response['sessionNumber'] === sessionNumber){
    sessionStartTime = response['sessionStart'];
    
    convertedDate = convertDateFormat(sessionStartTime);
      
    return convertedDate; 
  }
  else{
    return "";
  }

}

// Finalize
function getSessionCompletionTimeRefetch(study, file, sessionNumber) {
  let SAS_Token = cleanToken(STUDIES[study].sasToken);
  let STORAGE_ACCOUNT = STUDIES[study].storageAccountName;
  let STORAGE_CONTAINER = STUDIES[study].storageContainer;
  var url = `https://${STORAGE_ACCOUNT}.blob.core.windows.net/${STORAGE_CONTAINER}/${file}?${SAS_Token}`;
  var response = UrlFetchApp.fetch(url);
  response = JSON.parse(response)

  if (response['sessionCompleted'] == true && response['sessionNumber'] === sessionNumber) {
    lastTrialCompletedTime = response['lastTrialCompletedTime'];
   
    convertedDate = convertDateFormat(lastTrialCompletedTime);
    
    return convertedDate;
  }
  else {
    return "";
  }
}

// In order to get the completion time of the study from the azure
function getLastTrialCompletedTime(study, response, sessionNumber) {

  // we added response['lastTrialCompletedTime'] !== ""
  if (response['sessionCompleted'] == true && response['sessionNumber'] === sessionNumber && response['lastTrialCompletedTime'] !== "") {
    lastTrialCompletedTime = response['lastTrialCompletedTime'];
   
    convertedDate = convertDateFormat(lastTrialCompletedTime);
    
    return [false, convertedDate];
  }
  else if(response['sessionCompleted'] == false && response['sessionNumber'] === sessionNumber && response['lastTrialCompletedTime'] !== "") {
    lastTrialCompletedTime = response['lastTrialCompletedTime'];
   
    convertedDate = convertDateFormat(lastTrialCompletedTime);
    
    return [true, convertedDate];
  }
  else{
    return [false,""];
  }
}

// In order to get the completion time of the study from the azure
function getLastTrialCompletedTimeRefetch(study, file, sessionNumber) {
  let SAS_Token = cleanToken(STUDIES[study].sasToken);
  let STORAGE_ACCOUNT = STUDIES[study].storageAccountName;
  let STORAGE_CONTAINER = STUDIES[study].storageContainer;
  var url = `https://${STORAGE_ACCOUNT}.blob.core.windows.net/${STORAGE_CONTAINER}/${file}?${SAS_Token}`;
  var response = UrlFetchApp.fetch(url);
  response = JSON.parse(response)

  if (response['sessionCompleted'] == true && response['sessionNumber'] === sessionNumber && response['lastTrialCompletedTime'] !== "") {
    lastTrialCompletedTime = response['lastTrialCompletedTime'];
   
    convertedDate = convertDateFormat(lastTrialCompletedTime);
    
    return [false, convertedDate];
  }
  else if(response['sessionCompleted'] == false && response['sessionNumber'] === sessionNumber && response['lastTrialCompletedTime'] !== "") {
    lastTrialCompletedTime = response['lastTrialCompletedTime'];
   
    convertedDate = convertDateFormat(lastTrialCompletedTime);
    
    return [true, convertedDate];
  }
  else{
    return [false,""];
  }
}


// File -> file name
function terminateUser(study, file) {
  log.info(`azure.gs | terminateUser() | study: ${study} | file: ${file}`);

  let SAS_Token = cleanToken(STUDIES[study].sasToken);
  let STORAGE_ACCOUNT = STUDIES[study].storageAccountName;
  let STORAGE_CONTAINER = STUDIES[study].storageContainer;
  let url = `https://${STORAGE_ACCOUNT}.blob.core.windows.net/${STORAGE_CONTAINER}/${file}?${SAS_Token}`;

  // Step 1: Fetch the current JSON file from the server
  var response = UrlFetchApp.fetch(url);
  var jsonData = JSON.parse(response.getContentText());

  // log.info(JSON.stringify(jsonData, null, 2));

  // Step 2: Terminate the user.
  jsonData["accountTerminated"] = true;

  // Step 3: Convert the updated object back to a JSON string
  var updatedJsonString = JSON.stringify(jsonData);

  // Step 4: Upload the modified JSON file back to the server using a PUT request
  var options = {
      method: 'put',
      contentType: 'application/json',
      payload: updatedJsonString,
      headers: {
          'x-ms-blob-type': 'BlockBlob'
      }
  };

  var putResponse = UrlFetchApp.fetch(url, options);

  if (putResponse.getResponseCode() === 201 || putResponse.getResponseCode() === 200) {
      log.info("terminateUser | JSON file updated successfully. User terminated. [terminateUser]");
  } else {
      log.error("terminateUser | Failed to update JSON file. Response code: " + putResponse.getResponseCode());
  }
}

function blobData(study, file) {
  let SAS_Token = cleanToken(STUDIES[study].sasToken);
  let STORAGE_ACCOUNT = STUDIES[study].storageAccountName;
  let STORAGE_CONTAINER = STUDIES[study].storageContainer;
  var url = `https://${STORAGE_ACCOUNT}.blob.core.windows.net/${STORAGE_CONTAINER}/${file}?${SAS_Token}`;
  var response = UrlFetchApp.fetch(url);
  response = JSON.parse(response)
  if (response['sessionCompleted'] == true) {
    return [response['sessionNumber'], response['sessionStart']];
  }
  else {
    return null;
  }
}


function updateStartDateUser(study, file, newStartTime) {
    let SAS_Token = cleanToken(STUDIES[study].sasToken);
    let STORAGE_ACCOUNT = STUDIES[study].storageAccountName;
    let STORAGE_CONTAINER = STUDIES[study].storageContainer;
    let url = `https://${STORAGE_ACCOUNT}.blob.core.windows.net/${STORAGE_CONTAINER}/${file}?${SAS_Token}`;

    // Step 1: Fetch the current JSON file from the server
    var response = UrlFetchApp.fetch(url);
    var jsonData = JSON.parse(response.getContentText());

    // Step 2: Update the sessionStart field
    jsonData["sessionStart"] = newStartTime;
    jsonData["lastTrialCompletedTime"] = "";

    // Step 3: Convert the updated object back to a JSON string
    var updatedJsonString = JSON.stringify(jsonData);

    // Step 4: Upload the modified JSON file back to the server using a PUT request
    var options = {
        method: 'put',
        contentType: 'application/json',
        payload: updatedJsonString,
        headers: {
            'x-ms-blob-type': 'BlockBlob'
        }
    };

    var putResponse = UrlFetchApp.fetch(url, options);

    if (putResponse.getResponseCode() === 201 || putResponse.getResponseCode() === 200) {
        log.info("updateStartDateUser "+file +" | JSON file updated successfully.");
    } else {
        log.error("updateStartDateUser "+file +" | Failed to update JSON file. Response code: " + putResponse.getResponseCode());
    }
}

 
function registerUserToDatabase(userID, groupID, sessionStartTime, study){
  let SAS_Token = cleanToken(STUDIES[study].sasToken)
  let STORAGE_ACCOUNT = STUDIES[study].storageAccountName
  let STORAGE_CONTAINER = STUDIES[study].storageContainer 
  var url = `https://${STORAGE_ACCOUNT}.blob.core.windows.net/${STORAGE_CONTAINER}?restype=container&comp=list&${SAS_Token}`;

  // User data to be saved as a JSON object (you can modify this structure)
  var userData = {
    "userId": userID,
    "group": groupID,
    "sessionNumber": 0,
    "trialNumber": 0,
    "firstTrialStartTime": "",
    "sessionCompleted": true,
    "trialCompleted" : true,
    "accountTerminated": false,
    "lastTrialCompletedTime": "",
    "lastSessionCompletedTime": "",
    "sessionActivationTime": sessionStartTime,
    "latestSubmissionTime": "",
    "loginData": [],
    "trialStartTimesData": {},
    "trialCompletedTimesData": {},
    "sessionStartTimes": {},
    "sessionCompletedTimes": {}
  }

  // Convert the user data to a JSON string
  var payload = JSON.stringify(userData);
  
  var blob_name_registered_user = "pID"+userID+"_gable";
  // URL for creating a new blob (where `userID` is the blob name, could be modified)
  var url = `https://${STORAGE_ACCOUNT}.blob.core.windows.net/${STORAGE_CONTAINER}/${blob_name_registered_user}.json?${SAS_Token}`;
  
 // Set up HTTP PUT request options with the required headers
  var options = {
    "method": "put", // Use PUT to create or overwrite a blob
    "contentType": "application/json", // Define the content type as JSON
    "payload": payload, // The user data as payload
    "headers": {
      "x-ms-blob-type": "BlockBlob" // Required header for Azure Blob Storage
    },
    "muteHttpExceptions": true // To capture any potential error responses
  };

  // Send the HTTP request
  try {
    var response = UrlFetchApp.fetch(url, options);
    var responseCode = response.getResponseCode();
    
    if (responseCode === 201) { // Status code 201 indicates success (Created)
      console.log("User registered successfully." + userID);
    } else {
      console.log("Error registering user. Response: "+ userID +" " + response.getContentText());
    }
  } catch (error) {
    console.log("Failed to register user. Error: " + userID + " " + error.message);
  }
}

function blobDictionary(study) {
  let SAS_Token = cleanToken(STUDIES[study].sasToken)
  let STORAGE_ACCOUNT = STUDIES[study].storageAccountName
  let STORAGE_CONTAINER = STUDIES[study].storageContainer 
  var url = `https://${STORAGE_ACCOUNT}.blob.core.windows.net/${STORAGE_CONTAINER}?restype=container&comp=list&${SAS_Token}`;
  var response = UrlFetchApp.fetch(url);
  var xml = response.getContentText();
  
  var doc = XmlService.parse(xml);
  var root = doc.getRootElement();
  var blobsElement = root.getChild("Blobs");
  var blobs = blobsElement.getChildren("Blob");
  var blobDict = {};
  for (var i = 0; i < blobs.length; i++) {
    var nameElement = blobs[i].getChild("Name");
    var creationTimeElement = blobs[i].getChild("Properties").getChild("Creation-Time");
    var name = nameElement.getText();
    var creationTime = new Date(creationTimeElement.getText());
    
    blobDict[name] = creationTime;
  }
  return blobDict;
}

function convertDateFormat(isoDate) {
  // Check if the date string contains "T:"
  if (isoDate.includes("T:")) {
    // Replace "T:" with "T" to create a valid ISO date format
    isoDate = isoDate.replace("T:", "T");
  }
  
  // Create a Date object from the formatted ISO date string
  var dateObj = new Date(isoDate);
  return dateObj;
}

// Example of calling the function with input
function testConvertDateFormat() {
  var inputDate = "2024-10-21T:13:00:45.346Z";
  convertDateFormat(inputDate);
}


