SPREADSHEET_URL = SpreadsheetApp.getActiveSpreadsheet().getUrl();

const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
/* Add new studies here. The name should be the same as the sheet name. The first 5 columns should be coming from the form and the 6th and 7th columns shoud be similar to the existign studies. The next column names should be in the format "X session" where X is the name of the session that is present in the storage blobs. For example ID_X.json could be a file name. If your files are stored as X.json for a single session, please name the column "Session"
*/

COLUMNS = {
  EMAIL: parse("B"),  // 2
  FIRST_NAME: parse("C"),  // 3
  LAST_NAME: parse("D"), // 4
  INST_EMAIL_ID: parse("E"), // 5
  DAYS_AHEAD: parse("F"), //6
  CURR_TIME: parse("G"), // 8
  CURR_DATE: parse("H"),//7
  SCHED_TIME: parse("I"), // 9
  TIME_DIFF: parse("J"),  // 10
  ID: parse("K"), // 11
  COMPLETED: parse("L"),  // 12
  FIRST_SCHED: parse("M") // 13
}

function setDocURL(docURL) {
  var ss = SpreadsheetApp.openByUrl(SPREADSHEET_URL).getSheetByName("Config")
  if (!ss) {
    ss = SpreadsheetApp.openByUrl(SPREADSHEET_URL).insertSheet("Config")
    ss.getRange(1, 1).setValue("DO NOT EDIT")
    ss.getRange(1, 2).setValue("Editable")
    ss.getRange(1, 3).setValue("Published")
  }
  ss.getRange(2, 1).setValue("MAINDOC")
  ss.getRange(2, 2).setValue(docURL)
}
function getDocURL() {
  var ss = SpreadsheetApp.openByUrl(SPREADSHEET_URL).getSheetByName("Config")
  return ss.getRange(2, 2).getValue()
}
function setFormURL(sheetName, editFormURL, publishFormURL) {
  var ss = SpreadsheetApp.openByUrl(SPREADSHEET_URL).getSheetByName("Config")
  var Avals = ss.getRange("A1:A").getValues();
  var Alast = Avals.filter(String).length;
  for (let index = 3; index <= Alast; index++) {
    if (ss.getRange(index, 1).getValue().toUpperCase() == sheetName.toUpperCase()) {
      ss.getRange(index, 2).setValue(editFormURL)
      ss.getRange(index, 3).setValue(publishFormURL)
      return;
    }
  }
  ss.getRange(Alast + 1, 1).setValue(sheetName);
  ss.getRange(Alast + 1, 2).setValue(editFormURL)
  ss.getRange(Alast + 1, 3).setValue(publishFormURL)
  return;
}

function updateConfigTime(timeValue) {
  // If timeValue is specified, use it; otherwise, default to "NOW"
  timeValue = timeValue || "NOW";
  
  var ss = SpreadsheetApp.openByUrl(SPREADSHEET_URL).getSheetByName("Config");
  var Avals = ss.getRange("A1:A").getValues();
  var Alast = Avals.filter(String).length;

  // Look for "TIME" in column A and update its value
  for (let index = 3; index <= Alast; index++) {  // Assuming data starts from row 3
    if (ss.getRange(index, 1).getValue().toUpperCase() === "TIME") {
      ss.getRange(index, 3).setValue(timeValue);  // Store time in column C
      //log.debug("Updated TIME value:", timeValue);
      // Return value is optional (primarily for Python call)
      return getCurrentDate();
    }
  }

  // If "TIME" not found, add a new row at the end
  ss.getRange(Alast + 1, 1).setValue("TIME");
  ss.getRange(Alast + 1, 3).setValue(timeValue);

  // Log only if timeValue is not "NOW"
  if (timeValue !== "NOW") {
    log.info(`⌛⏳ Simulated time: ${timeValue}`);
  }

  // Return value is optional (primarily for Python call)
  return getCurrentDate();
}

function formURL(sheetName) {
  var ss = SpreadsheetApp.openByUrl(SPREADSHEET_URL).getSheetByName("Config")
  var Avals = ss.getRange("A1:A").getValues();
  var Alast = Avals.filter(String).length;
  for (let index = 3; index <= Alast; index++) {
    if (ss.getRange(index, 1).getValue().toUpperCase() == sheetName.toUpperCase()) {
      return ss.getRange(index, 2).getValue()
    }
  }
  return ""
}

// Convert the column letter to the column number where 'A' = 1, 'B' = 2,...
// We remove 64 because the ASCII codes for uppercase letters are 65-90
function parse(letter) {
  if (letter.length > 1) {
    throw new Error("Input must be a single letter.");
  }
  return (letter.toUpperCase().charCodeAt(0)) - 64
}

function sendResponses() {
  for (let study of Object.keys(STUDIES)) {
    if (sheetHasNewResponse(study) && STUDIES[study].collecting) {
      sendResponse(study);
    }
  }
}


function isValidTimeRange(studyName, time) {
  // Convert time into hours and minutes
  var hours = time.getHours();
  var minutes = time.getMinutes();
  var timeWindow = STUDIES[studyName].experimentValidTimeRange;
  return (hours >= timeWindow[0] && hours <= timeWindow[1]);
}


function clearResponseForParticipant(email, form) {
  const responses = form.getResponses();

  responses.forEach(response => {
    const itemResponses = response.getItemResponses();
    itemResponses.forEach(itemResponse => {
      if (itemResponse.getResponse() === email) {
        form.deleteResponse(response.getId()); // Delete response
        log.critical(`Deleted response for email: ${email}`);
      }
    });
  });
  log.critical("No response found for email: " + email);
}


function closestBoundary(studyName,sched_time) {

  const schedDateTime = new Date(sched_time); // Convert to Date object
  const schedMinutes = schedDateTime.getHours() * 60 + schedDateTime.getMinutes(); // Convert to total minutes

  var timeWindow = STUDIES[studyName].experimentValidTimeRange;
  // Define boundaries in total minutes
  const boundaryStart = timeWindow[0] * 60; // 8:00 AM = 480 minutes
  const boundaryEnd = timeWindow[1] * 60; // 10:00 PM = 1320 minutes

  // Calculate the absolute differences
  const diffToStart = Math.abs(schedMinutes - boundaryStart);
  const diffToEnd = Math.abs(schedMinutes - boundaryEnd);

  // Determine which is closer and return it
  if (diffToStart <= diffToEnd) {
    return formatHourToTimeString(timeWindow[0]);
  } else {
    return formatHourToTimeString(timeWindow[1]);
  }
}

function formatHourToTimeString(hourInt) {
  const date = new Date();
  date.setHours(hourInt, 0, 0, 0); // hour, min, sec, ms

  return Utilities.formatDate(date, "America/New_York", "h:mm:ss a");
}


function sendResponse(sheetName) {
  let ss = SpreadsheetApp.openByUrl(SPREADSHEET_URL).getSheetByName(sheetName);
  var aValues = ss.getRange("A1:A").getValues();
  var lastRow = aValues.filter(String).length;
  var lastEmail = ss.getRange(lastRow, COLUMNS.INST_EMAIL_ID).getValue();
  let sched_time = ss.getRange(lastRow, COLUMNS.SCHED_TIME).getValue();

  // Added functionality to check case.edu. 
  // For other institutions, we need to change here. -- changed for case.edu- will open this later
  var patternInst = /case\.edu/;
  if (!(patternInst.test(lastEmail))) {
    log.warning(`⚠️ Invalid email: ${lastEmail}`);

    // Send rejection email
    const text = getDocText(sheetName, `${"failemail"}$`, "", "", "", "", "", "");
    GmailApp.sendEmail(lastEmail, text.subject, text.body);
    ss.deleteRow(lastRow);
    clearResponseForParticipant(lastEmail, FormApp.openByUrl(ss.getFormUrl()));
    SpreadsheetApp.flush();
    return; // Return early
  }

  // Validate time range
  if (!isValidTimeRange(sheetName, sched_time)) {
    log.warning(`⚠️ Invalid sched_time: ${sched_time}`);

    // Send rejection email
    const text = getDocText(sheetName, `${"failtime"}$`, "", "", "", "", "", "");
    GmailApp.sendEmail(lastEmail, text.subject, text.body);

    // Delete invalid row and response and will put the closest valid time
    const closest = closestBoundary(sheetName, sched_time); // Determine the closest boundary
    ss.getRange(lastRow, COLUMNS.SCHED_TIME).setValue(closest);
  }

  var emailColumn = ss.getRange(2, COLUMNS.INST_EMAIL_ID, lastRow - 1).getValues();
  var emailTracker = {};
  var rowsToDelete = [];
  for (var i = emailColumn.length - 1; i >= 0; i--) {
    var email = emailColumn[i][0];
    if (email) {
      if (emailTracker[email]) {
        rowsToDelete.push(i + 2);
      } else {
        emailTracker[email] = true;
      }
    }
  }

  for (var j = 0; j < rowsToDelete.length; j++) {
    log.debug(Utilities.formatString("Deleting row: %d", rowsToDelete[j]))
    var row = rowsToDelete[j];
    ss.deleteRow(row);
  }

  if (rowsToDelete.length > 0) {
    return
  }

  aValues = ss.getRange("A1:A").getValues();
  lastRow = aValues.filter(String).length;

  // This for loop is just for adding the ID.
  for (let indexRow = 2; indexRow <= lastRow; indexRow++) {
    if ((ss.getRange(indexRow, COLUMNS.ID).getValue() + "").length > 0) {
      continue;
    }

    // Values needed for generating ID.
    var participantEmail = ss.getRange(indexRow, COLUMNS.EMAIL).getValue();
    var participantFirstName = ss.getRange(indexRow, COLUMNS.FIRST_NAME).getValue();
    var participantLastName = ss.getRange(indexRow, COLUMNS.LAST_NAME).getValue();
    
    var participantCurrDate = ss.getRange(indexRow, COLUMNS.CURR_DATE).getValue();
    var participantDaysAhead = ss.getRange(indexRow, COLUMNS.DAYS_AHEAD).getValue()

    // we will send the first session email 1 day before the first scheduled time
    var firstSessionDate = formatDate(subtractDaysFromDate(addDaysToDate(new Date(participantCurrDate), participantDaysAhead),1)); 

    var ID = getUniqueIdWithGroup(participantFirstName, participantLastName, participantEmail);
    
    ss.getRange(indexRow, COLUMNS.ID).setValue(ID);

    let text = getDocText(experiment = sheetName, textDelimiter = ID.slice(0, 3), "","","", session_start_time = firstSessionDate,"",ID.slice(3) )  // Extracts "G00" from "G00123456"

    let daysAhead = ss.getRange(indexRow, COLUMNS.DAYS_AHEAD).getValue()
    let schedTime = ss.getRange(indexRow, COLUMNS.SCHED_TIME).getValue()
    let time = ss.getRange(indexRow, COLUMNS.CURR_TIME).getValue()
    let date = ss.getRange(indexRow, COLUMNS.CURR_DATE).getValue()

    let startTime = invite(sheetName, new SpreadsheetTile(ss, indexRow, null), daysAhead, schedTime, new InviteInfo(email = participantEmail, summary = text.subject, description = text.body), new DateTime(date, time))
    ss.getRange(indexRow, COLUMNS.FIRST_SCHED).setValue(startTime)
    registerNewUser(ID,startTime,sheetName); 
    updateSignUps(sheetName)
  }
}


function registerNewUser(userID,startTime,studyName){
  const group = userID.substring(0,3);
  const participantID = userID.substring(3);
  registerUserToDatabase(participantID,group,startTime,studyName);  
}


function sendAllStudyEmails() {
  let studies = Object.keys(STUDIES);
  for (let study of studies) {
    sendSessionEmails(study)
  }
}


function getNumSessions(sheetName) {
  let numSessions = STUDIES[sheetName]['groups']['numSessions']
  if (Array.isArray(numSessions)) {
    return Math.max(...numSessions)
  }
  return numSessions;
}


function daysApart(studyName, session) {
  // This is common use if daysApart variable globally set. 
  if (STUDIES[studyName][`daysApart`]) {
    days = STUDIES[studyName][`daysApart`]
    // If study is complete
    if (session == NUM_SESSIONS) {
      days = 0
    }
    else if (Array.isArray(days)) {
      days = days[session - 1]
    }
    return days
  }
  else {
    // To have more capability of, we can have a different daysBeforeNext attached to each session.
    // Though, currently we are using a constant daysBeforeNext (each session have the same daysBeforeNext for this study.)
    let currSession = 1;
    let studyData = STUDIES[studyName][`studyData`]
    for (let session of studyData) {
      if (currSession == session.sessionName) {
        return session.daysBeforeNext;
      } 
      currSession++;
    }
    return 0
  }
}

function ignoredColumns(studyData) {
  // This function does not do anything as we dont have "major" session capability.
  let cols = []
  if (!studyData) {
    return cols
  }
  let currentColumn = COLUMNS.FIRST_SCHED
  for (let session of studyData) {
    currentColumn++;
  }
  return cols
}

// Which group does a user belong to based on ID

function getGroupIndex(ID) {
  var groupID = ID.slice(0, 3);  // E.g., "P00"
  groupIndex = indexGroupMapping[groupID];  // E.g., 0
  return groupIndex;
}


function getGroupSessions(studyName, ID) {
  let groupNumber = getGroupIndex(ID)
  return getGroupSessionsWGroupNum(studyName, groupNumber)
}

// How many sessions does a user have

function getGroupSessionsWGroupNum(studyName, groupNum) {
  let numSessions = STUDIES[studyName]['groups']['numSessions']
  if (!Array.isArray(numSessions)) {
    return numSessions
  }
  return numSessions[groupNum]
}


function calculateGiftCardAmount(studyName, sessionNumberCompleted) {
  let giftCardAmountPerSession =  STUDIES[studyName]['groups']['giftCardAmountPerSession'];
  let giftCardAmountAfterCompletion = STUDIES[studyName]['groups']['giftCardAmountAfterCompletion'];
  if(sessionNumberCompleted == NUM_SESSIONS){
    return sessionNumberCompleted * giftCardAmountPerSession + giftCardAmountAfterCompletion;
  }
  else if(sessionNumberCompleted < NUM_SESSIONS){
    return sessionNumberCompleted * giftCardAmountPerSession;
  }
}

// HANDLERS

function handleSendFirstSessionEmails(studyName, ss, row, column, ignoredCols, daysRem, session, userTotalSessions, nextText, fileNameAzure, participantEmail, userId) {
  log.debug(`Code.gs | handleSendFirstSessionEmails | session: ${session} | participantEmail: ${participantEmail} | userId: ${userId}`);

  ss.getRange(row, column).setBackgroundColor(CALENDER_GREEN);

  let currSchedTime = ss.getRange(row, columnNumber(session, ignoredCols)).getValue();
  let newSchedTime = ss.getRange(row, COLUMNS.SCHED_TIME).getValue();
  var due_date_session = calculate_next_invite_time(new SpreadsheetTile(ss, row, null), daysRem, newSchedTime, getCurrentDate(), null); 

  // get the appropriate text for this
  let text = getDocText(studyName, `${"ff"}$`, session , userTotalSessions, "", currSchedTime.toString(), due_date_session.toString(), userId.slice(3) ); //Email for first session and pre_study survey
  // session should increment by 1 but it starts at 0.
  let body = text.body;
  const subject = text.subject;
  let studyLink = `${STUDIES[studyName]['preexperiment']}?UserID=${userId}`;
  let additionalText = `\n\n` +
    `Your ID is ${userId.substring(3)}. Link to informed consent and pre-study survey: ${studyLink}.\n` +
    `Please keep your ID safe for future reference. After you finish the preexperiment survey, you will be automatically directed to the experiment website. On the following experiment website, you'll be prompted to enter your ID to login.`;
  body += additionalText + nextText ;// add the link and participant id in this email, no need to resend the invitation again! we already did this after signup form is filled
  GmailApp.sendEmail(
      participantEmail,
      subject,
      body
  );
}

function handleSendNextSessionEmails(studyName, ss, row, column, ignoredCols, days, session, userTotalSessions, nextText, participantEmail, userId) {

  log.debug(`Code.gs | handleSendNextSessionEmails | session: ${session} | participantEmail: ${participantEmail} | userId: ${userId}`);

  let daysRem = daysLeft(ss, row, column, days)

  let currSchedTime = ss.getRange(row, columnNumber(session+1, ignoredCols)).getValue()

  var due_date_session = calculate_next_invite_time(new SpreadsheetTile(ss, row, null), days, currSchedTime, currSchedTime, null)
  let text = getDocText(studyName, `${"nany"}$`, session + 1, userTotalSessions,"","",due_date_session.toString(), userId.slice(3));

  let body = text.body +nextText;
  const subject = text.subject
  if (session + 1 <= userTotalSessions) {
    // Green to indicate that a calendar invite or an email moving the user on to the next session
    if ( ss.getRange(row, columnNumber(session+1, ignoredCols)).getBackgroundColor() == WHITE){
        ss.getRange(row, columnNumber(session+1, ignoredCols)).setBackgroundColor(CALENDER_GREEN)
        ss.getRange(row, columnNumber(session + 1, ignoredCols)).setValue(invite(studyName, new SpreadsheetTile(ss, row, null), daysRem, currSchedTime, new InviteInfo(email = participantEmail, summary = subject, description = body)))
    }
  }
}


function handleSendPartiallyCompletedSessionEmails(studyName, ss, row, column, fileNameAzure, fileData, session, totalSessions, nextText, participantEmail, userId) {

  log.debug(`Code.gs | 🟧 handleSendPartiallyCompletedSessionEmails | session: ${session} | participantEmail: ${participantEmail} | userId: ${userId}`);

  updatePartiallyCompletedSessions(studyName);

  ss.getRange(row, column).setBackgroundColor(ORANGE); 

  let numberOfDaysToInvalidateIncompleteSession = STUDIES[studyName].numberOfDaysToInvalidateIncompleteSession;
  let numberOfHoursToInvalidateIncompleteSession = STUDIES[studyName].numberOfHoursToInvalidateIncompleteSession;

  let [isPartiallyCompleted, firstTrialStartTime] = getFirstTrialStartTimeforPartiallyCompletedCheck(studyName, fileData, session);
  let due_date_session = addHoursToDate(addDaysToDate(firstTrialStartTime,numberOfDaysToInvalidateIncompleteSession),numberOfHoursToInvalidateIncompleteSession);

  let text = getDocText(studyName, `${"pc"}$`, session, totalSessions, "","", due_date_session.toString(), userId.slice(3)); //Email for reminder

  let body = text.body
  const subject = text.subject
  body = body + nextText
  GmailApp.sendEmail(
      participantEmail,
      subject,
      body
  ) 
}


function handleSendReminderEmails(studyName, ss, row, column, session, userTotalSessions, nextText, participantEmail, userId) {
  
  log.debug(`Code.gs | 🟨 handleSendReminderEmails | session: ${session} | participantEmail: ${participantEmail} | userId: ${userId}`);

  // IF IT IS GREEN, so  it indicates that a calendar invite or an email moving the user on to the next session
  updateRemainderEmailSent(studyName)

  ss.getRange(row, column).setBackgroundColor(YELLOW) //yellow to indicate the late sessions

  let text = getDocText(studyName, `${"xany"}$`, session, userTotalSessions, "", "","", userId.slice(3)); //Email for reminder
  // session should increment by 1 but it starts at 0.
  let body = text.body
  const subject = text.subject
  body = body + nextText
  GmailApp.sendEmail(
    participantEmail,
    subject,
    body
  ) 
}


function handleSendCompletionSessionEmails(studyName, ss, row, column, ignoredCols, days, fileNameAzure, fileData, session, userTotalSessions, nextText, participantEmail, userId) {
  log.debug(`Code.gs | handleSendCompletionSessionEmails | session: ${session} | participantEmail: ${participantEmail} | userId: ${userId}`);

  let sessionCompletionTime = getSessionCompletionTime(study=studyName, fileData,session) // You need to change this function according to how you stored the completion time of session
  //update the completed date in the cell
  ss.getRange(row, column).setBackgroundColor(DARK_BLUE)
  ss.getRange(row, column).setValue(sessionCompletionTime)

  var halfSessionNumber = STUDIES[studyName].halfSessionNumber
  if(session == halfSessionNumber){
    updateFirstHalfSessionsCompleted(studyName)
  }
  // If user has completed the study (all sessions)
  if (session + 1 > userTotalSessions) {
    var session_completion_type = (session + 1 > userTotalSessions ? "final" : "any");
    let text = getDocText(studyName, `${session_completion_type}$`, session , userTotalSessions, "", "","",userId.slice(3));

    let body = text.body
    const subject = text.subject

    let giftCardAmountTotal = calculateGiftCardAmount(studyName, session);
    nextText = " Your gift card code(s): " + nextGiftCard(studyName, giftCardAmountTotal, userId.slice(3), sessionCompletionTime)
    body = body + nextText
    GmailApp.sendEmail(
      participantEmail,
      subject,
      body
    )
    ss.getRange(row, COLUMNS.COMPLETED).setValue("Yes")
    updateSessionCompletions(studyName)
    updateStudyCompletions(studyName)
  }
  else {
    ss.getRange(row, columnNumber(session + 1, ignoredCols))
      .setValue(calculate_next_invite_time(new SpreadsheetTile(ss, row, null), days, sessionCompletionTime, sessionCompletionTime, null))
    
    // nextSessionTime variable indicastes the time that we want to send the calendar invite date
    let nextSessionTime = ss.getRange(row, columnNumber(session + 1, ignoredCols)).getValue()
    
    // nextSessionActivationTime variable indicates that the time that user can enter the experiemnt first time (it is the inital date of the experiemnt)
    // FE: in this study we have 3 days apart between sessions. When the past session ends, 1 day later the next session will be available to the participant.
    // but we send the next session calendar invite to the second day.
    let nextSessionActivationTime = subtractDaysFromDate(nextSessionTime,1)
  
    var due_date_session = calculate_next_invite_time(new SpreadsheetTile(ss, row, null), days, nextSessionActivationTime, nextSessionTime, null)

    var session_completion_type = (session + 1 > userTotalSessions ? "final" : "any");

    let text = getDocText(studyName, `${session_completion_type}$`, session , userTotalSessions, "", nextSessionActivationTime.toString(),due_date_session.toString(),userId.slice(3));

    // session should increment by 1 but it starts at 0.
    let body = text.body
    const subject = text.subject

    updateStartDateUser(study = studyName, file = fileNameAzure, newStartTime = nextSessionActivationTime); 

    body = body + nextText
    GmailApp.sendEmail(
      participantEmail,
      subject,
      body
    )
    updateSessionCompletions(studyName)
  }
}


function handleGiveGracePeriod(studyName, ss, row, column, ignoredCols, session, userTotalSessions, nextText, participantEmail, userId) {
  log.debug(`Code.gs | handleGiveGracePeriod | session: ${session} | participantEmail: ${participantEmail} | userId: ${userId}`);

  updateGracePeriodGiven(studyName);
  let currSchedTime = ss.getRange(row, columnNumber(session, ignoredCols)).getValue();
  let graceSchedTime = addDaysToDate(currSchedTime, STUDIES[studyName]["lateSessionGraceDays"].graceDaysNumber);

  ss.getRange(row, column).setBackgroundColor(GREY);
  ss.getRange(row, columnNumber(session, ignoredCols)).setValue(graceSchedTime);

  const text = getDocText(studyName, `${"gp"}$`, session, userTotalSessions,"", "", "", userId);
  const body = text.body + nextText;
  const subject = text.subject;
  GmailApp.sendEmail(participantEmail, subject, body);
}


function handleSendReminderEmailsInGracePeriod(studyName, ss, row, column, session, userTotalSessions, nextText, participantEmail, userId) {
  log.debug(`Code.gs | 🟪 handleSendReminderEmailsInGracePeriod | session: ${session} | participantEmail: ${participantEmail} | userId: ${userId}`);

  updateGracePeriodRemainder(studyName);

  ss.getRange(row, column).setBackgroundColor(PURPLE) // Purple to indicater the reminder for the grace period

  const text = getDocText(studyName, `${"remgp"}$`, session, userTotalSessions, "", "","", userId);
  const body = text.body + nextText;
  const subject = text.subject;
  GmailApp.sendEmail(participantEmail, subject, body);
}


function handleDatePassed(studyName, ss, row, column, days, session, userTotalSessions, fileNameAzure, fileData, participantEmail, userId) {
  log.debug(`Code.gs | handleDatePassed | session: ${session} | participantEmail: ${participantEmail} | userId: ${userId}`);

  let text = ""
  if (shouldInvalidateSession(studyName, fileData, fileNameAzure, ss, row, column, session,days)){
    // Red to indicate invalidity
    ss.getRange(row, column).setBackgroundColor(RED);
    ss.getRange(row, COLUMNS.COMPLETED).setValue("Invalid");
    text = getDocText(studyName, `xx`, session, userTotalSessions,"", "", "", userId.slice(3) );
    updateInvalid(studyName);
    terminateUser(studyName, fileNameAzure);
  }
  if (text) {
    body = text.body
    let giftCardAmountTotal = calculateGiftCardAmount(studyName, session-1);
    let sessionCompletionTime = getSessionCompletionTimeRefetch(study=studyName, fileNameAzure,session) // You need to change this function according to how you stored the completion time of session
    nextText = " Your gift card code(s): " + nextGiftCard(studyName, giftCardAmountTotal, userId.slice(3), sessionCompletionTime)
    body = body + nextText
    subject = text.subject
    GmailApp.sendEmail(
      participantEmail,
      subject,
      body
    ) 
  }
}

function sendSessionEmails(studyName) {
  let ss = SpreadsheetApp.openByUrl(SPREADSHEET_URL).getSheetByName(studyName)
  let colAValues = ss.getRange("A1:A").getValues();
  let lastRow = colAValues.filter(String).length;
  let ignoredCols = ignoredColumns(STUDIES[studyName]['studyData'])
  let totalSessions = getNumSessions(studyName)
  
  for (let session = 1; session <= totalSessions; session++) {
    column = columnNumber(session, ignoredCols)
    let days = daysApart(studyName, session, totalSessions) // days before next is used
    for (let row = 2; row <= lastRow; row++) {
      if (ss.getRange(row, COLUMNS.COMPLETED).getValue().trim() != "") {
        continue;
      }
      let participantEmail = ss.getRange(row, COLUMNS.EMAIL).getValue()
      let ID = ss.getRange(row, COLUMNS.ID).getValue() + ""
      let fileNameAzure = "pID"+ID.substring(3)+"_gable.json"; 
      const fileData = readAzureFile(studyName, fileNameAzure);

      let nextText = " Your link is  " + STUDIES[studyName]['website'] + ". If you have any concerns or questions related to the experiment please feel free to reach out to us.";
      let userTotalSessions = getGroupSessions(studyName, ID)

      let daysRem = daysLeft(ss, row, column, days)

      //let currSchedTime = ss.getRange(row, columnNumber(session, ignoredCols)).getValue()
      //var due_date_session = calculate_next_invite_time(new SpreadsheetTile(ss, row, null), daysRem, currSchedTime, getCurrentDate(), null)

      // log.info("session ----------------------------- ");
      // log.info("Session: " +session);
      // log.info("Days Remaining " + daysRem);
      // log.info("should send first email is " + shouldSendFirstSessionEmails(ss, row, column, diffDate(new Date(), dateObject(ss, row, column)),session ) + " for session " +session);
      // log.info("should send remainder email is " + shouldSendReminderEmails(ss, row, column, daysRem,session, totalSessions) + " for session " +session);
      // log.info("should send completion email is " + shouldSendCompletionSessionEmails(studyName, ss, row, column,days, fileData, fileNameAzure, session) + " for session " +session );
      // log.info("should send next email is " + shouldSendNextSessionEmails(ss, row, column,daysRem) + " for session " +session );
      // log.info("should invalidate " + shouldInvalidateSession(studyName, fileData, fileNameAzure, ss, row, column, session, days) + " for session " +session );
      // log.info("should Send Partially Completed Session Emails " + shouldSendPartiallyCompletedSessionEmails(studyName, fileData, ss, row, column, daysRem,session,totalSessions)+ + " for session " +session);
      // log.info("should  Give Grace Period" + shouldGiveGracePeriod(studyName, fileData, fileNameAzure, ss, row, column, session,days) + " for session " +session);
      // log.info("should  Give Grace Period Reminder " + shouldSendReminderEmailsInGracePeriod(ss, row, column, daysRem,session,userTotalSessions)+ " for session " +session );
      // log.info("has date passed " + hasDatePassed(studyName, fileData, fileNameAzure, ss, row, column, session)  + " for session " +session)
      // log.info("session ----------------------------- ");

      // should we sent first session email or not
      // if we have first session within 24 hours, send first session an pre-study emails
      if(shouldSendFirstSessionEmails(ss, row, column, diffDate( dateObject(ss, row, column),getCurrentDate()), session) && (daysRem >= 0)){
        handleSendFirstSessionEmails(studyName, ss, row, column, ignoredCols, daysRem, session, userTotalSessions, nextText, fileNameAzure, participantEmail, ID);
      }
      else if(shouldSendPartiallyCompletedSessionEmails(studyName, fileData, ss, row, column, daysRem,session,totalSessions)){
        handleSendPartiallyCompletedSessionEmails(studyName, ss, row, column, fileNameAzure, fileData, session, totalSessions, nextText, participantEmail, ID)    
      }
      // should we sent reminder email or not
      else if (shouldSendReminderEmails(ss, row, column, daysRem,session, totalSessions)) { 
        handleSendReminderEmails(studyName, ss, row, column, session, userTotalSessions, nextText, participantEmail, ID);
      }
      // should we sent session completion email or not
      else if (shouldSendCompletionSessionEmails(studyName, ss, row, column,days,fileData, fileNameAzure, session)){
        handleSendCompletionSessionEmails(studyName, ss, row, column, ignoredCols, days, fileNameAzure, fileData, session, userTotalSessions, nextText, participantEmail, ID);
      }
      // should we sent session completion email or not
      else if(shouldSendNextSessionEmails(ss, row, column,daysRem)){
        handleSendNextSessionEmails(studyName, ss, row, column, ignoredCols, days, session, userTotalSessions, nextText, participantEmail, ID);
      }
      else if(shouldGiveGracePeriod(studyName, fileData, fileNameAzure, ss, row, column, session,days)){
        handleGiveGracePeriod(studyName, ss, row, column, ignoredCols, session, userTotalSessions, nextText, participantEmail, ID);
      }
      else if(shouldSendReminderEmailsInGracePeriod(ss, row, column, daysRem,session,userTotalSessions)){
        handleSendReminderEmailsInGracePeriod(studyName, ss, row, column, session, userTotalSessions, nextText, participantEmail, ID);
      }
      // This will be triggered as long as they haven't completed, which makes sense. 
      else if(hasDatePassed(studyName, fileData, fileNameAzure, ss, row, column, session)){
        handleDatePassed(studyName, ss, row, column, days, session, userTotalSessions, fileNameAzure, fileData, participantEmail, ID);
      }
    }
  }
}


function daysLeft(ss, row, column, totalDays) {
  last = dateObject(ss, row, column)
  diff = diffDate(getCurrentDate(), last)
  return totalDays - diff;
}


function dateObject(ss, row, column) {
  return Date.parse(ss.getRange(row, column).getValue())
}


function shouldSendCompletionSessionEmails( studyName, ss, row, column, days, fileData, fileNameAzure, session) {
    let sessionCompletionTime = getSessionCompletionTime(study=studyName, fileData,session) 
    // If it is light blue it means they have done the work in alloted time
    let current = ss.getRange(row, column)
    // light Blue indicates that the user has completed this session. The color will set through the python script used in tandem
    return current.getBackgroundColor() == LIGHT_BLUE && current.getValue() != "" && sessionCompletionTime !== "";
}

function shouldSendNextSessionEmails(ss, row, column, days) {
  // If it is dark blue it means they have done the work in alloted time
  let current = ss.getRange(row, column)
  
  //Dark Blue indicates that the user has completed this session. The color will set through the python script used in tandem
  return current.getBackgroundColor() == DARK_BLUE && current.getValue() != ""  && (days <=1);
}


function shouldSendFirstSessionEmails(ss, row, column, days,session) {
  let current = ss.getRange(row, column)
  //White shows no action has been done 
  return current.getBackgroundColor() == WHITE && current.getValue() != "" && (session == 1) && (days <=1);
}


function shouldSendPartiallyCompletedSessionEmails(studyName, fileData, ss, row, column, days, session,userTotalSessions) {
  let current = ss.getRange(row, column);
  let [isPartiallyCompleted, firstTrialStartTime] = getFirstTrialStartTimeforPartiallyCompletedCheck(studyName, fileData, session);
  // Calculate date difference
  let dateDifference = diffDate(getCurrentDate(), firstTrialStartTime);
  
  // Determine if the email should be sent
  const shouldSendEmail = (current.getBackgroundColor() == CALENDER_GREEN || current.getBackgroundColor() == YELLOW || current.getBackgroundColor() == GREY || current.getBackgroundColor() == PURPLE) 
                          && isPartiallyCompleted 
                          && current.getValue() != "" 
                          && (session <= userTotalSessions) 
                          && (dateDifference >= 1) 
                          && (days > 0);
  
  return shouldSendEmail;
}


function shouldGiveGracePeriod(studyName, fileData, fileNameAzure, ss, row, column, session,days){
  current = ss.getRange(row, column); 
  return  STUDIES[studyName]["lateSessionGraceDays"].shouldGiveGrace && shouldInvalidateSession(studyName, fileData, fileNameAzure, ss, row, column, session,days) && session > STUDIES[studyName]["lateSessionGraceDays"].afterSession && current.getBackgroundColor() != PURPLE  && current.getBackgroundColor() != ORANGE;
}


function shouldSendReminderEmailsInGracePeriod(ss, row, column, days,session,userTotalSessions) {
  let current = ss.getRange(row, column)
  return (current.getBackgroundColor() == GREY) && current.getValue() != "" && (session <= userTotalSessions) && (days == 1);
}


function shouldSendReminderEmails(ss, row, column, days,session,userTotalSessions) {
  let current = ss.getRange(row, column)
  return (current.getBackgroundColor() == CALENDER_GREEN )&& current.getValue() != "" && (session <= userTotalSessions) && (days == 1);
}

function hasDatePassed(studyName, fileData, fileNameAzure, ss, row, column, session) {
  current = ss.getRange(row, column);
  if(current.getBackgroundColor() == ORANGE){
    let numberOfDaysToInvalidateIncompleteSession = STUDIES[studyName].numberOfDaysToInvalidateIncompleteSession;
    let numberOfHoursToInvalidateIncompleteSession = STUDIES[studyName].numberOfHoursToInvalidateIncompleteSession;
    let [isPartiallyCompleted, firstTrialStartTime] = getFirstTrialStartTimeforPartiallyCompletedCheck(studyName, fileData, session);
    let due_date_session_partially = addHoursToDate(addDaysToDate(firstTrialStartTime,numberOfDaysToInvalidateIncompleteSession),numberOfHoursToInvalidateIncompleteSession);
    return (current.getValue() && compareDates(getCurrentDate(), due_date_session_partially)) > 0 && (current.getBackgroundColor() == ORANGE);
  }
  return (current.getValue() && diffDate(getCurrentDate(), Date.parse(current.getValue())) >= 1 && (current.getBackgroundColor() == CALENDER_GREEN || current.getBackgroundColor() == YELLOW || current.getBackgroundColor() == PURPLE));
}

function shouldInvalidateSession(studyName, fileData, fileNameAzure, ss, row, column, session,days) {
   current = ss.getRange(row, column);
  if(current.getBackgroundColor() == ORANGE){
    let numberOfDaysToInvalidateIncompleteSession = STUDIES[studyName].numberOfDaysToInvalidateIncompleteSession;
    let numberOfHoursToInvalidateIncompleteSession = STUDIES[studyName].numberOfHoursToInvalidateIncompleteSession;
    let [isPartiallyCompleted, firstTrialStartTime] = getFirstTrialStartTimeforPartiallyCompletedCheck(studyName, fileData, session);
    let due_date_session_partially = addHoursToDate(addDaysToDate(firstTrialStartTime,numberOfDaysToInvalidateIncompleteSession),numberOfHoursToInvalidateIncompleteSession);
    return (current.getValue() && compareDates(getCurrentDate(), due_date_session_partially)) > 0 && (current.getBackgroundColor() == ORANGE);
  }
  return diffDate(getCurrentDate(), Date.parse(ss.getRange(row, column).getValue())) >= days;
}
function redSession(ss, row, column) {
  return ss.getRange(row, column).getBackgroundColor().toLowerCase() == RED;
}

function compareDates(date1, date2) {
  // Convert both dates to milliseconds since January 1, 1970
  var time1 = date1.getTime();
  var time2 = date2.getTime();
  
  // Compare the two times
  if (time1 < time2) {
    return -1; // date1 is earlier than date2
  } else if (time1 > time2) {
    return 1; // date1 is later than date2
  } else {
    return 0; // date1 is equal to date2
  }
}


function diffDate(date1, date2) {
  return Math.floor((date1 - date2) / oneDay)
}


function subtractDaysFromDate(dateObj, daysToSubtract) {
  let newDate = new Date(dateObj); // Create a copy of the original date
  newDate.setDate(newDate.getDate() - daysToSubtract); // Subtract the days
  return newDate;
}


function addDaysToDate(date, days) {
  // Create a new Date object to avoid modifying the original date
  var newDate = new Date(date);
  newDate.setDate(newDate.getDate() + days); // Add days
  return newDate;
}

function addHoursToDate(date, hours) {
  // Create a new date object to avoid modifying the original date
  var newDate = new Date(date.getTime());
  
  // Add the specified number of hours (in milliseconds)
  newDate.setHours(newDate.getHours() + hours);
  
  return newDate;
}

function formatDate(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), "d MMMM yyyy");
}

function extractTimeAndTimeZone(timeString) {
  // Ensure timeString is converted to a string before using string operations
  var dateObj = new Date(timeString);
  
  // Extract the hours and minutes
  var hours = dateObj.getHours();
  var minutes = dateObj.getMinutes();
  
  // Format the time to ensure two digits for hours and minutes
  var formattedTime = ('0' + hours).slice(-2) + ':' + ('0' + minutes).slice(-2);
  
  // Convert the date object back to a string to extract the time zone
  var timeStringAsText = dateObj.toString();
  
  // Extract the time zone using regex or substring methods
  var timeZoneMatch = timeStringAsText.match(/\(([^)]+)\)/); // Extract content within parentheses
  var timeZone = timeZoneMatch ? timeZoneMatch[1] : 'Unknown Time Zone';
  
  return {
    time: formattedTime,
    timeZone: timeZone
  };
}


