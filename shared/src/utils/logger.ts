export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: any;
}

export class Logger {
  constructor(private context: string) {}

  private log(level: LogLevel, message: string, data?: any): void {
    const entry: LogEntry = {
      level,
      message: `[${this.context}] ${message}`,
      timestamp: new Date().toISOString(),
      data: this.sanitizeData(data),
    };

    // Write to stderr to avoid interfering with MCP stdio communication
    console.error(JSON.stringify(entry));
  }

  private sanitizeData(data: any): any {
    if (!data) return undefined;

    // Deep clone to avoid modifying original
    const cloned = JSON.parse(JSON.stringify(data));

    // Mask sensitive fields
    const sensitiveKeys = [
      'password',
      'token',
      'apiKey',
      'api_key',
      'apiToken',
      'api_token',
      'authorization',
      'secret',
    ];

    const maskValue = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) return obj;

      for (const key in obj) {
        if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk))) {
          if (typeof obj[key] === 'string') {
            obj[key] = this.maskSecret(obj[key]);
          }
        } else if (typeof obj[key] === 'object') {
          obj[key] = maskValue(obj[key]);
        }
      }
      return obj;
    };

    return maskValue(cloned);
  }

  private maskSecret(value: string): string {
    if (!value || value.length < 4) return '***';
    return value.slice(0, 4) + '*'.repeat(Math.min(value.length - 4, 20));
  }

  debug(message: string, data?: any): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: any): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: any): void {
    this.log('warn', message, data);
  }

  error(message: string, error?: Error | any): void {
    this.log('error', message, {
      error: error?.message || error,
      stack: error?.stack,
    });
  }
}

