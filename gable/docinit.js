function createDoc() {
  for (let study of Object.keys(STUDIES)) {
    let studyName = STUDIES[study]['name']
    let documentName = studyName + " -- email text"
    let doc = DocumentApp.create(documentName)
    createStudyDoc(doc, study)
    // Get the file representation of the form
    var file = DriveApp.getFileById(doc.getId());
    // Specify the destination folder ID
    var folder = DriveApp.getFolderById(STUDIES[study]['folderID']);

    // Move the file to the specified folder
    folder.addFile(file);
    DriveApp.getRootFolder().removeFile(file); // Optional: remove the file from the root folder
    var url = doc.getUrl();
    setDocURL(url);
    console.log(`Document URL: ${url}`);
  }
  log.debug(`docinit.gs | createDoc() | Document creation completed.`);
}

function createStudyDoc(doc, study) {
  let studyCodeName = study
  let numGroups = STUDIES[study]['groups']['number']
  let studyName = STUDIES[study]['name'] || "<insert study name>"
  let studyWebsite = STUDIES[study]['website'] || "<insert website>"
  doc.getBody().appendParagraph(`${studyCodeName}:`);
  // Create the group-specific sections of the doc
  // Group number starts from zero, see the config.gs for the mapping.
  for (let groupIndex = 0; groupIndex < numGroups; groupIndex++) {
    const groupCodeName = groupIndexMapping[groupIndex]; // The value in the object groupIndexMapping is string.
    const signupSubject = `${studyName} Signup`;
    const signupBody = `Thank you for signing up for the ${studyName}. The study will take around an hour to complete each session, and you are expected to complete ${getGroupSessionsWGroupNum(study, groupIndex)} sessions spaced ${DAYS_INTERVAL_TEXT} apart. If you miss the exact start time, the link will still be available. Please make sure you are able to do the sessions at and around the time selected in the form; if you miss a session after reminder email sent, your participation will be terminated. You will get an email for the first session on <session_start_time>.`;
    //Please click the link marked informed consent below to complete the study on the allotted date based on your calendar invite.
    doc.getBody().appendParagraph(`${groupCodeName}: (Signup email. ID attached from script) -`);
    doc.getBody().appendParagraph(`Subject: ${signupSubject}`);
    doc.getBody().appendParagraph(`Body: ${signupBody}`);
    doc.getBody().appendParagraph("");
  }

  // Create the non-group-specific sections of the doc
  // This is the email for first session and pre-study survey email 
  const firstSessionSubject = ` ${studyName} First Session and Pre-study Survey for Participant <participant_id>`;
  const firstSessionBody = ` You can access session <Number> starting from <session_start_time>. You have until <due_date_session> to complete this session. Please perform the experiment between the valid hours. Use the link below to complete the informed consent and pre-study survey. After you complete the survey, you will be automatically redirected to the tutorial and first session.`;


  // This is now the reminder email if the participant did not start the session yet 
  const missedSessionSubject = ` Reminder: ${studyName} Session <Number> out of <TotalNumber> Due in 24 Hours for Participant <participant_id>`;
  const missedSessionBody = `This is a reminder that your experiment for session  <Number> out of <TotalNumber> is due in 24 hours. To continue in the study, you will need to complete this session; otherwise, your participation will become invalid. You have earned $<gift_amount_perceived> so far. Remember that you will earn $<total_amount_gift_card> for completing <TotalNumber> sessions in total ($<gift_card_amount_per_session> per session + $<gift_card_amount_after_completion> after the completion of the study).`;

  // Email for next session
  const nextSessionSubject = `${studyName} Next Session <Number> out of <TotalNumber> for Participant <participant_id>`;
  const nextSessionBody = `You can now access session <Number>. You have until <due_date_session> to complete this session. Please perform the experiment between the valid hours. If the calendar invite shows a time that falls within night hours, please note that you will not be able to enter at that time. Instead, complete the session at the nearest available time within allowed hours.`;

  // Email after completing a session
  const completedSessionSubject = `${studyName} Session <Number> out of <TotalNumber> Completed for Participant <participant_id>`;
  const completedSessionBody = `Thanks for completing session <Number> out of <TotalNumber>! Your data is saved. You can access the next session starting from <session_start_time> to <due_date_session> through the provided link. Please perform experiment between the valid hours. You have earned $<gift_amount_perceived> so far. You will earn $<total_amount_gift_card> for completing <TotalNumber> sessions in total ($<gift_card_amount_per_session> per session + $<gift_card_amount_after_completion> after the completion of the study).`;

  // Email for incompleted session
  const partiallyCompletedSubject = `${studyName} Follow-Up: Incomplete Study Session <Number> out of <TotalNumber> for Participant <participant_id>`;
  const partiallyCompletedBody = `Your last session was incomplete and your data was not saved. You have until <due_date_session> to finish this session. To continue in the study, you will need to complete this session; otherwise, your participation will become invalid. You have earned $<gift_amount_perceived> so far. You will earn $<total_amount_gift_card> for completing <TotalNumber> sessions in total ($<gift_card_amount_per_session> per session + $<gift_card_amount_after_completion> after the completion of the study).`;

  // Email for the grace period after some session
  const gracePeriodSubject = `${studyName} Last Chance to Complete Session <Number> for Participant <participant_id>!`;
  const gracePeriodSessionBody = `If you can complete the session <Number> within the next <grace_days_hours> hours, you will be able to continue your participation in the study. This is your Last Chance to stay involved to the study! You have earned $<gift_amount_perceived> so far. You will earn $<total_amount_gift_card> for completing <TotalNumber> sessions in total ($<gift_card_amount_per_session> per session + $<gift_card_amount_after_completion> after the completion of the study).`;

   // Email for the grace period after some session
  const gracePeriodReminderSubject = `Reminder: ${studyName} Grace Period for Session <Number> out of <TotalNumber> Due in 24 Hours for Participant <participant_id>`;
  const gracePeriodReminderBody = `This is a reminder that your grace period for session <Number> out of <TotalNumber> is due in 24 hours. To continue in the study, you must complete this session; otherwise, your participation will become invalid. You have earned $<gift_amount_perceived> so far. Remember that you will earn $<total_amount_gift_card> for completing all <TotalNumber> sessions ($<gift_card_amount_per_session> per session + $<gift_card_amount_after_completion> after the completion of the study).`;

  const finalSessionSubject = `${studyName} Final Session Completed for Participant <participant_id>`;
  const finalSessionBody = `Thank you for participating in this study!`;

  const invalidSubject = `${studyName} Invalidity for Participant <participant_id>`;
  const invalidBody = `Your study participation has been deemed invalid because you have not completed session <Number>/<TotalNumber> on time.`;

  const invalidRegistrationHoursSubject = `${studyName}: First Session Adjusted to Closest Available Time`;
  const invalidRegistrationHoursBody = `Thank you for registering for our study! The selected start time for your first session was outside the allowed hours. To ensure your participation, your start time has been automatically adjusted to the closest available time within the allowed range. Please check your updated registration details provided in Sign-up email. Please note that you have a flexible window of 2 days, starting from the assigned time, to complete your first session at your convenience.`;

  const invalidEmailDomainSubject = `${studyName}: Registration Unsuccessful`;
  const invalidEmailDomainBody = `Your registration was unsuccessful because the provided email is not a valid institutional email (e.g, axb123@institution.edu).`;  // Note here.

  doc.getBody().appendParagraph(`ff$: (Email for First Session. <Number> out of <TotalNumber> and ID attached from script) -`);
  doc.getBody().appendParagraph(`Subject: ${firstSessionSubject}`);
  doc.getBody().appendParagraph(`Body: ${firstSessionBody}`);
  doc.getBody().appendParagraph("");

  doc.getBody().appendParagraph(`any$: (Email after completing a session. <LastNumber> out of<TotalNumber> and ID attached from script) -`);
  doc.getBody().appendParagraph(`Subject: ${completedSessionSubject}`);
  doc.getBody().appendParagraph(`Body: ${completedSessionBody}`);
  doc.getBody().appendParagraph("");

  doc.getBody().appendParagraph(`nany$: (Email for next session. <Number> out of <TotalNumber> and ID attached from script) -`);
  doc.getBody().appendParagraph(`Subject: ${nextSessionSubject}`);
  doc.getBody().appendParagraph(`Body: ${nextSessionBody}`);
  doc.getBody().appendParagraph("");
  
  doc.getBody().appendParagraph(`xany$: (Email after not completing a session (Reminder for due in 24 hours). <Number> out of <TotalNumber> and <DaysExtra> filled in from script and ID attached from script) -`);
  doc.getBody().appendParagraph(`Subject: ${missedSessionSubject}`);
  doc.getBody().appendParagraph(`Body: ${missedSessionBody}`);
  doc.getBody().appendParagraph("");

  doc.getBody().appendParagraph(`pc$: (Email for partially completed but left like that <Number> out of <TotalNumber> and <DaysExtra> filled in from script and ID attached from script) -`);
  doc.getBody().appendParagraph(`Subject: ${partiallyCompletedSubject}`);
  doc.getBody().appendParagraph(`Body: ${partiallyCompletedBody}`);
  doc.getBody().appendParagraph("");

  doc.getBody().appendParagraph(`gp$: (Email for grace period given to participants) -`);
  doc.getBody().appendParagraph(`Subject: ${gracePeriodSubject}`);
  doc.getBody().appendParagraph(`Body: ${gracePeriodSessionBody}`);
  doc.getBody().appendParagraph("");

  doc.getBody().appendParagraph(`remgp$: (Email for reminder of grace period given to participants) -`);
  doc.getBody().appendParagraph(`Subject: ${gracePeriodReminderSubject}`);
  doc.getBody().appendParagraph(`Body: ${gracePeriodReminderBody}`);
  doc.getBody().appendParagraph("");

  doc.getBody().appendParagraph(`final$: (Email after completing the final session. Gift card attached from script) -`);
  doc.getBody().appendParagraph(`Subject: ${finalSessionSubject}`);
  doc.getBody().appendParagraph(`Body: ${finalSessionBody}`);
  doc.getBody().appendParagraph("");
  
  doc.getBody().appendParagraph(`xx$: (Email when subject is invalid) -`);
  doc.getBody().appendParagraph(`Subject: ${invalidSubject}`);
  doc.getBody().appendParagraph(`Body: ${invalidBody}`);
  doc.getBody().appendParagraph("");

  doc.getBody().appendParagraph(`failtime$: (Email when registration failed due to selected hours for the first session) -`);
  doc.getBody().appendParagraph(`Subject: ${invalidRegistrationHoursSubject}`);
  doc.getBody().appendParagraph(`Body: ${invalidRegistrationHoursBody}`);
  doc.getBody().appendParagraph("");

  doc.getBody().appendParagraph(`failemail$: (Email when registration failed due to invalid email domain) -`);
  doc.getBody().appendParagraph(`Subject: ${invalidEmailDomainSubject}`);
  doc.getBody().appendParagraph(`Body: ${invalidEmailDomainBody}`);
  doc.getBody().appendParagraph("");
}

