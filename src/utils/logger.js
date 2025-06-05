import winston from 'winston';
import chalk from 'chalk';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../..');
const logsDir = join(projectRoot, 'logs');

// Ensure logs directory exists
if (!existsSync(logsDir)) {
    mkdirSync(logsDir, { recursive: true });
}

// Custom format for console output with colors
const consoleFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const ts = chalk.gray(timestamp);
        const lvl = {
            error: chalk.red.bold('ERROR'),
            warn: chalk.yellow.bold('WARN'),
            info: chalk.blue.bold('INFO'),
            debug: chalk.gray.bold('DEBUG')
        }[level] || level.toUpperCase();
        
        const msg = typeof message === 'object' ? JSON.stringify(message, null, 2) : message;
        const metaStr = Object.keys(meta).length ? chalk.gray(JSON.stringify(meta)) : '';
        
        return `${ts} | ${lvl} | ${msg} ${metaStr}`.trim();
    })
);

// Create the logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    transports: [
        // Console transport with colors
        new winston.transports.Console({
            format: consoleFormat
        }),
        
        // File transport for all logs
        new winston.transports.File({
            filename: join(logsDir, 'automation.log'),
            maxsize: 10 * 1024 * 1024, // 10MB
            maxFiles: 5,
            tailable: true
        }),
        
        // Separate file for errors
        new winston.transports.File({
            filename: join(logsDir, 'errors.log'),
            level: 'error',
            maxsize: 10 * 1024 * 1024, // 10MB
            maxFiles: 3,
            tailable: true
        })
    ]
});

// Add some helper methods for consistent formatting
logger.section = (title) => {
    const separator = '='.repeat(60);
    logger.info(separator);
    logger.info(`🚀 ${title.toUpperCase()}`);
    logger.info(separator);
};

logger.step = (message) => {
    logger.info(`📝 ${message}`);
};

logger.success = (message) => {
    logger.info(`✅ ${message}`);
};

logger.warning = (message) => {
    logger.warn(`⚠️ ${message}`);
};

logger.failure = (message) => {
    logger.error(`❌ ${message}`);
};

logger.spinner = (message) => {
    logger.info(`🔄 ${message}`);
};

// Export as default
export default logger; 