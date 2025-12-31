function getAllSubgroups() {
  // Simply return the base groups without timer flags
  return Object.keys(GROUPS_MAPPING);

  // If you would like to do more complex subgrouping, you may uncomment below:
  // This example adds a timer flag (0 or 1) to each base group
  // creating subgroups like G110, G111, G120, G121, etc.
  /*
  const subgroups = [];
  Object.keys(GROUPS_MAPPING).forEach(base => {
    subgroups.push(base + "0");
    subgroups.push(base + "1");
  });
  return subgroups;
  */
  
  // Note: If you enable subgrouping above, you'll also need to update:
  // - getGroupCounts(): change substring(0, 3) to substring(0, 4)
  // - testGetUniqueIdWithGroupLarge(): change substring(0, 3) to substring(0, 4)
}

function getGroupCounts() {
  const studyName = "GABLE_01";  
  const sheet = SpreadsheetApp.openByUrl(SPREADSHEET_URL).getSheetByName(studyName);
  if (!sheet) throw new Error(`Sheet not found: ${studyName}`);

  const data = sheet.getDataRange().getValues();
  const counts = {};

  for (let i = 1; i < data.length; i++) {
    const id = data[i][COLUMNS.ID - 1];
    const completed = data[i][COLUMNS.COMPLETED - 1];

    if (!id) continue;
    if (completed === "Invalid") continue;

    const subgroup = id.substring(0, 3); // e.g. "G21". If use subgrouping, change to substring(0, 4)
    counts[subgroup] = (counts[subgroup] || 0) + 1;
  }

  // Ensure all subgroups exist, even if count = 0
  getAllSubgroups().forEach(sg => { if (!(sg in counts)) counts[sg] = 0; });

  return counts;
}


// 💠 Generating IDs, Balanced Assignment.
function getUniqueIdWithGroup(name, surname, emailId) {
  // Get subgroup counts
  const counts = getGroupCounts();

  // Find min count
  const minCount = Math.min(...Object.values(counts));
  const candidates = Object.keys(counts).filter(k => counts[k] === minCount);

  // Pick random subgroup
  const chosen = candidates[Math.floor(Math.random() * candidates.length)];
  const groupPrefix = chosen; // Use the full 3-character prefix (e.g. "G21"). If you use additional subgrouping, use chosen.substring(0, 3) instead.

  // Generate hash
  const stringToHash = name + surname + emailId;
  const hash = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, stringToHash, Utilities.Charset.UTF_8);
  const hashInHex = hash.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('').substring(0, 7);

  // Final ID
  return groupPrefix + hashInHex;
}

function testGetUniqueIdWithGroup(){
  name = "test";
  surname = "user";
  emailId = "user.test@gmail.com";
  ID = getUniqueIdWithGroup(name, surname, emailId);
  console.log(ID, ID.substring(0,3));
}

function testGetUniqueIdWithGroupLarge() {
  // ⚠️ Reminder: this test does NOT update the spreadsheet, so balancing won't look perfect here.
  // Array of 25 test cases with name, surname, email
  var testCases = [
    { name: "Alice", surname: "Smith", emailId: "alice.smith@gmail.com" },
    { name: "Bob", surname: "Johnson", emailId: "bob.johnson@gmail.com" },
    { name: "Charlie", surname: "Brown", emailId: "charlie.brown@gmail.com" },
    { name: "Diana", surname: "Miller", emailId: "diana.miller@gmail.com" },
    { name: "Eve", surname: "Davis", emailId: "eve.davis@gmail.com" },
    { name: "Frank", surname: "Garcia", emailId: "frank.garcia@gmail.com" },
    { name: "Grace", surname: "Martinez", emailId: "grace.martinez@gmail.com" },
    { name: "Hank", surname: "Wilson", emailId: "hank.wilson@gmail.com" },
    { name: "Ivy", surname: "Taylor", emailId: "ivy.taylor@gmail.com" },
    { name: "Jack", surname: "Anderson", emailId: "jack.anderson@gmail.com" },
    { name: "Karen", surname: "Thomas", emailId: "karen.thomas@gmail.com" },
    { name: "Leo", surname: "Harris", emailId: "leo.harris@gmail.com" },
    { name: "Mona", surname: "Clark", emailId: "mona.clark@gmail.com" },
    { name: "Nate", surname: "Lewis", emailId: "nate.lewis@gmail.com" },
    { name: "Olivia", surname: "Walker", emailId: "olivia.walker@gmail.com" },
    { name: "Paul", surname: "Young", emailId: "paul.young@gmail.com" },
    { name: "Quinn", surname: "Hall", emailId: "quinn.hall@gmail.com" },
    { name: "Rita", surname: "Allen", emailId: "rita.allen@gmail.com" },
    { name: "Sam", surname: "King", emailId: "sam.king@gmail.com" },
    { name: "Tina", surname: "Scott", emailId: "tina.scott@gmail.com" },
    { name: "Uma", surname: "Green", emailId: "uma.green@gmail.com" },
    { name: "Victor", surname: "Baker", emailId: "victor.baker@gmail.com" },
    { name: "Wendy", surname: "Nelson", emailId: "wendy.nelson@gmail.com" },
    { name: "Xavier", surname: "Carter", emailId: "xavier.carter@gmail.com" },
    { name: "Yara", surname: "Mitchell", emailId: "yara.mitchell@gmail.com" }
  ];

  // Iterate through each test case
  testCases.forEach(function(testCase) {
    var ID = getUniqueIdWithGroup(testCase.name, testCase.surname, testCase.emailId);
    console.log(`Name: ${testCase.name}, Surname: ${testCase.surname}, Email: ${testCase.emailId}`);
    console.log(`Generated ID: ${ID}, Prefix: ${ID.substring(0, 3)}`); // Using substring(0, 3). If you use additional subgrouping, change to substring(0, 4)
  });
}



