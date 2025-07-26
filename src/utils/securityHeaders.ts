/**
 * Security headers and HTTPS enforcement utilities
 */

import { ErrorHandler } from './errorHandling';

/**
 * Security configuration options
 */
export interface SecurityConfig {
  enforceHTTPS: boolean;
  allowedHosts: string[];
  maxAge: number; // HSTS max age in seconds
  includeSubdomains: boolean;
  preload: boolean;
}

const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  enforceHTTPS: process.env.NODE_ENV === 'production',
  allowedHosts: ['localhost', '127.0.0.1', 'api.binance.com', 'testnet.binance.vision'],
  maxAge: 31536000, // 1 year
  includeSubdomains: true,
  preload: true,
};

/**
 * Security headers manager
 */
export class SecurityHeadersManager {
  private config: SecurityConfig;

  constructor(config: Partial<SecurityConfig> = {}) {
    this.config = { ...DEFAULT_SECURITY_CONFIG, ...config };
  }

  /**
   * Get recommended security headers
   */
  getSecurityHeaders(): Record<string, string> {
    return {
      // Strict Transport Security (HTTPS enforcement)
      'Strict-Transport-Security': this.getHSTSHeader(),
      
      // Content Type Options (prevent MIME sniffing)
      'X-Content-Type-Options': 'nosniff',
      
      // Frame Options (prevent clickjacking)
      'X-Frame-Options': 'DENY',
      
      // XSS Protection
      'X-XSS-Protection': '1; mode=block',
      
      // Referrer Policy
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      
      // Permissions Policy (formerly Feature Policy)
      'Permissions-Policy': this.getPermissionsPolicy(),
      
      // Cross-Origin Embedder Policy
      'Cross-Origin-Embedder-Policy': 'require-corp',
      
      // Cross-Origin Opener Policy
      'Cross-Origin-Opener-Policy': 'same-origin',
      
      // Cross-Origin Resource Policy
      'Cross-Origin-Resource-Policy': 'same-origin',
    };
  }

  /**
   * Validate URL security
   */
  validateURL(url: string): boolean {
    try {
      const urlObj = new URL(url);
      
      // Check protocol
      if (this.config.enforceHTTPS && urlObj.protocol !== 'https:' && urlObj.protocol !== 'wss:') {
        if (!this.isLocalhost(urlObj.hostname)) {
          throw new Error(`HTTPS required for external URLs: ${url}`);
        }
      }
      
      // Check allowed hosts
      if (!this.isAllowedHost(urlObj.hostname)) {
        throw new Error(`Host not allowed: ${urlObj.hostname}`);
      }
      
      return true;
    } catch (error) {
      ErrorHandler.handle(error, {
        showNotification: true,
        logToConsole: true,
      });
      return false;
    }
  }

  /**
   * Ensure URL uses HTTPS
   */
  enforceHTTPS(url: string): string {
    if (!this.config.enforceHTTPS) {
      return url;
    }

    try {
      const urlObj = new URL(url);
      
      // Skip if already secure or localhost
      if (urlObj.protocol === 'https:' || urlObj.protocol === 'wss:' || this.isLocalhost(urlObj.hostname)) {
        return url;
      }
      
      // Upgrade to HTTPS
      if (urlObj.protocol === 'http:') {
        urlObj.protocol = 'https:';
      } else if (urlObj.protocol === 'ws:') {
        urlObj.protocol = 'wss:';
      }
      
      return urlObj.toString();
    } catch (error) {
      ErrorHandler.handle(error, { showNotification: false });
      return url;
    }
  }

  /**
   * Create secure fetch wrapper
   */
  createSecureFetch() {
    return async (url: string, options: RequestInit = {}): Promise<Response> => {
      // Validate and secure the URL
      const secureURL = this.enforceHTTPS(url);
      
      if (!this.validateURL(secureURL)) {
        throw new Error(`Security validation failed for URL: ${url}`);
      }

      // Add security headers to request
      const secureOptions: RequestInit = {
        ...options,
        headers: {
          ...options.headers,
          ...this.getRequestSecurityHeaders(),
        },
      };

      try {
        const response = await fetch(secureURL, secureOptions);
        
        // Validate response security
        this.validateResponseHeaders(response);
        
        return response;
      } catch (error) {
        ErrorHandler.handle(error, {
          showNotification: true,
          logToConsole: true,
        });
        throw error;
      }
    };
  }

  /**
   * Create secure WebSocket wrapper
   */
  createSecureWebSocket(url: string, protocols?: string | string[]): WebSocket {
    const secureURL = this.enforceHTTPS(url);
    
    if (!this.validateURL(secureURL)) {
      throw new Error(`Security validation failed for WebSocket URL: ${url}`);
    }

    return new WebSocket(secureURL, protocols);
  }

  /**
   * Check if hostname is localhost
   */
  private isLocalhost(hostname: string): boolean {
    const localhostPatterns = ['localhost', '127.0.0.1', '::1'];
    return localhostPatterns.includes(hostname) || hostname.startsWith('192.168.') || hostname.startsWith('10.');
  }

  /**
   * Check if host is in allowed list
   */
  private isAllowedHost(hostname: string): boolean {
    return this.config.allowedHosts.some(allowedHost => {
      if (allowedHost.startsWith('*.')) {
        // Wildcard subdomain matching
        const domain = allowedHost.slice(2);
        return hostname === domain || hostname.endsWith('.' + domain);
      }
      return hostname === allowedHost;
    });
  }

  /**
   * Generate HSTS header value
   */
  private getHSTSHeader(): string {
    let header = `max-age=${this.config.maxAge}`;
    
    if (this.config.includeSubdomains) {
      header += '; includeSubDomains';
    }
    
    if (this.config.preload) {
      header += '; preload';
    }
    
    return header;
  }

  /**
   * Generate Permissions Policy header value
   */
  private getPermissionsPolicy(): string {
    const policies = [
      'accelerometer=()',
      'camera=()',
      'geolocation=()',
      'gyroscope=()',
      'magnetometer=()',
      'microphone=()',
      'payment=()',
      'usb=()',
    ];
    
    return policies.join(', ');
  }

  /**
   * Get security headers for outgoing requests
   */
  private getRequestSecurityHeaders(): Record<string, string> {
    return {
      'X-Requested-With': 'XMLHttpRequest',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
    };
  }

  /**
   * Validate response security headers
   */
  private validateResponseHeaders(response: Response): void {
    const headers = response.headers;
    
    // Check for security headers
    const securityHeaders = [
      'strict-transport-security',
      'x-content-type-options',
      'x-frame-options',
    ];
    
    for (const header of securityHeaders) {
      if (!headers.has(header)) {
        console.warn(`Missing security header: ${header}`);
      }
    }
    
    // Validate content type
    const contentType = headers.get('content-type');
    if (contentType && !this.isAllowedContentType(contentType)) {
      console.warn(`Potentially unsafe content type: ${contentType}`);
    }
  }

  /**
   * Check if content type is allowed
   */
  private isAllowedContentType(contentType: string): boolean {
    const allowedTypes = [
      'application/json',
      'application/javascript',
      'text/plain',
      'text/html',
      'text/css',
      'image/',
      'font/',
    ];
    
    return allowedTypes.some(type => contentType.toLowerCase().includes(type));
  }
}

// Global security manager instance
let globalSecurityManager: SecurityHeadersManager | null = null;

/**
 * Get or create global security manager
 */
export function getSecurityManager(): SecurityHeadersManager {
  if (!globalSecurityManager) {
    globalSecurityManager = new SecurityHeadersManager();
  }
  return globalSecurityManager;
}

/**
 * Initialize security management
 */
export function initializeSecurity(config?: Partial<SecurityConfig>): SecurityHeadersManager {
  globalSecurityManager = new SecurityHeadersManager(config);
  return globalSecurityManager;
}

/**
 * Secure fetch function using global security manager
 */
export const secureFetch = (() => {
  const manager = getSecurityManager();
  return manager.createSecureFetch();
})();

/**
 * Secure WebSocket constructor
 */
export const SecureWebSocket = (url: string, protocols?: string | string[]): WebSocket => {
  const manager = getSecurityManager();
  return manager.createSecureWebSocket(url, protocols);
};

/**
 * URL security validator
 */
export const validateURL = (url: string): boolean => {
  const manager = getSecurityManager();
  return manager.validateURL(url);
};

/**
 * HTTPS enforcer
 */
export const enforceHTTPS = (url: string): string => {
  const manager = getSecurityManager();
  return manager.enforceHTTPS(url);
};

// Export default security configuration
export { DEFAULT_SECURITY_CONFIG };

export default SecurityHeadersManager;