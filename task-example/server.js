const express = require("express");
const bcrypt = require("bcrypt");
const session = require("express-session");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
const azureBlobService = require("./azureBlobService");

// Initialize Logger
const Logger = require("./logger");
const log = new Logger('DEBUG');

// ⭕⌛️ Time travel to a specific date for testing
const { mockDateFromFile, restoreDate } = require('./mock-date');
const mockDateFilePath = path.join(__dirname, 'mock-date.txt');

// Load app configuration
const appConfigPath = path.join(__dirname, 'config', 'app.yaml');
const appConfig = yaml.load(fs.readFileSync(appConfigPath, 'utf8'));

// Enable mock date only if configured
if (appConfig.useMockDate) {
    mockDateFromFile(mockDateFilePath);
    console.log('🕰️ Mock date enabled - using simulated time from mock-date.txt');
} else {
    console.log('⏰ Mock date disabled - using real system time');
}

const app = express();
const PORT = 3000;
const USERS_DIR = path.join(__dirname, 'users');
const CONFIG_DIR = path.join(__dirname, 'config');
const VALID_EXPERIMENTS = ['strobe'];

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// Session configuration
// When using mock dates, we need to handle cookies differently
const sessionConfig = {
  secret:
    process.env.SESSION_SECRET || "your-secret-key-change-in-production",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false, // Set to true in production with HTTPS
  },
};

// If mock date is disabled, use maxAge for cookies
// If enabled, don't use maxAge to avoid session expiration issues with past dates
if (!appConfig.useMockDate) {
  sessionConfig.cookie.maxAge = 24 * 60 * 60 * 1000; // 24 hours
}

app.use(session(sessionConfig));

// Ensure users directory exists
if (!fs.existsSync(USERS_DIR)) {
  fs.mkdirSync(USERS_DIR, { recursive: true });
}

// Ensure experiment-specific info directories exist
VALID_EXPERIMENTS.forEach((experiment) => {
  const experimentDir = path.join(USERS_DIR, experiment);
  const infoDir = path.join(experimentDir, "info");

  if (!fs.existsSync(experimentDir)) {
    fs.mkdirSync(experimentDir, { recursive: true });
  }
  if (!fs.existsSync(infoDir)) {
    fs.mkdirSync(infoDir, { recursive: true });
  }
});

// Helper function to get user file path for an experiment
function getUserFilePath(experiment) {
  const normalizedExperiment = experiment.toLowerCase();

  if (!VALID_EXPERIMENTS.includes(normalizedExperiment)) {
    throw new Error("Invalid experiment name");
  }

  return path.join(USERS_DIR, `${normalizedExperiment}.json`);
}

// Helper function to get user info file path
function getUserInfoFilePath(userId, experiment) {
  const normalizedExperiment = experiment.toLowerCase();

  if (!VALID_EXPERIMENTS.includes(normalizedExperiment)) {
    throw new Error("Invalid experiment name");
  }

  const infoDir = path.join(USERS_DIR, normalizedExperiment, "info");
  return path.join(infoDir, `${userId}_${normalizedExperiment}_info.json`);
}

// Helper function to read user info data
async function readUserInfo(userId, experiment) {
  try {
    return await azureBlobService.readUserInfo(userId, experiment);
  } catch (error) {
    console.error(
      `Error reading user info for ${userId} in ${experiment}:`,
      error
    );
    return null;
  }
}

// Helper function to write user info data
async function writeUserInfo(userId, experiment, data) {
  try {
    return await azureBlobService.writeUserInfo(userId, data, experiment);
  } catch (error) {
    console.error(
      `Error writing user info for ${userId} in ${experiment}:`,
      error
    );
    return false;
  }
}

// Helper function to read experiment data file
async function readExperimentData(userId, experiment) {
  try {
    return await azureBlobService.readExperimentData(userId, experiment);
  } catch (error) {
    console.error(
      `Error reading experiment data for ${userId} in ${experiment}:`,
      error
    );
    return null;
  }
}

// Helper function to write experiment data file
async function writeExperimentData(userId, experiment, data) {
  try {
    return await azureBlobService.writeExperimentData(userId, data, experiment);
  } catch (error) {
    console.error(
      `Error writing experiment data for ${userId} in ${experiment}:`,
      error
    );
    return false;
  }
}

// Initialize experiment data file if it doesn't exist
async function initializeExperimentData(userId, experiment) {
  const existingData = await readExperimentData(userId, experiment);
  if (!existingData) {
    const initialData = {
      userId: userId,
      experiment: experiment,
      createdAt: new Date().toISOString(),
      answers: {}
    };
    await writeExperimentData(userId, experiment, initialData);
    log.info(`Initialized experiment data file for ${userId}`);
    return initialData;
  }
  return existingData;
}

// Helper function to read experiment config
function readExperimentConfig(experiment) {
  try {
    const normalizedExperiment = experiment.toLowerCase();
    if (!VALID_EXPERIMENTS.includes(normalizedExperiment)) {
      throw new Error('Invalid experiment name');
    }
    
    const configPath = path.join(CONFIG_DIR, `${normalizedExperiment}.yaml`);
    if (fs.existsSync(configPath)) {
      const fileContents = fs.readFileSync(configPath, 'utf8');
      return yaml.load(fileContents);
    }
    return null;
  } catch (error) {
    console.error(`Error reading config for ${experiment}:`, error);
    return null;
  }
}

// Helper function to read user data for an experiment
function readData(experiment) {
  try {
    const filePath = getUserFilePath(experiment);
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf8");
      return JSON.parse(data);
    }
    return { users: [] };
  } catch (error) {
    console.error(`Error reading user data for ${experiment}:`, error);
    return { users: [] };
  }
}

// Helper function to write user data for an experiment
function writeData(experiment, data) {
  try {
    const filePath = getUserFilePath(experiment);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
    return true;
  } catch (error) {
    console.error(`Error writing user data for ${experiment}:`, error);
    return false;
  }
}

// Initialize user authentication files if they don't exist
VALID_EXPERIMENTS.forEach((experiment) => {
  const filePath = getUserFilePath(experiment);
  if (!fs.existsSync(filePath)) {
    writeData(experiment, { users: [] });
  }
});

// Routes

// Get experiment configuration
app.get("/api/experiment-config", (req, res) => {
  const experiment = req.query.experiment;
  
  if (!experiment) {
    return res.status(400).json({ error: 'Experiment parameter required' });
  }
  
  try {
    const config = readExperimentConfig(experiment);
    if (config) {
      res.json(config);
    } else {
      res.status(404).json({ error: 'Configuration not found' });
    }
  } catch (error) {
    console.error('Error fetching experiment config:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Check authentication status
app.get("/api/check-auth", async (req, res) => {
  const experiment = req.query.experiment;

  if (req.session.user && req.session.experiment) {
    // Verify the experiment matches the session
    if (experiment && req.session.experiment !== experiment) {
      return res.json({ authenticated: false });
    }
    
    // Read user info data
    const userInfo = await readUserInfo(req.session.user, req.session.experiment);
    
    res.json({
      authenticated: true,
      username: req.session.user,
      experiment: req.session.experiment,
      userInfo: userInfo,
    });
  } else {
    res.json({ authenticated: false });
  }
});

// Login route
app.post("/api/login", async (req, res) => {
  const { username, password, experiment } = req.body;
  log.info(`Login attempt - username: ${username}, experiment: ${experiment}`);

  if (!username || !password || !experiment) {
    log.warning(`Login failed - missing credentials: username=${!!username}, password=${!!password}, experiment=${!!experiment}`);
    return res
      .status(400)
      .json({ error: "Username, password, and experiment are required" });
  }

  try {
    // Simple password check - accept "1234" for everyone
    if (password !== "1234") {
      log.warning(`Login failed - invalid password for username: ${username}`);
      return res.status(401).json({ error: "Invalid username or password" });
    }

    // Check if user exists in Azure Blob Storage (or local fallback)
    log.debug(`Attempting to read user info for: ${username}, experiment: ${experiment}`);
    const userInfo = await readUserInfo(username, experiment);
    
    if (!userInfo) {
      log.error(`Login failed - user not found: ${username}, experiment: ${experiment}`);
      return res.status(401).json({ error: "User not found. Please contact the administrator." });
    }
    
    log.info(`User info loaded successfully for ${username}`);

    // Login successful
    req.session.user = username;
    req.session.experiment = experiment;

    // Check if previous session was completed and handle progression
    if (userInfo.sessionCompleted === true) {
      log.info(`Session completion flag detected for ${username} - current session: ${userInfo.sessionNumber}`);
      userInfo.sessionNumber = (userInfo.sessionNumber || 0) + 1;
      userInfo.trialNumber = 1;
      userInfo.sessionCompleted = false;  // Reset the flag
      log.info(`Advanced to sessionNumber: ${userInfo.sessionNumber}, trialNumber: 1`);
    }
    
    // Safety check: Ensure trialNumber is at least 1 (trials start at 1, not 0)
    if (userInfo.trialNumber === 0) {
      log.debug(`Initializing trialNumber from 0 to 1 for user ${username}`);
      userInfo.trialNumber = 1;
    }
    
    // Safety check: Ensure sessionNumber is at least 1 (sessions start at 1, not 0)
    if (userInfo.sessionNumber === 0) {
      log.debug(`Initializing sessionNumber from 0 to 1 for user ${username}`);
      userInfo.sessionNumber = 1;
    }
    
    // Append login data
    const loginEntry = {
      loginTime: new Date().toISOString(),
      sessionNumber: userInfo.sessionNumber,
      trialNumber: userInfo.trialNumber
    };
    log.info(`Login data: ${JSON.stringify(loginEntry)}`);
    
    // Append to loginData array
    if (!userInfo.loginData) {
      userInfo.loginData = [];
    }
    userInfo.loginData.push(loginEntry);
    
    // Save updated user info
    log.debug(`Saving updated user info for ${username}`);
    await writeUserInfo(username, experiment, userInfo);
    
    // Initialize experiment data file if it doesn't exist
    log.debug(`Checking/initializing experiment data file for ${username}`);
    await initializeExperimentData(username, experiment);
    
    log.info(`Login successful for ${username} in ${experiment}`);
    res.json({
      success: true,
      message: "Login successful",
      username: username,
      experiment: experiment,
    });
  } catch (error) {
    log.error(`Error during login: ${error.message}`);
    log.debug(`Login error stack: ${error.stack}`);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Helper function to save trial timing data
async function saveTrialTimingData(req, res, dataKey, actionName) {
  const { sessionNumber, trialNumber } = req.body;
  log.info(`[${actionName}] Request - user: ${req.session.user}, experiment: ${req.session.experiment}, session: ${sessionNumber}, trial: ${trialNumber}`);
  
  if (!req.session.user || !req.session.experiment) {
    log.warning(`[${actionName}] Failed - not authenticated`);
    return res.status(401).json({ error: "Not authenticated" });
  }
  
  // Check for null/undefined, but allow 0 as valid value
  if (sessionNumber === null || sessionNumber === undefined || trialNumber === null || trialNumber === undefined) {
    log.warning(`[${actionName}] Failed - missing parameters: sessionNumber=${sessionNumber}, trialNumber=${trialNumber}`);
    return res.status(400).json({ error: "sessionNumber and trialNumber are required" });
  }
  
  try {
    log.debug(`[${actionName}] Reading user info for ${req.session.user}`);
    const userInfo = await readUserInfo(req.session.user, req.session.experiment);
    if (!userInfo) {
      log.error(`[${actionName}] User info not found for ${req.session.user}`);
      return res.status(404).json({ error: "User info not found" });
    }
    log.debug(`[${actionName}] User info loaded successfully`);
    
    // Initialize data object if it doesn't exist
    if (!userInfo[dataKey]) {
      log.debug(`[${actionName}] Initializing ${dataKey} object`);
      userInfo[dataKey] = {};
    }
    
    // Create session key if it doesn't exist
    const sessionKey = `session_${sessionNumber}`;
    if (!userInfo[dataKey][sessionKey]) {
      log.debug(`[${actionName}] Creating new session key: ${sessionKey}`);
      userInfo[dataKey][sessionKey] = {};
    }
    
    // Save trial timing data
    const trialKey = `trial_${trialNumber}`;
    const timestamp = new Date().toISOString();
    userInfo[dataKey][sessionKey][trialKey] = timestamp;
    log.info(`[${actionName}] Saving timing data - ${sessionKey}.${trialKey}: ${timestamp}`);
    
    // If this is trial completion, also update lastTrialCompletedTime
    if (dataKey === 'trialCompletedTimesData') {
      userInfo.lastTrialCompletedTime = timestamp;
      log.debug(`[${actionName}] Updated lastTrialCompletedTime: ${timestamp}`);
    }
    
    // Save updated user info
    log.debug(`[${actionName}] Writing user info to storage`);
    const success = await writeUserInfo(req.session.user, req.session.experiment, userInfo);
    
    if (success) {
      log.info(`[${actionName}] Successfully saved - Trial ${trialNumber} ${actionName}`);
      res.json({ 
        success: true, 
        timestamp: timestamp,
        message: `Trial ${trialNumber} ${actionName}`
      });
    } else {
      log.error(`[${actionName}] Failed to write user info to storage`);
      res.status(500).json({ error: `Failed to save trial ${actionName} time` });
    }
  } catch (error) {
    log.error(`[${actionName}] Error: ${error.message}`);
    log.debug(`[${actionName}] Error stack: ${error.stack}`);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Save trial start time
app.post("/api/trial-start", async (req, res) => {
  await saveTrialTimingData(req, res, 'trialStartTimesData', 'started');
});

// Save trial complete time
app.post("/api/trial-complete", async (req, res) => {
  const { sessionNumber, trialNumber } = req.body;
  log.info(`=== TRIAL COMPLETE API Called === session: ${sessionNumber}, trial: ${trialNumber}`);
  
  if (!req.session.user || !req.session.experiment) {
    log.warning(`Trial completion failed - not authenticated`);
    return res.status(401).json({ error: "Not authenticated" });
  }
  
  try {
    // Step 1: Save the completion timing data
    log.debug(`Reading user info for trial completion`);
    const userInfo = await readUserInfo(req.session.user, req.session.experiment);
    if (!userInfo) {
      log.error(`User info not found for ${req.session.user}`);
      return res.status(404).json({ error: "User info not found" });
    }
    
    // Initialize data structures
    if (!userInfo.trialCompletedTimesData) {
      userInfo.trialCompletedTimesData = {};
    }
    const sessionKey = `session_${sessionNumber}`;
    if (!userInfo.trialCompletedTimesData[sessionKey]) {
      userInfo.trialCompletedTimesData[sessionKey] = {};
    }
    
    // Save completion time
    const trialKey = `trial_${trialNumber}`;
    const timestamp = new Date().toISOString();
    userInfo.trialCompletedTimesData[sessionKey][trialKey] = timestamp;
    userInfo.lastTrialCompletedTime = timestamp;
    log.info(`[completed] Saving timing data - ${sessionKey}.${trialKey}: ${timestamp}`);
    
    // Step 2: Increment trialNumber BEFORE sending response
    const nextTrialNumber = trialNumber + 1;
    userInfo.trialNumber = nextTrialNumber;
    log.info(`Incrementing trial number from ${trialNumber} to ${nextTrialNumber}`);
    
    // Step 3: Save everything at once
    log.debug(`Writing user info with updated trial number`);
    const success = await writeUserInfo(req.session.user, req.session.experiment, userInfo);
    
    if (success) {
      log.info(`Successfully saved trial ${trialNumber} completion and incremented to trial ${nextTrialNumber}`);
      res.json({ 
        success: true, 
        timestamp: timestamp,
        message: `Trial ${trialNumber} completed`
      });
    } else {
      log.error(`Failed to save trial completion data`);
      res.status(500).json({ error: "Failed to save trial completion" });
    }
  } catch (error) {
    log.error(`Error in trial-complete: ${error.message}`);
    log.debug(`Error stack: ${error.stack}`);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Save trial answer
app.post("/api/save-answer", async (req, res) => {
  const { sessionNumber, trialNumber, answer, reactionTime } = req.body;
  log.info(`=== SAVE ANSWER API Called === session: ${sessionNumber}, trial: ${trialNumber}, answer: ${answer}`);
  
  if (!req.session.user || !req.session.experiment) {
    log.warning(`Save answer failed - not authenticated`);
    return res.status(401).json({ error: "Not authenticated" });
  }
  
  try {
    // Read or initialize experiment data
    let experimentData = await readExperimentData(req.session.user, req.session.experiment);
    if (!experimentData) {
      experimentData = await initializeExperimentData(req.session.user, req.session.experiment);
    }
    
    // Initialize nested structure if needed
    if (!experimentData.answers) {
      experimentData.answers = {};
    }
    if (!experimentData.answers[sessionNumber]) {
      experimentData.answers[sessionNumber] = {};
    }
    
    // Save the answer with timestamp and reaction time
    experimentData.answers[sessionNumber][trialNumber] = {
      answer: answer,
      timestamp: new Date().toISOString(),
      reactionTime: reactionTime || null
    };
    
    // Update lastModified
    experimentData.lastModified = new Date().toISOString();
    
    // Write to storage
    const success = await writeExperimentData(req.session.user, req.session.experiment, experimentData);
    
    if (success) {
      log.info(`Successfully saved answer for session ${sessionNumber}, trial ${trialNumber}: ${answer}`);
      res.json({ 
        success: true,
        message: `Answer saved for trial ${trialNumber}`
      });
    } else {
      log.error(`Failed to save answer data`);
      res.status(500).json({ error: "Failed to save answer" });
    }
  } catch (error) {
    log.error(`Error in save-answer: ${error.message}`);
    log.debug(`Error stack: ${error.stack}`);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get experiment data for current user
app.get("/api/experiment-data", async (req, res) => {
  if (!req.session.user || !req.session.experiment) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  
  try {
    const experimentData = await readExperimentData(req.session.user, req.session.experiment);
    if (experimentData) {
      res.json(experimentData);
    } else {
      // Return empty structure if no data yet
      res.json({
        userId: req.session.user,
        experiment: req.session.experiment,
        answers: {}
      });
    }
  } catch (error) {
    log.error(`Error getting experiment data: ${error.message}`);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Complete session - increment sessionNumber and reset trialNumber
app.post("/api/complete-session", async (req, res) => {
  log.info(`=== COMPLETE SESSION API Called === user: ${req.session.user}`);
  if (!req.session.user || !req.session.experiment) {
    log.warning(`Session completion failed - not authenticated`);
    return res.status(401).json({ error: "Not authenticated" });
  }
  
  try {
    log.debug(`Reading user info for session completion`);
    const userInfo = await readUserInfo(req.session.user, req.session.experiment);
    if (!userInfo) {
      log.error(`User info not found for ${req.session.user}`);
      return res.status(404).json({ error: "User info not found" });
    }
    
    const currentsessionNumber = userInfo.sessionNumber;
    const timestamp = new Date().toISOString();
    
    // Initialize sessionCompletedTimes if it doesn't exist
    if (!userInfo.sessionCompletedTimes) {
      userInfo.sessionCompletedTimes = {};
    }
    
    // Save session completed time
    userInfo.sessionCompletedTimes[currentsessionNumber.toString()] = timestamp;
    
    // Also update lastSessionCompletedTime
    userInfo.lastSessionCompletedTime = timestamp;
    
    // Set the completion flag so next login will advance the session
    userInfo.sessionCompleted = true;
    log.debug(`Set sessionCompleted flag to true for next login`);
    
    // Save updated user info
    log.debug(`Writing updated user info with new session number`);
    const success = await writeUserInfo(req.session.user, req.session.experiment, userInfo);
    
    if (success) {
      log.info(`Session ${currentsessionNumber} completed at ${timestamp}. Moving to session ${userInfo.sessionNumber}`);
      res.json({ 
        success: true, 
        timestamp: timestamp,
        message: `Session ${currentsessionNumber} completed`,
        newsessionNumber: userInfo.sessionNumber
      });
    } else {
      log.error(`Failed to write session completion data`);
      res.status(500).json({ error: "Failed to complete session" });
    }
  } catch (error) {
    log.error(`Error completing session: ${error.message}`);
    log.debug(`Error stack: ${error.stack}`);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Start session - record session start time
app.post("/api/start-session", async (req, res) => {
  log.info(`=== START SESSION API Called === user: ${req.session.user}`);
  if (!req.session.user || !req.session.experiment) {
    log.warning(`Session start failed - not authenticated`);
    return res.status(401).json({ error: "Not authenticated" });
  }
  
  try {
    log.debug(`Reading user info for session start`);
    const userInfo = await readUserInfo(req.session.user, req.session.experiment);
    if (!userInfo) {
      log.error(`User info not found for ${req.session.user}`);
      return res.status(404).json({ error: "User info not found" });
    }
    
    const sessionNumber = userInfo.sessionNumber;
    const timestamp = new Date().toISOString();
    
    // Initialize sessionStartTimes if it doesn't exist
    if (!userInfo.sessionStartTimes) {
      userInfo.sessionStartTimes = {};
    }
    
    // Save session start time
    userInfo.sessionStartTimes[sessionNumber.toString()] = timestamp;
    
    // Save updated user info
    log.debug(`Writing session start time to storage`);
    const success = await writeUserInfo(req.session.user, req.session.experiment, userInfo);
    
    if (success) {
      log.info(`Session ${sessionNumber} started at ${timestamp}`);
      res.json({ 
        success: true, 
        timestamp: timestamp,
        message: `Session ${sessionNumber} started`
      });
    } else {
      log.error(`Failed to save session start time`);
      res.status(500).json({ error: "Failed to save session start time" });
    }
  } catch (error) {
    log.error(`Error starting session: ${error.message}`);
    log.debug(`Error stack: ${error.stack}`);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Flush user data
app.post("/api/flush-user", async (req, res) => {
  if (!req.session.user || !req.session.experiment) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  
  try {
    const userInfo = await readUserInfo(req.session.user, req.session.experiment);
    if (!userInfo) {
      return res.status(404).json({ error: "User info not found" });
    }
    
    // Clear the data fields and reset session/trial
    userInfo.loginData = [];
    userInfo.trialStartTimesData = {};
    userInfo.trialCompletedTimesData = {};
    userInfo.sessionNumber = 1;
    userInfo.trialNumber = 1;
    userInfo.sessionStartTimes = {};
    userInfo.sessionCompletedTimes = {};
    
    // Save updated user info
    const success = await writeUserInfo(req.session.user, req.session.experiment, userInfo);
    
    if (success) {
      console.log(`Flushed user data for ${req.session.user}`);
      res.json({ 
        success: true, 
        message: "User data flushed successfully"
      });
    } else {
      res.status(500).json({ error: "Failed to flush user data" });
    }
  } catch (error) {
    console.error("Error flushing user data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Logout route
app.post("/api/logout", (req, res) => {
  const experiment = req.body.experiment;
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
      return res.status(500).json({ error: "Error logging out" });
    }
    res.json({
      success: true,
      message: "Logout successful",
      experiment: experiment,
    });
  });
});

// API endpoint to serve mock time to frontend
app.get('/api/mock-time', (req, res) => {
    try {
        // Check if mock date is enabled
        if (!appConfig.useMockDate) {
            // Return real current time if mock date is disabled
            return res.json({ time: new Date().toISOString(), mockEnabled: false });
        }
        
        const mockDateFilePath = path.join(__dirname, 'mock-date.txt');
        const dateString = fs.readFileSync(mockDateFilePath, 'utf8').trim();
        
        if (!dateString) {
            // Return current time if file is empty
            return res.json({ time: new Date().toISOString(), mockEnabled: true });
        }
        
        const mockDate = new Date(dateString);
        if (isNaN(mockDate.getTime())) {
            return res.status(400).json({ error: 'Invalid date in mock-date.txt' });
        }
        
        res.json({ time: mockDate.toISOString(), mockEnabled: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to read mock date' });
    }
});

// Start server
app.listen(PORT, () => {
  log.info(`========================================`);
  log.info(`Server running on http://localhost:${PORT}`);
  log.info(`Logger initialized with level: DEBUG`);
  log.info(`========================================`);
});
