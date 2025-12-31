// Total number of sessions in the study.
const NUM_SESSIONS = 10;

// Number of experimental groups.
const NUM_GROUPS = 7;

// Required delay between sessions.
const DAYS_INTERVAL = 2;

// Human-readable version of the interval text shown to participants.
const DAYS_INTERVAL_TEXT = "1-3 days";

// Mapping of group IDs to their descriptive labels.
const GROUPS_MAPPING = {
  "G00": "Baseline - Baseline",
  "G01": "Baseline - Variant 1",
  "G02": "Baseline - Variant 2",
  "G11": "Variant 1 - Variant 1",
  "G12": "Variant 1 - Variant 2",
  "G21": "Variant 2 - Variant 1",
  "G22": "Variant 2 - Variant 2"
};

// Maps numeric indexes (0 to NUM_GROUPS-1) to group IDs.
const groupIndexMapping = {
  0: "G00",
  1: "G01",
  2: "G02",
  3: "G11",
  4: "G12",
  5: "G21",
  6: "G22"
};

// Reverse lookup that maps group IDs back to numeric indexes.
const indexGroupMapping = {
  "G00": 0,
  "G01": 1,
  "G02": 2,
  "G11": 3,
  "G12": 4,
  "G21": 5,
  "G22": 6
};

// Sanity checks to ensure all mappings remain consistent.
assert(NUM_GROUPS === Object.keys(GROUPS_MAPPING).length, "You forgot to modify `GROUPS_MAPPING`");
assert(NUM_GROUPS === Object.keys(groupIndexMapping).length, "You forgot to modify `groupIndexMapping`");
assert(NUM_GROUPS === Object.keys(indexGroupMapping).length, "You forgot to modify `indexGroupMapping`");


// Running multiple experiment could be possible, however we STRONGLY recommend using one experiment at a time per each App Script Application.
var STUDIES = {
  GABLE_01: {
    name: "GABLE Experiment",
    admin_name: "Admin Name", // Your name here.
    website: "https://google.com",  // Your own experiment link here.
    preexperiment: "------TODO-----------",  // Link to pre-experiment survey (e.g., Qualtrics)
    email: 'email@example.com', // Your email here. You can put multiple emails separated by comma (email1@case.edu,email2@case.edu)
    folderID: "------TODO-----------",  // Google Drive Folder ID
    // For daily updates
    updateeEmails: [
      "email1@case.edu",
      "email2@case.edu"
    ],
    // Calendar ID where the events will be created (c_xxxxxxxx).
    adminCalendarId: "------TODO-----------",
    groups: {
      number: NUM_GROUPS,
      numSessions: NUM_SESSIONS,
      giftCardAmountPerSession: 5, // per session
      giftCardAmountAfterCompletion: 100 // after the completion bonus
    },
    halfSessionNumber: Math.floor(NUM_SESSIONS/2),
    // After session X, if the participant did not complete the session on time give extra e.g., 72 days
    lateSessionGraceDays: {
      shouldGiveGrace: true,
      afterSession: 5,
      graceDaysNumber: 3
    },
    // Adds sessions `NUM_SESSION` times.
    studyData: Array.from({ length: NUM_SESSIONS }, (_, i) => ({
      sessionName: (i + 1).toString(),
      daysBeforeNext: DAYS_INTERVAL
    })),
    numberOfDaysToInvalidateIncompleteSession: 1,
    numberOfHoursToInvalidateIncompleteSession: 2,
    collecting: true,
    // IDs require a seperate sheet
    sasToken: "?sv=xxxx",  // Where your data is stored. E.g., Azure SAS token
    storageAccountName: "xxxx",  // Azure Storage Account Name
    storageContainer: "xxxx", // Azure Storage Container Name
    experimentValidTimeRange: [8, 22]   // Check if the time is between 8:00 AM and 10:00 PM
  }
};


assert(Object.keys(STUDIES).length === 1, "The current setup assumes to have only one study running on the script. Putting multiple studies in the same script may require refactoring of this code base.");

const LIGHT_BLUE = "#add8e6" // means the session is completed by user but, completion email is not sent
const DARK_BLUE = "#034aea" // means the session is completed by user and completion email is sent to user
const WHITE = "#ffffff" // no action
const YELLOW = "#ffff00" // reminder email sent
const ORANGE = "#e69138" // user started to the trials but left incomplete 24 hours
const RED = "#ff0000" // invalid user -- latest extension 
const CALENDER_GREEN = "#90ee90" // necessary emails are sent for the session but no action from user yet
const GREY = "#bfbfbf" // this means that the grace period is given to the participant for the sessions after 14
const PURPLE = "#ff00ff" // this means we gave them grace period but only one day remained for the grace period will be end too
