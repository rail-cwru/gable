# Azure Blob Storage Integration Setup Guide

## Overview
This application uses Azure Blob Storage for storing experiment data files:
- **User metadata**: `pID{userId}_gable.json` - Session/trial tracking managed by Apps Script
- **Experiment data**: `pID{userId}_data.json` - Trial answers and experiment-specific data

## Setup Instructions

### 1. Configure Azure Credentials

Edit the file [config/azure.yaml](config/azure.yaml) and fill in your Azure Storage details:

```yaml
# Storage account name
storageAccountName: "your-storage-account-name"

# Container name where data files are stored
containerName: "your-container-name"

# SAS Token (without the leading '?')
sasToken: "your-sas-token-here"

# Enable/disable Azure Blob Storage (set to false to use local filesystem for development)
enabled: true
```

### 2. Choose Authentication Method

**Option A: SAS Token (Recommended for testing)**
```yaml
storageAccountName: "mystorageaccount"
containerName: "gable-users"
sasToken: "sv=2021-06-08&ss=b&srt=sco&sp=rwdlac&se=2026-12-31T23:59:59Z&st=2025-01-01T00:00:00Z&spr=https&sig=..."
enabled: true
```

**Option B: Connection String**
```yaml
storageAccountName: "mystorageaccount"
containerName: "gable-users"
connectionString: "DefaultEndpointsProtocol=https;AccountName=mystorageaccount;AccountKey=yourkey;EndpointSuffix=core.windows.net"
enabled: true
```

### 3. File Naming Convention

When a user with ID `48c3228` logs in, the system will create/access:
- **Metadata**: `pID48c3228_gable.json` (managed by Apps Script)
- **Experiment data**: `pID48c3228_data.json` (trial answers, reaction times)

### 4. Local Development Mode

For local development/testing, you can disable Azure:
```yaml
enabled: false
```

This stores files locally in:
- `users/strobe/info/pID{userId}_strobe_info.json`
- `users/strobe/info/pID{userId}_strobe_data.json`

## How to Get Azure Credentials

### Create a Storage Account
1. Go to [Azure Portal](https://portal.azure.com)
2. Create a Storage Account or use an existing one
3. Note your **Storage Account Name**

### Create a Container
1. Navigate to your Storage Account
2. Go to "Containers" under "Data Storage"
3. Create a new container (e.g., `gable-users`)
4. Set the access level (usually "Private")
5. Note your **Container Name**

### Generate SAS Token
1. In your Storage Account, go to "Shared access signature"
2. Select permissions:
   - ✅ Read
   - ✅ Write
   - ✅ Delete
   - ✅ List
   - ✅ Add
   - ✅ Create
3. Set start and expiry dates
4. Click "Generate SAS and connection string"
5. Copy the **SAS token** (remove the leading `?` if present)

## Testing the Integration

### Test 1: Start the Server
```bash
npm start
```

You should see:
```
✅ Azure Blob Storage initialized successfully
Server running on http://localhost:3000
```

### Test 2: Check Existing User
The system will automatically read/write to Azure when users log in.

### Test 3: List All Users (Optional)
You can add this endpoint to [server.js](server.js):

```javascript
app.get('/api/list-users', async (req, res) => {
  try {
    const userIds = await azureBlobService.listUserInfoBlobs();
    res.json({ userIds });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## Troubleshooting

### Error: "Azure configuration incomplete"
- Make sure you've filled in either `connectionString` OR both `storageAccountName` + `sasToken`

### Error: "Blob does not exist"
- The data file hasn't been created yet in Azure
- Files are auto-created on first login
- Check file naming: `pID{userId}_gable.json` and `pID{userId}_data.json`

### Error: "Authentication failed"
- Verify your SAS token is valid and not expired
- Check that your SAS token has the correct permissions (Read, Write, List, etc.)
- Ensure there's no leading `?` in the `sasToken` field

### Falls back to local filesystem
- Check that `enabled: true` in [config/azure.yaml](config/azure.yaml)
- Verify there are no errors in the console when starting the server

## Data Structure

### Gable Metadata (`pID{userId}_gable.json`)
Managed by Apps Script, contains:
- User ID and group assignment
- Session and trial tracking
- Login history
- Session completion timestamps

### Experiment Data (`pID{userId}_data.json`)
Managed by this application, contains:
```json
{
  "userId": "P48c3228",
  "experiment": "strobe",
  "createdAt": "2025-12-26T...",
  "answers": {
    "1": {
      "1": {
        "answer": "Red",
        "timestamp": "2025-12-26T...",
        "reactionTime": 1234
      }
    }
  }
}
```

## Security Best Practices

1. **Never commit credentials to Git**
   - Add `config/azure.yaml` to `.gitignore`metadata file

3. **Rotate credentials regularly**
   - Regenerate SAS tokens periodically
   - Update the configuration file

4. **Use Azure Key Vault for production**
   - Store secrets in Azure Key Vault
   - Reference them in your application

## Additional Features

The `azureBlobService.js` module provides several utility functions such as:

- `readUserInfo(userId, experiment)` - Read user info file
- `writeUserInfo(userId, data, experiment)` - Write user info file
- `listUserInfoBlobs()` - List all user IDs
- `deleteUserInfo(userId)` - Delete user info file
- `isAzureEnabled()` - Check if Azure is enabled

You can use these in your routes as needed.
