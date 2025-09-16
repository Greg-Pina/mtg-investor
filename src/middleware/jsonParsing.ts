import { Request, Response, NextFunction } from 'express';
import Ajv, { JSONSchemaType } from 'ajv';

// Base interface for JSON validation requests
export interface ValidatedRequest<T = any> extends Request {
  validatedData?: T;
}

export interface JsonValidationOptions {
  schema?: JSONSchemaType<any>;
  allowUnknown?: boolean;
  maxSize?: number;
}

export class JsonParsingMiddleware {
  private ajv: Ajv;

  constructor() {
    this.ajv = new Ajv({ allErrors: true });
  }

  /**
   * Middleware to validate JSON against a schema
   */
  public validateJson<T>(schema: JSONSchemaType<T>) {
    return (req: ValidatedRequest<T>, res: Response, next: NextFunction): void => {
      try {
        if (!req.body) {
          res.status(400).json({
            error: 'Request body is required',
            code: 'MISSING_BODY'
          });
          return;
        }

        const validate = this.ajv.compile(schema);
        const valid = validate(req.body);

        if (!valid) {
          res.status(400).json({
            error: 'JSON validation failed',
            code: 'VALIDATION_ERROR',
            details: validate.errors
          });
          return;
        }

        req.validatedData = req.body as T;
        next();
      } catch (error) {
        res.status(400).json({
          error: 'JSON validation error',
          code: 'VALIDATION_EXCEPTION',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    };
  }

  /**
   * Middleware to parse and validate JSON with size limits
   */
  public parseJsonWithLimits(options: JsonValidationOptions = {}) {
    const maxSize = options.maxSize || 1024 * 1024; // 1MB default

    return (req: Request, res: Response, next: NextFunction): void => {
      // Check content length
      const contentLength = parseInt(req.get('content-length') || '0', 10);
      if (contentLength > maxSize) {
        res.status(413).json({
          error: 'Request entity too large',
          code: 'PAYLOAD_TOO_LARGE',
          maxSize
        });
        return;
      }

      // Check content type
      if (!req.is('application/json')) {
        res.status(415).json({
          error: 'Content-Type must be application/json',
          code: 'UNSUPPORTED_MEDIA_TYPE'
        });
        return;
      }

      next();
    };
  }

  /**
   * Middleware to sanitize JSON data
   */
  public sanitizeJson() {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (req.body && typeof req.body === 'object') {
        req.body = this.sanitizeObject(req.body);
      }
      next();
    };
  }

  /**
   * Deep sanitize an object by removing potential security risks
   */
  private sanitizeObject(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Skip potentially dangerous keys
      if (key.startsWith('__') || key.includes('prototype')) {
        continue;
      }

      sanitized[key] = this.sanitizeObject(value);
    }

    return sanitized;
  }
}

// Create a singleton instance
export const jsonParsingMiddleware = new JsonParsingMiddleware();