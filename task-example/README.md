# Task Application - STROBE Experiment

A web-based experimental platform for running behavioral experiments with session and trial management.

## Overview

This application implements the STROBE (Stroop Task for Repeated Observation of Behavioral Effects) experiment with:
- Multi-session, multi-trial structure
- Dynamic experiment configuration via YAML
- Azure Blob Storage integration for data persistence
- Real-time progress tracking and data visualization
- jsPsych integration for stimulus presentation

## Features

- **Session Management**: Track multiple sessions with trial progression
- **Configurable Experiments**: Define trials, timing, and conditions in YAML
- **Data Collection**: Automatic storage of answers, reaction times, and timestamps
- **User Groups**: Support for experimental conditions (G0, G1, G2)
- **Phase-based Design**: Organize sessions into experimental phases
- **Azure Integration**: Cloud storage with local fallback support

## Integration with GABLE

To integrate with GABLE, please ensure you follow the steps outlined in the [main REAME](../README.md).

1. **Set up Google Sheet**: Create a Google Sheet following the GABLE main documentation to store participant metadata and experiment progress.

2. **Configure Google Form**: Use a Google Form linked to your Sheet for participant sign-up. Form responses automatically populate a new row with participant information.

3. **Verify Participant Registration**: After form submission, confirm the participant appears as a new row in your Google Sheet with their ID and assigned experimental group (G0, G1, or G2).

4. **Sync with Task App**: The GABLE integration reads participant data from the cloud storage to manage participants and track session progress across experiments.

<img src="screenshots/STROBE_AppsScript.png" alt="STROBE Apps Script" width="1000">


> **Note:** For detailed testing information and guidelines, refer to the Testing section in the README.md file located in the project root directory.

## Quick Start with Task Experiment

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure Azure storage (to test with cloud storage) in `config/azure.yaml` (see the [Azure Setup Guide](AZURE_SETUP.md) for details on this or use local storage for development).

3. Start the server:
   ```bash
   node server.js
   ```

4. Access at `http://localhost:3000`

## Configuration

- `config/strobe.yaml` - Experiment parameters
- `config/azure.yaml` - Azure Blob Storage settings
- `config/app.yaml` - Application settings

## Data Storage

- **User metadata**: `pID{userId}_gable.json`
- **Experiment data**: `pID{userId}_data.json`

## Default Password

All participants: `1234`

## Security Note

This is a research demonstration platform. The simplified authentication (password: "1234") is intentional for ease of participant access for testing purposes. For production use, implement proper authentication.