class Logger {
    constructor(defaultLevel = 'INFO') {
        this.logLevel = defaultLevel;
        this.levels = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'];
    }

    getTimestamp() {
        const now = new Date();
        return now.toISOString().replace('T', ' ').split('.')[0]; // Format: YYYY-MM-DD HH:mm:ss
    }

    log(level, message) {
        if (this.levels.indexOf(level) >= this.levels.indexOf(this.logLevel)) {
            const timestamp = this.getTimestamp();
            let prefix;
            switch (level) {
                case 'DEBUG':
                    prefix = '🔵 [DEBUG]';
                    break;
                case 'INFO':
                    prefix = '🟢 [INFO]';
                    break;
                case 'WARNING':
                    prefix = '🟡 [WARNING]';
                    break;
                case 'ERROR':
                    prefix = '🔴 [ERROR]';
                    break;
                case 'CRITICAL':
                    prefix = '🔴 [CRITICAL]';
                    break;
                default:
                    prefix = '[UNKNOWN]';
            }
            console.log(`${timestamp} | ${prefix} | ${message}`);
        }
    }

    debug(message) {
        this.log('DEBUG', message);
    }

    info(message) {
        this.log('INFO', message);
    }

    warning(message) {
        this.log('WARNING', message);
    }

    error(message) {
        this.log('ERROR', message);
    }

    critical(message) {
        this.log('CRITICAL', message);
    }
}

module.exports = Logger;