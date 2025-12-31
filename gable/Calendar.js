// 🪶 Checked | Feb 14th, 2025.

class SpreadsheetTile {
  constructor(ss, row, column, value='') {
    this.spreadsheet = ss
    this.row = row
    this.column = column
    this.value = value
  }
}

class InviteInfo {
  constructor (email, summary, description, date=null) {
    this.email = email
    this.summary = summary
    this.description = description
    this.date = date
  }
}

class DateTime {
  constructor (date, time) {
    this.date = date
    this.time = time
  }
}

function formatDateToICS(date) {
  return Utilities.formatDate(date, "GMT+00:00", "yyyyMMdd'T'HHmmss'Z'");
}


function invite(studyName, spreadsheetTile, daysAhead, schedTime, inviteInfo, user=null) {
  // Sends an ics invite to the participants.
  let startTime = getCurrentDate()
  let currTime = startTime
  let hourDifference = spreadsheetTile.spreadsheet.getRange(spreadsheetTile.row, COLUMNS.TIME_DIFF).getValue()
  // If the user's time difference has not been set yet
    let userMinutes = 0
    let hours = 0
    if (user != null) {
      if (user.time.length > 6 || user.time instanceof Date) {
      hours = user.time.getHours()
      userMinutes = user.time.getMinutes()
    }
    else {
      hours = user.time.split(":")[0]
      userMinutes = user.time.split(":")[1]
    }
    currTime = user.date
    currTime.setHours(hours)
    currTime.setMinutes(userMinutes)
    hourDifference = (currTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    if (Math.abs(hourDifference) > 28) {
      currTime = startTime
      hourDifference = 0
    }
    // Setting the value of Time difference.
    spreadsheetTile.spreadsheet.getRange(spreadsheetTile.row, COLUMNS.TIME_DIFF).setValue(roundHalf(hourDifference))
  }
  hourDifference = spreadsheetTile.spreadsheet.getRange(spreadsheetTile.row, COLUMNS.TIME_DIFF).getValue()
  let newMinutes = minutes(schedTime, hourDifference)
  startTime.setMinutes(newMinutes)
  startTime.setDate(currTime.getDate() + daysAhead)
  let schedHours = 0
  if (schedTime.length > 6 || schedTime instanceof Date) {
    schedHours = schedTime.getHours()
  }
  else {
    schedHours = +schedTime.split(":")[0]
  }
  startTime.setHours(schedHours + Math.floor(+hourDifference))
  let endTime = new Date(startTime)
  endTime.setHours(endTime.getHours() + 1)

  // Sending an ics invitation using gmail.
  let email = STUDIES[studyName]['name'];   
  let admin_name = STUDIES[studyName]['admin_name']

  var icsInvite = [
    `BEGIN:VCALENDAR`,
    `VERSION:2.0`,
    `BEGIN:VEVENT`,
    `DTSTART:${formatDateToICS(startTime)}`,
    `DTEND:${formatDateToICS(endTime)}`,
    `SUMMARY:${inviteInfo.summary}`,
    `DESCRIPTION:${inviteInfo.description}`,
    `ORGANIZER;CN=${admin_name} [GABLE Experiment];SENT-BY="mailto:${email}":mailto:${email}`,  
    `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;RSVP=TRUE:mailto:${email}`,
    `END:VEVENT`,
    `END:VCALENDAR`
  ];

  var icsContent = icsInvite.join("\n");
  var icsFile = Utilities.newBlob(icsContent, 'text/calendar', 'event.ics');

  MailApp.sendEmail({
    to: inviteInfo.email,
    subject: inviteInfo.summary,
    body: inviteInfo.description,
    attachments: [icsFile]
  });

  const experimentCal = CalendarApp.getCalendarById(STUDIES[studyName].adminCalendarId); 
  experimentCal.createEvent(
    inviteInfo.summary,
    startTime,
    endTime,
    {
    sendInvites: true,
    guests: inviteInfo.email,
    description: inviteInfo.description
    }
  )
  return startTime; 
}

	 
function testExperimenterCalendarRaw() {        // 📍 UPDATE HERE. <---- hard coded. (optinoal)
  const calId = STUDIES["GABLE_01"].adminCalendarId;
  const experimentCal = CalendarApp.getCalendarById(calId);
  if (!experimentCal) {
    console.log("❌ Calendar not found!");
  } else {
    console.log("✅ Calendar found: " + experimentCal.getName());
  }
}

 
function calculate_next_invite_time(spreadsheetTile, daysAhead, schedTime, startTime, user=null) {
  // Sends an ics invite to the participants.
  let currTime = startTime
  let hourDifference = spreadsheetTile.spreadsheet.getRange(spreadsheetTile.row, COLUMNS.TIME_DIFF).getValue()
  // If the user's time difference has not been set yet
    let userMinutes = 0
    let hours = 0
    if (user != null) { // no idea why but we use it null in the Code.gs all the time
      if (user.time.length > 6 || user.time instanceof Date) {
      hours = user.time.getHours()
      userMinutes = user.time.getMinutes()
    }
    else {
      hours = user.time.split(":")[0]
      userMinutes = user.time.split(":")[1]
    }
    currTime = user.date
    currTime.setHours(hours)
    currTime.setMinutes(userMinutes)
    hourDifference = (currTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    if (Math.abs(hourDifference) > 28) {
      currTime = startTime
      hourDifference = 0
    }
    // Setting the value of Time difference.
    spreadsheetTile.spreadsheet.getRange(spreadsheetTile.row, COLUMNS.TIME_DIFF).setValue(roundHalf(hourDifference))
  }
  hourDifference = spreadsheetTile.spreadsheet.getRange(spreadsheetTile.row, COLUMNS.TIME_DIFF).getValue()
  let newMinutes = minutes(schedTime, hourDifference)
  startTime.setMinutes(newMinutes)
  startTime.setDate(currTime.getDate() + daysAhead)
  let schedHours = 0
  if (schedTime.length > 6 || schedTime instanceof Date) {
    schedHours = schedTime.getHours()
  }
  else {
    schedHours = +schedTime.split(":")[0]
  }
  startTime.setHours(schedHours + Math.floor(+hourDifference))
  let endTime = new Date(startTime)
  endTime.setHours(endTime.getHours() + 1)
  return startTime;
}

function minutes(time1, time_diff) {
  // Adds time difference and sends new minutes rounding to 30 minutes
  let newMinutes = 0
  if (time1.length > 6 || time1 instanceof Date) {
    newMinutes = time1.getMinutes()
  }
  else {
    newMinutes = +time1.split(":")[1]
  }
  newMinutes = newMinutes == 30 ? 0.5 : 0
  return (newMinutes + (+time_diff)) * 10 % 10 == 0 ? 0 : 30
}
function roundHalf(num) {
    return Math.round(num*2)/2;
}
