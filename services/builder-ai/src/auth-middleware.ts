import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { Logger } from './logger.js';

export interface AuthenticatedRequest extends Request {
  authenticated?: boolean;
  apiKeyId?: string;
}

export class APIAuthManager {
  private logger: Logger;
  private apiKeys: Map<string, { id: string; name: string; permissions: string[] }>;
  private rateLimits: Map<string, { requests: number; resetTime: number }>;
  private maxRequestsPerMinute: number;

  constructor() {
    this.logger = new Logger('APIAuthManager');
    this.apiKeys = new Map();
    this.rateLimits = new Map();
    this.maxRequestsPerMinute = 100;
    
    this.initializeAPIKeys();
  }

  private initializeAPIKeys(): void {
    // Load API keys from environment (use .env file keys)
    const masterKey = process.env.BUILDER_AI_MASTER_KEY || 'bai_secure_master_development_2025_v4';
    const internalKey = process.env.BUILDER_AI_INTERNAL_KEY || 'bai_internal_service_development_2025_v4';
    
    // Master key with full permissions
    this.apiKeys.set(masterKey, {
      id: 'master',
      name: 'Master API Key',
      permissions: ['*']
    });
    
    // Internal key for service-to-service communication
    this.apiKeys.set(internalKey, {
      id: 'internal',
      name: 'Internal Service Key',
      permissions: ['health', 'status', 'test-execution']
    });

    this.logger.info('API authentication initialized', {
      keysCount: this.apiKeys.size,
      masterKeyPrefix: masterKey.substring(0, 8) + '...',
      internalKeyPrefix: internalKey.substring(0, 8) + '...'
    });

    // Log keys for initial setup (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log('\n🔐 BUILDER-AI API KEYS (Development Only):');
      console.log(`Master Key: ${masterKey}`);
      console.log(`Internal Key: ${internalKey}`);
      console.log('Store these securely in your environment variables!\n');
    }
  }

  private generateSecureKey(): string {
    return `bai_${crypto.randomBytes(32).toString('hex')}`;
  }

  public authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    const apiKey = this.extractAPIKey(req);
    
    if (!apiKey) {
      this.logger.warn('API request without key', {
        ip: req.ip,
        path: req.path,
        userAgent: req.get('User-Agent')
      });
      
      res.status(401).json({
        error: 'API key required',
        message: 'Include API key in X-API-Key header or api_key query parameter'
      });
      return;
    }

    const keyInfo = this.apiKeys.get(apiKey);
    if (!keyInfo) {
      this.logger.warn('Invalid API key attempted', {
        keyPrefix: apiKey.substring(0, 8) + '...',
        ip: req.ip,
        path: req.path
      });
      
      res.status(401).json({
        error: 'Invalid API key',
        message: 'The provided API key is not valid'
      });
      return;
    }

    // Check rate limits
    if (!this.checkRateLimit(apiKey)) {
      this.logger.warn('Rate limit exceeded', {
        keyId: keyInfo.id,
        ip: req.ip,
        path: req.path
      });
      
      res.status(429).json({
        error: 'Rate limit exceeded',
        message: `Maximum ${this.maxRequestsPerMinute} requests per minute allowed`
      });
      return;
    }

    // Check permissions
    if (!this.checkPermissions(keyInfo, req.path)) {
      this.logger.warn('Insufficient permissions', {
        keyId: keyInfo.id,
        path: req.path,
        permissions: keyInfo.permissions
      });
      
      res.status(403).json({
        error: 'Insufficient permissions',
        message: 'Your API key does not have permission for this endpoint'
      });
      return;
    }

    // Record successful authentication
    this.recordRequest(apiKey);
    req.authenticated = true;
    req.apiKeyId = keyInfo.id;
    
    this.logger.info('API request authenticated', {
      keyId: keyInfo.id,
      path: req.path,
      method: req.method
    });

    next();
  }

  public authenticateOptional(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    const apiKey = this.extractAPIKey(req);
    
    if (apiKey) {
      const keyInfo = this.apiKeys.get(apiKey);
      if (keyInfo && this.checkRateLimit(apiKey)) {
        req.authenticated = true;
        req.apiKeyId = keyInfo.id;
        this.recordRequest(apiKey);
      }
    }
    
    next();
  }

  private extractAPIKey(req: Request): string | null {
    // Check X-API-Key header
    const headerKey = req.get('X-API-Key');
    if (headerKey) return headerKey;
    
    // Check Authorization header with Bearer token
    const authHeader = req.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    
    // Check query parameter (less secure, but convenient for testing)
    const queryKey = req.query.api_key as string;
    if (queryKey) return queryKey;
    
    return null;
  }

  private checkRateLimit(apiKey: string): boolean {
    const now = Date.now();
    const windowStart = now - 60000; // 1 minute window
    
    const rateLimitInfo = this.rateLimits.get(apiKey);
    
    if (!rateLimitInfo || rateLimitInfo.resetTime < windowStart) {
      // Reset or initialize rate limit
      this.rateLimits.set(apiKey, {
        requests: 1,
        resetTime: now
      });
      return true;
    }
    
    if (rateLimitInfo.requests >= this.maxRequestsPerMinute) {
      return false;
    }
    
    rateLimitInfo.requests++;
    return true;
  }

  private checkPermissions(keyInfo: { permissions: string[] }, path: string): boolean {
    // Master key has all permissions
    if (keyInfo.permissions.includes('*')) {
      return true;
    }
    
    // Check specific permissions
    for (const permission of keyInfo.permissions) {
      if (path.includes(permission)) {
        return true;
      }
    }
    
    // Public endpoints (no authentication required)
    const publicEndpoints = ['/health', '/'];
    if (publicEndpoints.includes(path)) {
      return true;
    }
    
    return false;
  }

  private recordRequest(apiKey: string): void {
    // Update rate limit counter
    const rateLimitInfo = this.rateLimits.get(apiKey);
    if (rateLimitInfo) {
      rateLimitInfo.requests++;
    }
  }

  public getAuthStatus(): any {
    return {
      totalKeys: this.apiKeys.size,
      rateLimitsActive: this.rateLimits.size,
      maxRequestsPerMinute: this.maxRequestsPerMinute,
      publicEndpoints: ['/health', '/']
    };
  }

  public addAPIKey(key: string, permissions: string[], name: string): void {
    this.apiKeys.set(key, {
      id: crypto.randomUUID(),
      name,
      permissions
    });
    
    this.logger.info('API key added', { name, permissions });
  }

  public revokeAPIKey(key: string): boolean {
    const removed = this.apiKeys.delete(key);
    if (removed) {
      this.rateLimits.delete(key);
      this.logger.info('API key revoked', { keyPrefix: key.substring(0, 8) + '...' });
    }
    return removed;
  }
}

// Create global instance
export const apiAuthManager = new APIAuthManager();

// Export middleware functions
export const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  apiAuthManager.authenticate(req, res, next);
};

export const optionalAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  apiAuthManager.authenticateOptional(req, res, next);
};
