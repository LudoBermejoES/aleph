import winston from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'
import { mkdirSync } from 'fs'
import { join } from 'path'

const LOG_DIR = join(process.cwd(), 'logs')
mkdirSync(LOG_DIR, { recursive: true })

const isProduction = process.env.NODE_ENV === 'production'
const logLevel = process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug')

const devFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : ''
    return `${timestamp} ${level}: ${message}${metaStr}`
  }),
)

const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
)

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: isProduction ? prodFormat : devFormat,
  }),
]

if (isProduction) {
  transports.push(
    new DailyRotateFile({
      filename: join(LOG_DIR, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '10m',
      maxFiles: '14d',
      format: prodFormat,
    }),
    new DailyRotateFile({
      filename: join(LOG_DIR, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '10m',
      maxFiles: '14d',
      format: prodFormat,
    }),
  )
}

winston.addColors({ http: 'magenta' })

export const logger = winston.createLogger({
  level: logLevel,
  levels: winston.config.npm.levels,
  transports,
})

// Audit logger: separate file, never rotated, structured JSON
export const auditLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.File({
      filename: join(LOG_DIR, 'audit.log'),
      maxsize: undefined, // no size limit
    }),
  ],
})

/**
 * Create a logger instance for testing (no file transports, captures to memory).
 */
export function createTestLogger(): winston.Logger {
  return winston.createLogger({
    level: 'debug',
    silent: true,
    transports: [new winston.transports.Console({ silent: true })],
  })
}
