import winston from 'winston';

export class Logger {
  private logger: winston.Logger;
  
  constructor(service: string) {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.printf(({ timestamp, level, message, service: svc, ...meta }) => {
          return JSON.stringify({
            timestamp,
            level,
            service: svc || service,
            message,
            ...meta
          });
        })
      ),
      defaultMeta: { service },
      transports: [
        // Console transport for Railway logs
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      ]
    });

    // Add file transport for local development
    if (process.env.NODE_ENV !== 'production') {
      this.logger.add(new winston.transports.File({ 
        filename: 'logs/builder-ai.log',
        maxsize: 10000000, // 10MB
        maxFiles: 5
      }));
    }
  }
  
  info(message: string, meta?: any) {
    this.logger.info(message, meta);
  }
  
  error(message: string, meta?: any) {
    this.logger.error(message, meta);
  }
  
  warn(message: string, meta?: any) {
    this.logger.warn(message, meta);
  }
  
  debug(message: string, meta?: any) {
    this.logger.debug(message, meta);
  }
}

