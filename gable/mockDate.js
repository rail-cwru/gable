function getCurrentDate() {
  const sheet = SpreadsheetApp.openByUrl(SPREADSHEET_URL).getSheetByName("Config");
  const Avals = sheet.getRange("A1:A").getValues();  // Get all values in column A
  let timeValue = "NOW";  // Default to "NOW" if TIME isn't found

  // Loop through the rows to find "TIME"
  for (let i = 0; i < Avals.length; i++) {
    if (Avals[i][0] && Avals[i][0].toUpperCase() === "TIME") {
      timeValue = sheet.getRange(i + 1, 3).getValue();  // Get value from column C in the found row
      break;
    }
  }

  let now;
  if (timeValue.toUpperCase() === "NOW" || !timeValue) {
    now = new Date();  // Use the current date
    //console.log("Using current time:", now);
  } else {
    now = new Date(timeValue);  // Use the specified date from the sheet
    console.log("Using test time from sheet:", now);
  }

  return now;
}


function setTime(e) {
  if (e.parameter.time) {
    TIME = e.parameter.time;
    log.info(`Test time set to: ${TIME} 🕰️`)
  } else {
    TIME = "CURRENT";
    log.info("Resetting to current time. 🕒");
  }
  return ContentService.createTextOutput(`TIME set to: ${TIME}`).setMimeType(ContentService.MimeType.TEXT);
}

