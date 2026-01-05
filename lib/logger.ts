/**
 * Centralized logger module with levels (debug/info/warn/error)
 * Follows cursor rules for logging: debug only in dev, concise in production
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
}

class Logger {
  private isProduction: boolean;

  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  /**
   * Log debug messages (only visible in dev mode)
   */
  debug(message: string, context?: LogContext): void {
    if (!this.isProduction) {
      console.log(`[DEBUG] ${message}`, context ? JSON.stringify(context, null, 2) : '');
    }
  }

  /**
   * Log info messages
   */
  info(message: string, context?: LogContext): void {
    if (!this.isProduction) {
      console.log(`[INFO] ${message}`, context || '');
    } else {
      // In production, log only important info
      console.log(`[INFO] ${message}`);
    }
  }

  /**
   * Log warning messages
   */
  warn(message: string, context?: LogContext): void {
    console.warn(`[WARN] ${message}`, context || '');
  }

  /**
   * Log error messages
   * In production, sanitize stack traces for clients
   */
  error(message: string, context?: LogContext): void {
    const errorContext = context?.error;
    
    if (this.isProduction) {
      // In production, log sanitized error (no stack traces to clients)
      const sanitizedContext = { ...context };
      if (errorContext instanceof Error) {
        sanitizedContext.error = {
          message: errorContext.message,
          name: errorContext.name,
          // Don't include stack trace in production logs sent to clients
        };
      }
      console.error(`[ERROR] ${message}`, sanitizedContext);
    } else {
      // In dev, log full error with stack trace
      console.error(`[ERROR] ${message}`, context || '');
      if (errorContext instanceof Error) {
        console.error('Stack trace:', errorContext.stack);
      }
    }
  }
}

const logger = new Logger();
export default logger;

