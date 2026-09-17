# Google Apps Script File Guide

The files in this directory are repository source files. Create a corresponding `.gs` file in the Apps Script project for each required `.js` file. For example, copy `config.js` into `config.gs`.

## Required Files

| Source file | Purpose | Researcher action |
|---|---|---|
| `config.js` | Study-wide settings | Configure before initialization |
| `main.js` | Forms, sheets, triggers, and initialization | Review the registration form and instructions |
| `docinit.js` | Participant email-template document | Customize the email templates |
| `Code.js` | Registration and session-management logic | Review the email-domain and timezone assumptions |
| `Calendar.js` | Calendar invitations and scheduling | Normally no changes |
| `generateUniqueIDs.js` | Participant IDs and group assignment | Normally no changes |
| `Logger.js` | Application logging | Normally no changes |
| `Updates.js` | Daily statistics and summary emails | Normally no changes |
| `Util.js` | Shared utilities and gift-card helpers | Normally no changes |
| `mockDate.js` | Current-time and simulated-time support | Normally no changes |

Despite its name, `mockDate.js` is required by the default setup because its `getCurrentDate()` function is also used during normal study operation.

## Storage Adapter

| Source file | Purpose | Researcher action |
|---|---|---|
| `azure.js` | Reads and writes participant state in Azure | Use for Azure or replace with another provider implementation |

A storage adapter is required. When replacing Azure, preserve the documented storage-function signatures so the rest of GABLE can continue using them.

## Optional Files

| Source file | Purpose | When to include |
|---|---|---|
| `python_api.js` | Administrative HTTP endpoint | Include when deploying the Administrative API |
| `clean.js` | Deletes generated forms, documents, sheets, and triggers | Include only when reset operations are needed |

`clean.js` performs destructive cleanup. Review its targets before running `runClean()`. It is also needed if the Administrative API will expose the `runClean` operation.
