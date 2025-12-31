const { BlobServiceClient } = require('@azure/storage-blob');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Load Azure configuration
const azureConfigPath = path.join(__dirname, 'config', 'azure.yaml');
let azureConfig = null;
let blobServiceClient = null;
let containerClient = null;

try {
  azureConfig = yaml.load(fs.readFileSync(azureConfigPath, 'utf8'));
  
  if (azureConfig.enabled) {
    // Initialize Azure Blob Service Client
    if (azureConfig.connectionString) {
      // Option 1: Using connection string
      blobServiceClient = BlobServiceClient.fromConnectionString(azureConfig.connectionString);
    } else if (azureConfig.storageAccountName && azureConfig.sasToken) {
      // Option 2: Using SAS token
      const accountUrl = `https://${azureConfig.storageAccountName}.blob.core.windows.net`;
      const sasToken = azureConfig.sasToken.startsWith('?') 
        ? azureConfig.sasToken 
        : `?${azureConfig.sasToken}`;
      blobServiceClient = new BlobServiceClient(`${accountUrl}${sasToken}`);
    } else {
      throw new Error('Azure configuration incomplete: provide either connectionString or (storageAccountName + sasToken)');
    }
    
    // Get container client
    containerClient = blobServiceClient.getContainerClient(azureConfig.containerName);
    console.log('✅ Azure Blob Storage initialized successfully');
  } else {
    console.log('ℹ️ Azure Blob Storage disabled - using local filesystem');
  }
} catch (error) {
  console.error('⚠️ Error loading Azure configuration:', error.message);
  console.log('ℹ️ Falling back to local filesystem');
}

/**
 * Check if Azure Blob Storage is enabled and properly configured
 */
function isAzureEnabled() {
  return azureConfig && azureConfig.enabled && containerClient !== null;
}

/**
 * Get the blob name for a user's gable info file
 * @param {string} userId - The user ID (e.g., "P21234b567c")
 * @returns {string} - The blob name (e.g., "P21234b567c_gable_info.json")
 */
function getBlobName(userId) {
  return `${userId}_gable.json`;
}

/**
 * Get the blob name for a user's experiment data file
 * @param {string} userId - The user ID (e.g., "P21234b567c")
 * @returns {string} - The blob name (e.g., "P21234b567c_data.json")
 */
function getExperimentDataBlobName(userId) {
  return `${userId}_data.json`;
}

/**
 * Read user info from Azure Blob Storage or local filesystem
 * @param {string} userId - The user ID
 * @param {string} experiment - The experiment name (for local fallback)
 * @returns {Promise<Object|null>} - The user info object or null if not found
 */
async function readUserInfo(userId, experiment = null) {
  if (isAzureEnabled()) {
    try {
      const blobName = getBlobName(userId);
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      
      // Check if blob exists
      const exists = await blockBlobClient.exists();
      if (!exists) {
        console.log(`Blob ${blobName} does not exist`);
        return null;
      }
      
      // Download blob content
      const downloadResponse = await blockBlobClient.download(0);
      const downloadedContent = await streamToString(downloadResponse.readableStreamBody);
      
      return JSON.parse(downloadedContent);
    } catch (error) {
      console.error(`Error reading user info from Azure for ${userId}:`, error.message);
      return null;
    }
  } else {
    // Fallback to local filesystem
    if (!experiment) {
      console.error('Experiment parameter required for local filesystem fallback');
      return null;
    }
    
    try {
      const USERS_DIR = path.join(__dirname, 'users');
      const normalizedExperiment = experiment.toLowerCase();
      const infoDir = path.join(USERS_DIR, normalizedExperiment, 'info');
      const filePath = path.join(infoDir, `${userId}_${normalizedExperiment}_info.json`);
      
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
      }
      return null;
    } catch (error) {
      console.error(`Error reading user info locally for ${userId}:`, error.message);
      return null;
    }
  }
}

/**
 * Write user info to Azure Blob Storage or local filesystem
 * @param {string} userId - The user ID
 * @param {Object} data - The user info data to write
 * @param {string} experiment - The experiment name (for local fallback)
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
async function writeUserInfo(userId, data, experiment = null) {
  if (isAzureEnabled()) {
    try {
      const blobName = getBlobName(userId);
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      
      // Convert data to JSON string
      const content = JSON.stringify(data, null, 2);
      
      // Upload to Azure Blob Storage
      await blockBlobClient.upload(content, content.length, {
        blobHTTPHeaders: {
          blobContentType: 'application/json'
        }
      });
      
      console.log(`✅ Successfully uploaded ${blobName} to Azure Blob Storage`);
      return true;
    } catch (error) {
      console.error(`Error writing user info to Azure for ${userId}:`, error.message);
      return false;
    }
  } else {
    // Fallback to local filesystem
    if (!experiment) {
      console.error('Experiment parameter required for local filesystem fallback');
      return false;
    }
    
    try {
      const USERS_DIR = path.join(__dirname, 'users');
      const normalizedExperiment = experiment.toLowerCase();
      const infoDir = path.join(USERS_DIR, normalizedExperiment, 'info');
      const filePath = path.join(infoDir, `${userId}_${normalizedExperiment}_info.json`);
      
      // Ensure directory exists
      if (!fs.existsSync(infoDir)) {
        fs.mkdirSync(infoDir, { recursive: true });
      }
      
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      return true;
    } catch (error) {
      console.error(`Error writing user info locally for ${userId}:`, error.message);
      return false;
    }
  }
}

/**
 * List all user info blobs (Azure only)
 * @returns {Promise<Array<string>>} - Array of user IDs
 */
async function listUserInfoBlobs() {
  if (!isAzureEnabled()) {
    console.log('Azure not enabled - cannot list blobs');
    return [];
  }
  
  try {
    const userIds = [];
    
    // List all blobs in the container
    for await (const blob of containerClient.listBlobsFlat()) {
      // Extract user ID from blob name (e.g., "P21234b567c_gable_info.json" -> "P21234b567c")
      if (blob.name.endsWith('_gable.json')) {
        const userId = blob.name.replace('_gable.json', '');
        userIds.push(userId);
      }
    }
    
    return userIds;
  } catch (error) {
    console.error('Error listing user info blobs:', error.message);
    return [];
  }
}

/**
 * Delete a user info blob (Azure only)
 * @param {string} userId - The user ID
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
async function deleteUserInfo(userId) {
  if (!isAzureEnabled()) {
    console.log('Azure not enabled - cannot delete blob');
    return false;
  }
  
  try {
    const blobName = getBlobName(userId);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    
    await blockBlobClient.deleteIfExists();
    console.log(`✅ Successfully deleted ${blobName} from Azure Blob Storage`);
    return true;
  } catch (error) {
    console.error(`Error deleting user info from Azure for ${userId}:`, error.message);
    return false;
  }
}

/**
 * Helper function to convert a readable stream to a string
 */
async function streamToString(readableStream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readableStream.on('data', (data) => {
      chunks.push(data.toString());
    });
    readableStream.on('end', () => {
      resolve(chunks.join(''));
    });
    readableStream.on('error', reject);
  });
}

/**
 * Read experiment data from Azure Blob Storage or local filesystem
 * @param {string} userId - The user ID
 * @param {string} experiment - The experiment name (for local fallback)
 * @returns {Promise<Object|null>} - The experiment data object or null if not found
 */
async function readExperimentData(userId, experiment = null) {
  if (isAzureEnabled()) {
    try {
      const blobName = getExperimentDataBlobName(userId);
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      
      // Check if blob exists
      const exists = await blockBlobClient.exists();
      if (!exists) {
        console.log(`Experiment data blob ${blobName} does not exist`);
        return null;
      }
      
      // Download blob content
      const downloadResponse = await blockBlobClient.download(0);
      const downloadedContent = await streamToString(downloadResponse.readableStreamBody);
      
      return JSON.parse(downloadedContent);
    } catch (error) {
      console.error(`Error reading experiment data from Azure for ${userId}:`, error.message);
      return null;
    }
  } else {
    // Fallback to local filesystem
    if (!experiment) {
      console.error('Experiment parameter required for local filesystem fallback');
      return null;
    }
    
    try {
      const USERS_DIR = path.join(__dirname, 'users');
      const normalizedExperiment = experiment.toLowerCase();
      const infoDir = path.join(USERS_DIR, normalizedExperiment, 'info');
      const filePath = path.join(infoDir, `${userId}_${normalizedExperiment}_data.json`);
      
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
      }
      return null;
    } catch (error) {
      console.error(`Error reading experiment data locally for ${userId}:`, error.message);
      return null;
    }
  }
}

/**
 * Write experiment data to Azure Blob Storage or local filesystem
 * @param {string} userId - The user ID
 * @param {Object} data - The experiment data to write
 * @param {string} experiment - The experiment name (for local fallback)
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
async function writeExperimentData(userId, data, experiment = null) {
  if (isAzureEnabled()) {
    try {
      const blobName = getExperimentDataBlobName(userId);
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      
      // Convert data to JSON string
      const content = JSON.stringify(data, null, 2);
      
      // Upload to Azure Blob Storage
      await blockBlobClient.upload(content, content.length, {
        blobHTTPHeaders: {
          blobContentType: 'application/json'
        }
      });
      
      console.log(`✅ Successfully uploaded ${blobName} to Azure Blob Storage`);
      return true;
    } catch (error) {
      console.error(`Error writing experiment data to Azure for ${userId}:`, error.message);
      return false;
    }
  } else {
    // Fallback to local filesystem
    if (!experiment) {
      console.error('Experiment parameter required for local filesystem fallback');
      return false;
    }
    
    try {
      const USERS_DIR = path.join(__dirname, 'users');
      const normalizedExperiment = experiment.toLowerCase();
      const infoDir = path.join(USERS_DIR, normalizedExperiment, 'info');
      const filePath = path.join(infoDir, `${userId}_${normalizedExperiment}_data.json`);
      
      // Ensure directory exists
      if (!fs.existsSync(infoDir)) {
        fs.mkdirSync(infoDir, { recursive: true });
      }
      
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      return true;
    } catch (error) {
      console.error(`Error writing experiment data locally for ${userId}:`, error.message);
      return false;
    }
  }
}

module.exports = {
  isAzureEnabled,
  readUserInfo,
  writeUserInfo,
  listUserInfoBlobs,
  deleteUserInfo,
  getBlobName,
  readExperimentData,
  writeExperimentData,
  getExperimentDataBlobName
};
