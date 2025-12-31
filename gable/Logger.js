class Logger {
  constructor(defaultLevel = 'INFO') {
    this.logLevel = defaultLevel;
    this.levels = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'];
  }

  log(level, message) {
    if (this.levels.indexOf(level) >= this.levels.indexOf(this.logLevel)) {
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
      }
      console.log(`${prefix} | ${message}`);
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


var log = new Logger('DEBUG');
