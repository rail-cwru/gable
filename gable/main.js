// LIST OF INSTRUCTIONS
// NUMBER OF SESSIONS
// DAYS BETWEEN SESSIONS

log.info(`main.gs | * * * GLOBAL MAIN * * *`)

// Checked
function initialize() {
  log.info(`main.gs | Initialize function running...`)

  createDoc();
  createForms();
  createSheets();
  createTriggers();
  sendInitialConfigEmail();
}
// Checked
function sendInitialConfigEmail() {
  let initEmail = STUDIES[Object.keys(STUDIES)[0]].email
  let studyName = STUDIES["GABLE_01"]['name']
  MailApp.sendEmail(
    initEmail,
    `${studyName} Config Information`,
    `Your initial configuration has been set up for your study. 
     Your Google Documents and Google Forms may still require some changing. The links to them can be found in the 
     Config sheet on your Google Sheet which is linked here: ${SPREADSHEET_URL}. Your Apps Script can also be found 
     by navigating to script.google.com or clicking on Extensions-->Apps Script from your Google Sheet. If you have 
     any questions, please email us.` // Optional: Put your own email here in the text.
  );

  log.debug(`main.gs | Confirmation email for the initial config has been sent.`)
}
// Checked
function createSheets() {
  createGiftCardsSheet()

  let studies = Object.keys(STUDIES);
  for (let study of studies) {
    createStudySheets(study);
  }
  updateConfigTime();
  log.debug(`main.gs | createSheets() | Sheets are created.`);
}
// Checked
function createStudySheets(sheet) {
  const headers = ["Date", "Sign ups", "Session completions", "Study completions", "Gift cards", "Server errors", "Invalid sessions", "Invalidated users", "Missed sessions", "Gift card stock","Remainder Email Sent", "Partially Completed Sessions", "First Half of Sessions Finished", "Grace Period Given", "Grace Period Remainder Sent"]
  let ss = SpreadsheetApp.openByUrl(SPREADSHEET_URL)
  ss.insertSheet(`${sheet}Updates`).appendRow(headers).appendRow(["Total"])
  createSpecificStudySheet(sheet)
}
// Checked
function columnNames(sheet) {
  let cols = []
  if (!STUDIES[sheet]['studyData']) {
    let sessions = getNumSessions(sheet);
    log.debug(Array.from({ length: sessions }, (_, i) => `${i + 1} Session`));
    return Array.from({ length: sessions }, (_, i) => `${i + 1} Session`);
  }
  let studyData = STUDIES[sheet].studyData
  for (let session of studyData) {
    cols.push((session.sessionName + " Session").trim());
  }
  //log.debug(cols);
  return cols
}
// Checked
function createForms() {
  let studies = Object.keys(STUDIES);
  for (let study of studies) {
    [edit, publish, form] = createForm(study);
    // Get the file representation of the form
    var file = DriveApp.getFileById(form.getId());
    // Specify the destination folder ID
    var folder = DriveApp.getFolderById(STUDIES[study]['folderID']);

    // Move the file to the specified folder
    folder.addFile(file);
    // Remove the file from the root folder
    DriveApp.getRootFolder().removeFile(file);

    log.debug(`📄 main.gs | Form publish URL: ${publish}`);
    log.debug(`main.gs | Form editable URL: ${edit}`);
    setFormURL(study, edit, publish);
  }
  log.debug(`main.gs | createForms() | Forms are created.`);
}
// Updated- cwru id email is asked, instructions are updated according to spatial nav
function createForm(sheet) {
  // Create a new form
  var form = FormApp.create(STUDIES[sheet].name);

  // Customize form settings based on your needs.
  // Set form settings to limit to 1 response and collect email addresses
  form.setLimitOneResponsePerUser(true);
  form.setCollectEmail(true);
  form.setRequireLogin(false);
  // Reminder: Manual Step for Restricting to Organization
  log.critical('🚨 After the form is created, remember to manually restrict it to your organization using the Form Settings. Add your email info in the form description.');

  // Add First Name question
  form.addTextItem()
    .setTitle('First Name')
    .setRequired(true);

  // Add Last Name question
  form.addTextItem()
    .setTitle('Last Name')
    .setRequired(true);

  // Add Case ID question
  form.addTextItem()
    .setTitle('Instituitional email ID (example: abc123@case.edu)')
    .setRequired(true);

  form.addSectionHeaderItem()
      .setTitle("Instructions")
      .setHelpText(`You are expected to complete ${NUM_GROUPS} sessions, spaced ${DAYS_INTERVAL_TEXT} apart. Roughly, every session will take up to one hour to complete. Please make sure you are able to do the sessions at and around the time selected in the form, if you miss a session your participation will be terminated.`);

    // Add How many days question
   form.addScaleItem()
     .setTitle(`How many days from today do you wish to complete the first session of the study? The next session will need to be completed ${DAYS_INTERVAL_TEXT} later`).setBounds(1, 10).setLabels('1 day', '10 days').setRequired(true);
     
  // Add Current Time question
  form.addTimeItem()
    .setTitle('What is your current time?')
    .setRequired(true);

  // Add Current Date question
  form.addDateItem()
    .setTitle('What is your current date?')
    .setRequired(true);

  var timeItem = form.addTimeItem();
  timeItem.setTitle("Approximately when do you want to start your session (this will be in your current time zone)? Please choose a time between 8:00 AM to 10:00 PM (in your current time zone.)");  
  timeItem.setRequired(true);

  // Display URL of the form
  return [form.getEditUrl(), form.getPublishedUrl(), form]
}
// Checked
function createSpecificStudySheet(sheet) {
  let ss = SpreadsheetApp.openByUrl(SPREADSHEET_URL)
  const headers = ["Time difference", "ID", "Completed"].concat(columnNames(sheet))
  let formurl = formURL(sheet)
  if (formurl.length > 0) {
    let form = FormApp.openByUrl(formurl)
    form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
    SpreadsheetApp.flush()
    let currSheet = formSheet()
    currSheet.setName(`${sheet}`)
    let firstRow = currSheet.getRange(1, 1, 1, currSheet.getLastColumn());
    let lastColumn = firstRow.getLastColumn();
    let newRange = currSheet.getRange(1, lastColumn + 1, 1, headers.length);
    newRange.setValues([headers]);
  }
  log.debug(`main.gs | createSpecificStudySheet() | sheet=${sheet}`)
}
// Checked
function formSheet() {
  let ss = SpreadsheetApp.openByUrl(SPREADSHEET_URL)
  let sheets = ss.getSheets();
  for (let i = 0; i < sheets.length; i++) {
    let sheetName = sheets[i].getName();
    log.debug(`main.gs | Sheet attached to form before renaming: ${sheetName}`)
    if (sheetName.startsWith('Form Responses')) {
      return sheets[i]
    }
  }
}

function createGiftCardsSheet() {
  let ss = SpreadsheetApp.openByUrl(SPREADSHEET_URL)
  newSheet = ss.insertSheet("GiftCards");
  // Gift Card Sheet is updated
  let headers = ["Gift Card ID","Codes", "Amount", "Participant ID", "Date"];
  newSheet.appendRow(headers);
  log.debug(`main.gs | createGiftCardsSheet() | Done.`);
}

function createTriggers() {
  createFormResponseTrigger(); // After someone signsup on google form, this will update the google sheet and send participant email.
  createLoadAzureTrigger(); // If the session is complete then the google doc column is marked green.
  createParticipantEmailTrigger(); // If the participant hasn't completed some session or he completed a session, it sends an email remainder.
  createUpdateEmailsTrigger(); // Status sent on monday morning like 10 people signed up
  log.debug(`main.gs | All triggers are created.`)
}

function createFormResponseTrigger() {
 let ss = SpreadsheetApp.openByUrl(SPREADSHEET_URL).getSheetByName("GABLE_01");
  ScriptApp.newTrigger('sendResponses')
  .forForm(FormApp.openByUrl(ss.getFormUrl()))
  .onFormSubmit()
  .create();
}

function createLoadAzureTrigger() {
  ScriptApp.newTrigger('processAzureStorage').timeBased().everyMinutes(5).create();
}
function createParticipantEmailTrigger() {
  ScriptApp.newTrigger('sendAllStudyEmails').timeBased().everyHours(1).create();
}
function createUpdateEmailsTrigger() {
  ScriptApp.newTrigger('updateEmails').timeBased().everyDays(1).atHour(9).create(); 
}
function deleteTriggers() {
  const allTriggers = ScriptApp.getProjectTriggers();
  for (let index = 0; index < allTriggers.length; index++) {
    // If the current trigger is the correct one, delete it.
    ScriptApp.deleteTrigger(allTriggers[index]);
  }
}
function recreateTriggers() {
  deleteTriggers();
  createTriggers();
}
