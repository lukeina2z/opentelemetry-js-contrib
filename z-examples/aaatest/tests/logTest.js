const pino = require("pino");

const winston = require("winston");

function otelLogTest() {
    const otelLogs = require("@opentelemetry/api-logs");
    const logger = otelLogs.logs.getLogger('xyxyxy-logger', '1.0.0');

    logger.emit({
        severityNumber: otelLogs.SeverityNumber.TRACE,
        severityText: 'TRACE',
        body: 'xyxyxy: OTel Log Test: log data'
    });

    logger.emit({
        severityNumber: otelLogs.SeverityNumber.INFO,
        severityText: 'INFO',
        body: 'xyxyxy: OTel Log Test: this is a log record body',
        attributes: { 'log.type': 'custom' },
    });
}

function directLogToConsole() {
    console.log(`xyxy: Direct Console Log: Conole log call makes log.`);
}

function pinoLogToConsole() {
    const logger = pino({
        level: process.env.LOG_LEVEL || 'debug',
        base: { service: 'my-lambda' },
        timestamp: pino.stdTimeFunctions.isoTime,
    });

    logger.info('xyxyxy: Pino: Function started');
    logger.debug('xyxyxy: Pino: Detailed debug info', { foo: 'bar' });
    logger.error(new Error('xyxyxy: Pino: Something failed'));
}

function winstonLogToConsole() {
    const logger = winston.createLogger({
        level: 'debug',
        format: winston.format.combine(
            winston.format.errors({ stack: true }), // Add this line
            winston.format.json()
        ),
        defaultMeta: { service: 'nodejs-lambda-fn-01' },
        transports: [
            new winston.transports.Console(), // <— must add this to log to stdout
        ],
    });

    logger.info('xyxyxy: Winston: Function started');
    logger.debug('xyxyxy: Winston: Detailed debug info', { foo: 'bar' });
    logger.error(new Error('xyxyxy: Winston: Something failed'));
}

function runConsoleLoggerTest() {
    directLogToConsole();
    pinoLogToConsole();
    winstonLogToConsole();
}

function runLoggerTest() {
    runConsoleLoggerTest();
    otelLogTest();
}

module.exports = runLoggerTest;

