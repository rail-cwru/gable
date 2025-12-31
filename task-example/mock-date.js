const fs = require('fs');
const path = require('path');

function readMockDateFromFile(filePath) {
    try {
        const dateString = fs.readFileSync(filePath, 'utf8').trim();

        if (!dateString) {
            console.log("⌚ No mock date provided. Using the actual current date.");
            return new Date(); // Use the actual current date if the file is empty
        }

        const mockDate = new Date(dateString);
        if (isNaN(mockDate.getTime())) {
            throw new Error(`Invalid date string in file: ${dateString}`);
        }

        return mockDate;
    } catch (error) {
        console.error(`Failed to read mock date from file: ${error.message}`);
        process.exit(1); // Exit the app if the date can't be read
    }
}

function mockDateFromFile(filePath) {
    global.Date = class extends Date {
        constructor(...args) {
            // If no arguments are provided, read the date from the file
            if (args.length === 0) {
                super(readMockDateFromFile(filePath).getTime());
            } else {
                // Otherwise, use the default Date constructor behavior
                super(...args);
            }
        }

        static now() {
            // Read the date from the file for `Date.now()`
            return readMockDateFromFile(filePath).getTime();
        }
    };

    console.log(`🕰️ Time traveling enabled! Date will dynamically update from file: ${filePath}`);
}

function restoreDate() {
    global.Date = Date; // Reset to the original Date
}

module.exports = { mockDateFromFile, restoreDate };
