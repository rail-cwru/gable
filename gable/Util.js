// Constants
const spaceBuffer = ": ".length; // Consists of colon and a space.

// Functions
function assert(condition, message) {
    if (!condition) {
        throw message || "Assertion failed";
    }
}

// sessionNumber and totalSessions should be empty strings
function getDocText(experiment="GABLE_01", textDelimiter="", sessionNumber="", totalSessions="", daysExtra="", session_start_time="", due_date_session="", participant_id = "") {
  if (textDelimiter === "")
  {
    throw Error("You have to call getDoctText function with an actual textDelimiter.")
  }
  var doc = DocumentApp.openByUrl(getDocURL());
  let text = doc.getBody().getText();
  let currentExperimentText = text.substring(text.indexOf(experiment));

  // calculate the gift card amount and send this info with email
  var gift_card_amount_per_session = STUDIES[experiment]['groups']['giftCardAmountPerSession'];
  var gift_card_amount_after_completion = STUDIES[experiment]['groups']['giftCardAmountAfterCompletion'];
  var latest_completed_session_number = sessionNumber;
  if(textDelimiter != `any$`){
     latest_completed_session_number =  latest_completed_session_number - 1;
  }

  var current_gift_card_amount = gift_card_amount_per_session * latest_completed_session_number ;
  var total_gift_card_amount = gift_card_amount_per_session * totalSessions + gift_card_amount_after_completion;

  let currentSessionText = currentExperimentText.substring(text.indexOf(textDelimiter)+spaceBuffer) 
  currentSessionText = currentSessionText.replace(new RegExp("<Number>", 'g'), sessionNumber+"")
  currentSessionText = currentSessionText.replace(new RegExp("<TotalNumber>", 'g'), totalSessions+"")
  currentSessionText = currentSessionText.replace(new RegExp("<LastNumber>", 'g'), (sessionNumber-1)+"")
  currentSessionText = currentSessionText.replace(new RegExp("<DaysExtra>", 'g'), daysExtra+"")
  currentSessionText = currentSessionText.replace(new RegExp("<session_start_time>", 'g'), session_start_time+"")
  currentSessionText = currentSessionText.replace(new RegExp("<due_date_session>", 'g'), due_date_session+"")
  // gift car related informations in emails
  currentSessionText = currentSessionText.replace(new RegExp("<gift_amount_perceived>", 'g'), current_gift_card_amount+"")
  currentSessionText = currentSessionText.replace(new RegExp("<gift_card_amount_per_session>", 'g'), gift_card_amount_per_session+"")
  currentSessionText = currentSessionText.replace(new RegExp("<gift_card_amount_after_completion>", 'g'), gift_card_amount_after_completion+"")
  currentSessionText = currentSessionText.replace(new RegExp("<total_amount_gift_card>", 'g'), total_gift_card_amount+"")
  // Subjects for the emails should contain participant id
  currentSessionText = currentSessionText.replace(new RegExp("<participant_id>", 'g'), participant_id+"")
  // Inform user about the grace_days-Hours
  var grace_days_hours = STUDIES[experiment]['lateSessionGraceDays']['graceDaysNumber'] * 24;
  currentSessionText = currentSessionText.replace(new RegExp("<grace_days_hours>", 'g'), grace_days_hours+"")
 
  let subject = getSessionField(currentSessionText, "Subject")
  let body = getSessionField(currentSessionText, "Body")
  return { subject, body }
}


function deleteTestSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  for (i = 0; i < sheets.length; i++) {
    if (sheets[i].getSheetName().toLowerCase().includes("test")) {
      ss.deleteSheet(sheets[i])
    }
  }
}


function columnNumber(sessionNum=2, ignoredCols) {
  requiredColumn = COLUMNS.FIRST_SCHED
  currSessionNum = 1
  while (currSessionNum < sessionNum || ignoredCols.includes(requiredColumn)) {
    if (!ignoredCols.includes(requiredColumn)) {
        currSessionNum = currSessionNum + 1
    }
    requiredColumn = requiredColumn + 1
  }
  return requiredColumn
}

function getSessionField(currentSessionText, fieldName) {
  //console.log(`Field name: ${fieldName}`);
  var fieldIndex = currentSessionText.indexOf(fieldName)+(fieldName).length + spaceBuffer;
  // console.log(fieldIndex)
  // console.log(currentSessionText.substring(fieldIndex).split("\n"))
  return currentSessionText.substring(fieldIndex).split("\n")[0].trim();
}

function fillGiftCardTestData() {
  var sheet = SpreadsheetApp.openByUrl(SPREADSHEET_URL).getSheetByName("GiftCards");
  
  // Constants for data generation, 4000 rows in this case.
  var buckets = [
    { count: 3500, amount: 5 },   // First 3500 rows with amount = 5
    { count: 500, amount: 100 }   // Next 500 rows with amount = 100
  ];

  var data = [];
  var currentId = 1;

  // Generate data and track totals in one pass
  var totals = { rows: 0, sum: 0 };
  buckets.forEach(bucket => {
    for (var i = 0; i < bucket.count; i++) {
      data.push([currentId++, "a", bucket.amount, "", ""]);
    }
    totals[bucket.amount] = bucket.count; // Log bucket count dynamically
    totals.rows += bucket.count;
    totals.sum += bucket.count * bucket.amount;
  });

  // Write data to the sheet
  sheet.getRange(2, 1, data.length, data[0].length).setValues(data);

  log.info(`Util.gs | fillGiftCardTestData() | Gift Cards toy data generated: 
    ${totals[5] || 0} rows of $5, 
    ${totals[100] || 0} rows of $100, 
    Total rows: ${totals.rows}, 
    Total amount: ${totals.sum}`);
}


function nextGiftCardTest() {
  const valuesSucess = [];
  for (let i = 5; i <= 195; i += 5) {
    valuesSucess.push(i);
  }
  const valuesFail = [
    7, 29, 31, 47, 62, 74, 83, 91, 103, 116,
    124, 137, 149, 161, 173, 181, 184, 187, 191, 194
  ];

  valuesSucess.forEach(val => {
    nextGiftCard(sheetName="GABLE_01", expectedAmount=val, participantID="test_participant_success", date="x");
  });

  valuesFail.forEach(val => {
    nextGiftCard(sheetName="GABLE_01", expectedAmount=val, participantID="test_participant_fail", date="x");
  });
}


function nextGiftCard(sheetName="GABLE_01", expectedAmount=25, participantID="2654682", date="x") {
  var ss = SpreadsheetApp.openByUrl(SPREADSHEET_URL).getSheetByName("GiftCards");
  let initEmail = STUDIES[Object.keys(STUDIES)[0]].email
  
  // Get gift card values from columns C, D, and B (assuming codes are in column B)
  var values = ss.getRange("B1:D" + ss.getLastRow()).getValues(); 
  var availableGiftCards = values
    .map((row, index) => ({ code: row[0], amount: Number(row[1]), index }))  // Store code, amount, and row index
    .filter(card => values[card.index][2] === "" && card.amount > 0) // Only available gift cards
    .sort((a, b) => b.amount - a.amount); // sort descending

  // Find a subset of available gift cards that add up to the expectedAmount
  var subsetIndices = findSubsetToSum(availableGiftCards, expectedAmount);
  console.log(`💸 For participant ${participantID} with expected amount ${expectedAmount} the subsetIndices: ${subsetIndices}`);
  
  let selectedGiftCards = [];

  if (subsetIndices) {
    // Update each selected gift card row in the sheet and collect card details
    subsetIndices.forEach(idx => {
      let row = availableGiftCards[idx].index + 1; // Convert 0-based index to 1-based row number
      ss.getRange(row, 4).setValue(participantID); // Set Participant ID in column D
      ss.getRange(row, 5).setValue(date);          // Set Date in column E
      selectedGiftCards.push({ code: availableGiftCards[idx].code, amount: availableGiftCards[idx].amount });
    });

    // Compose email message
    let emailMessage = `The following gift cards have been issued for participant ${participantID} on ${date}:\n\n`;
    let totalAmount = 0;  // Double check the amount is correct.
    // Add gift card details to the email message and calculate total amount
    selectedGiftCards.forEach((card, index) => {
      emailMessage += `Gift Card ${index + 1}: Code = ${card.code}, Amount = $${card.amount}\n`;
      totalAmount += card.amount;
    });

    // Assert that expectedAmount equals totalAmount
    if (totalAmount !== expectedAmount) {
      log.critical(`Assertion failed: Expected amount (${expectedAmount}) does not match total amount (${totalAmount}).`)
      throw new Error(`Assertion failed: Expected amount (${expectedAmount}) does not match total amount (${totalAmount}).`);
    }

    // Append the total amount to the email message
    emailMessage += `\nTotal Amount: $${totalAmount}\n`;

    //console.log(emailMessage); // Log the message (optional)
    return emailMessage; // Return the selected gift cards
  } 
  
  else {
    let studyName = sheetName
    console.log("Not possible to send a gift card of amount:", expectedAmount);
    let emailBody = "The gift card for the participant " + participantID + " could not be assigned to the participant on date "+ date;
    GmailApp.sendEmail(
            initEmail,
            `${studyName} Gift cards could not be asigned to participant ` + participantID,
            emailBody
          ) 
    return "Your gift card will be assigned to you by the team within 2-3 weeks.";
  }
}


function findSubsetToSum(giftCards, target) {
  const cache = new Map(); // Cache for memoization

  function findSubset(idx, remaining, path) {
    // Base cases
    if (remaining === 0) return path; // Found exact match
    if (remaining < 0 || idx >= giftCards.length) return null; // No valid match
    
    // Memoization key
    const key = `${idx}-${remaining}`;
    if (cache.has(key)) return cache.get(key);

    // Prune: If the remaining amount is less than the smallest card, fail early
    if (remaining < Math.min(...giftCards.map(card => card.amount))) {
      cache.set(key, null);
      return null;
    }

    // Try including the current gift card
    let withCurrent = findSubset(idx + 1, remaining - giftCards[idx].amount, [...path, idx]);
    if (withCurrent) {
      cache.set(key, withCurrent);
      return withCurrent;
    }

    // Try excluding the current gift card
    let withoutCurrent = findSubset(idx + 1, remaining, path);
    cache.set(key, withoutCurrent);
    return withoutCurrent;
  }

  return findSubset(0, target, []);
}




function canFormAmount(giftCards, target) {
  if (target === 0) return true; // Base case: exact match found
  if (target < 0 || giftCards.length === 0) return false; // No match possible
  
  // Recursive case: try with and without the first card in the array
  const [first, ...rest] = giftCards;
  return canFormAmount(rest, target - first) || canFormAmount(rest, target);
}


function giftCardStock() {
  var ss = SpreadsheetApp.openByUrl(SPREADSHEET_URL).getSheetByName("GiftCards");
  let totalVals = ss.getRange("A1:A").getValues().filter(String).length
  let usedVals = ss.getRange("D1:D").getValues().filter(String).length
  stock = totalVals-usedVals;
  log.info("Util.gs | giftCardStock() | " + stock);
  return stock;
}

/* Checking if a sheet has a new response by seeing if the last row has a submission but no ID assigned to it yet. Assuming multiple people are not submitting the same form within ~0.25 of a second
*/
function sheetHasNewResponse(sheetName) {
  var ss = SpreadsheetApp.openByUrl(SPREADSHEET_URL).getSheetByName(sheetName);
  if (!ss) {
    return false
  }
  var Avals = ss.getRange("A1:A").getValues();
  var Alast = Avals.filter(String).length
  return (ss.getRange(Alast,COLUMNS.ID).getValue().length == 0)

}

function countRedCellsInColumnM() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const range = sheet.getRange("M1:M" + sheet.getLastRow());  // Adjust column as needed
  const backgrounds = range.getBackgrounds();
  let count = 0;

  for (let i = 0; i < backgrounds.length; i++) {
    if (backgrounds[i][0] === "#ff0000") {  // Red color in hex
      count++;
    }
  }

  log.info("Number of red cells in column   M: " + count);
  return count;
}
