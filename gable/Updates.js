
UPDATE_SHEET_COLUMNS = {
  SIGNUPS: parse("B"),  // 2
  SESSION_COMPLETIONS: parse("C"),  // 3
  STUDY_COMPLETIONS: parse("D"), // 4
  GIFT_CARDS: parse("E"), // 5
  SERVER_ERRORS: parse("F"), //6  // DAYS_AHEAD 
  INVALID_SESSIONS: parse("G"), // 8 CURR_TIME
  INVALIDATED_USERS: parse("H"),//7  CURR_DATE
  MISSED_SESSIONS: parse("I"), // 9  SCHED_TIME
  GIFT_CARD_STOCK: parse("J"),  // 10  Handled
  REMINDER_EMAIL_SENT: parse("K"), // 11 ID
  PARTIALLY_COMPLETED_SESSIONS: parse("L"),  // 12  COMPLETED
  FIRST_10_SESSION_FINISHED: parse("M"), // 13  FIRST_SCHED
  GRACE_PERIOD_GIVEN: parse("N"), // 14
  GRACE_PERIOD_REMINDER_SENT: parse("O"), // 15
}

function currentRow(sheetName, total) {
  var ss = SpreadsheetApp.openByUrl(SPREADSHEET_URL).getSheetByName(sheetName)
  //log.debug(`Updates.gs | currentRow() | sheetName: ${sheetName}`);
  let Avals = ss.getRange("A1:A").getValues();
  let Alast = Avals.filter(String).length;
  if (total) {
    return Alast
  }

  let currentDate = getCurrentDate()
  if (Alast == 2 || (currentDate.getDate() != ss.getRange(Alast-1, 1).getValue().getDate())) {
    ss.insertRowBefore(Alast)
    ss.getRange(Alast, 1).setValue(currentDate)
    return Alast
  }
  return Alast-1;
}

function updateRow(sheetName, column, count=1, stock=false, total=false) {
  if (!sheetName.includes("Updates")) {
      sheetName = sheetName + "Updates"
  }
  var ss = SpreadsheetApp.openByUrl(SPREADSHEET_URL).getSheetByName(sheetName)
  let row = currentRow(sheetName, total)
  if (total) {
    ss.getRange(row, column).setValue(count)
    return true
  }
  let currentValue = ss.getRange(row, column).getValue()
  if (stock) {
    ss.getRange(row, column).setValue(count)
  }
  else{
     if (!currentValue) {
    currentValue = 0
  }
  currentValue = currentValue + count
  ss.getRange(row, column).setValue(currentValue)
  
  // Updating total
  ss.getRange(row+1, column).setValue((ss.getRange(row+1, column).getValue() || 0) + count)
  }
  return true
}


function updateSignUps(sheetName) {
  updateRow(sheetName, UPDATE_SHEET_COLUMNS.SIGNUPS) 
}

function updateSessionCompletions(sheetName) {
  updateRow(sheetName, UPDATE_SHEET_COLUMNS.SESSION_COMPLETIONS)
}

function updateStudyCompletions(sheetName) {
  updateRow(sheetName, UPDATE_SHEET_COLUMNS.STUDY_COMPLETIONS)
}
function updateGiftCards(sheetName) {
  updateRow(sheetName, UPDATE_SHEET_COLUMNS.GIFT_CARDS)
}
function updateServerError (sheetName) {
  log.info("Update Server Error is called");
  updateRow(sheetName, UPDATE_SHEET_COLUMNS.SERVER_ERRORS)
  updateRow(sheetName, UPDATE_SHEET_COLUMNS.INVALID_SESSIONS)
}

function updateInvalid(sheetName) {
  updateRow(sheetName, UPDATE_SHEET_COLUMNS.INVALIDATED_USERS)
  updateRow(sheetName, UPDATE_SHEET_COLUMNS.INVALID_SESSIONS)
}
function updateMissed(sheetName) {
  updateRow(sheetName, UPDATE_SHEET_COLUMNS.MISSED_SESSIONS)
}
//Finalized
function updateRemainderEmailSent(sheetName){
  updateRow(sheetName, UPDATE_SHEET_COLUMNS.REMINDER_EMAIL_SENT)
}

function updatePartiallyCompletedSessions(sheetName){
  updateRow(sheetName, UPDATE_SHEET_COLUMNS.PARTIALLY_COMPLETED_SESSIONS)
}

function updateFirstHalfSessionsCompleted(sheetName){
  updateRow(sheetName, UPDATE_SHEET_COLUMNS.FIRST_10_SESSION_FINISHED)
}

function updateGracePeriodGiven(sheetName){
  updateRow(sheetName, UPDATE_SHEET_COLUMNS.GRACE_PERIOD_GIVEN)
}

function updateGracePeriodRemainder(sheetName){
  updateRow(sheetName, UPDATE_SHEET_COLUMNS.GRACE_PERIOD_REMINDER_SENT)
}
function updateEmails() {
  let total = ""
  //let date = new Date()
  let date = getCurrentDate()
  // SHOULD BE (date.getDate() - 1); could be set to (date.getDate()) during debugging
  date.setDate(date.getDate() - 1);
  formattedDate = date.toISOString().slice(0,10)
  //log.info(formattedDate)
  let UPDATEES = []
  for (let study of Object.keys(STUDIES)) {
     if (STUDIES[study].collecting) {
       UPDATEES = STUDIES[study].updateeEmails // will change this 
       var ss = SpreadsheetApp.openByUrl(SPREADSHEET_URL).getSheetByName(study+"Updates")
       lastRow = ss.getRange("A1:A").getValues().filter(String).length - 1;
       totalRow = lastRow + 1
       //log.info("totalRow is " + totalRow)
       //log.info("lastRow is " + lastRow)
       if (lastRow == 1) { // If there is no collected data till now 
        //log.info("lastRow is 1")
         continue;
       }
       else { //else if there is data collected
        let text = `Information about ${STUDIES[study].name} on ${formattedDate}: `
        found = false
        /* We are sending out data from the previous day at the beginning of the next day.
        The else if block is a precaution if something occurs during the current day so we use the second last row
        */
         if (date.getDate() == ss.getRange(lastRow,1).getValue().getDate()) {
            text += `\n`+emailInfo(ss, lastRow)
            text += `\nTotals for this study are now: ${emailInfo(ss, totalRow)}`
            found = true
         }
         else if (lastRow - 1 !=1 && date.getDate() == ss.getRange(lastRow-1,1).getValue().getDate()) {
            text += `\n`+emailInfo(ss, lastRow-1)
            text += `\nTotals for this study are now: ${emailInfo(ss, totalRow)}`
            found = true
         }
         if (found) {
           total = total + text + "\n\n"
         }
       }
     }
  }
  if (total) {
    let studyName = STUDIES["GABLE_01"]['name']
    note = "\n\nNote: Invalidated users are a sum of server errors and invalid sessions. Invalid sessions are caused by stopping midway through a session or not completing a session for a long enough period where they are deemed inactive. Missing sessions are users who have missed assigned sessions but are still active participants."
    total = "The following email was generated automatically.\n\n" + total.trim()
    //console.log(`Following update email being sent out:\n${total}`)
    GmailApp.sendEmail(
     UPDATEES,
      `${studyName} Skills Study Updates from ${formattedDate}`,
      total
    );
  }
}

// This function is designed to be used with [studyName]Updates sheet
function emailInfo(ss, row) {
  totalInfo = []
  let columnNum = 2;
  let headerName = ss.getRange(1, 1).getValue();
  while (headerName) {
    headerName = ss.getRange(1, columnNum).getValue()
    //log.debug(`emailInfo | Header name: ${headerName}`)
    // Stocks are only updated for the total counts
    if (headerName == "Gift card stock") {
      updateRow(ss.getSheetName(), columnNum, count=giftCardStock(), stock=true, total=true)
    }
    currValue = ss.getRange(row, columnNum).getValue()  // error was here.
    if (currValue) {
      totalInfo.push(`\n${headerName}: ${currValue}`)
    }
    columnNum++;
  }
   infoToString = totalInfo.join(", ")
   numSecondChanceEmails = countSecondChanceEmailsSentTotal()
   infoToString = infoToString +  ",\nNumber of Second Chance Emails Sent to Never Started Users in Total: " + numSecondChanceEmails
   return infoToString
}

function countSecondChanceEmailsSentTotal() {
  sheetName = Object.keys(STUDIES)
  const sheet = SpreadsheetApp.openByUrl(SPREADSHEET_URL).getSheetByName(sheetName);
  const range = sheet.getRange("K1:K" + sheet.getLastRow());  // Adjust column as needed
  const backgrounds = range.getBackgrounds();
  let count = 0;

  for (let i = 0; i < backgrounds.length; i++) {
    if (backgrounds[i][0] === "#00ffff") {  
      count++;
    }
  }

  log.info("Number of second chance emails sent to participants: " + count);
  return count;
}
