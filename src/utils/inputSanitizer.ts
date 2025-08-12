/**
 * Comprehensive input sanitization utilities to prevent injection attacks
 */

import { ErrorHandler } from './errorHandling';

/**
 * Configuration for sanitization options
 */
interface SanitizationConfig {
  allowHTML: boolean;
  allowScripts: boolean;
  maxLength: number;
  allowedTags: string[];
  allowedAttributes: string[];
  stripWhitespace: boolean;
}

const DEFAULT_CONFIG: SanitizationConfig = {
  allowHTML: false,
  allowScripts: false,
  maxLength: 10000,
  allowedTags: [],
  allowedAttributes: [],
  stripWhitespace: true,
};

/**
 * Input sanitizer class for preventing injection attacks
 */
export class InputSanitizer {
  private config: SanitizationConfig;

  constructor(config: Partial<SanitizationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Sanitize general text input
   */
  sanitizeText(input: string): string {
    if (typeof input !== 'string') {
      return String(input);
    }

    let sanitized = input;

    // Length check
    if (sanitized.length > this.config.maxLength) {
      sanitized = sanitized.substring(0, this.config.maxLength);
    }

    // Remove null bytes and control characters
    sanitized = this.removeControlCharacters(sanitized);

    // HTML encoding if HTML not allowed
    if (!this.config.allowHTML) {
      sanitized = this.encodeHTML(sanitized);
    }

    // Script removal (always remove if not explicitly allowed)
    if (!this.config.allowScripts) {
      sanitized = this.removeScripts(sanitized);
    }

    // Whitespace handling
    if (this.config.stripWhitespace) {
      sanitized = sanitized.trim();
    }

    return sanitized;
  }

  /**
   * Sanitize HTML content (when HTML is allowed)
   */
  sanitizeHTML(input: string): string {
    if (!this.config.allowHTML) {
      return this.sanitizeText(input);
    }

    let sanitized = input;

    // Remove dangerous tags and attributes
    sanitized = this.removeDangerousTags(sanitized);
    sanitized = this.removeDangerousAttributes(sanitized);

    // Always remove scripts
    sanitized = this.removeScripts(sanitized);

    return sanitized;
  }

  /**
   * Sanitize SQL input to prevent SQL injection
   */
  sanitizeSQL(input: string): string {
    let sanitized = this.sanitizeText(input);

    // Remove SQL injection patterns
    const sqlPatterns = [
      /['";\\-]/gi,
      /(union|select|insert|update|delete|drop|create|alter|exec|execute)/gi,
      /(script|javascript|vbscript|onload|onerror|onclick)/gi,
    ];

    for (const pattern of sqlPatterns) {
      sanitized = sanitized.replace(pattern, '');
    }

    return sanitized;
  }

  /**
   * Sanitize email addresses
   */
  sanitizeEmail(email: string): string {
    const sanitized = this.sanitizeText(email);

    // Basic email validation and sanitization
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!emailPattern.test(sanitized)) {
      throw new Error('Invalid email format');
    }

    return sanitized.toLowerCase();
  }

  /**
   * Sanitize URLs
   */
  sanitizeURL(url: string): string {
    const sanitized = this.sanitizeText(url);

    // Remove dangerous protocols
    const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'about:'];
    const lowerURL = sanitized.toLowerCase();

    for (const protocol of dangerousProtocols) {
      if (lowerURL.startsWith(protocol)) {
        throw new Error(`Dangerous protocol detected: ${protocol}`);
      }
    }

    // Ensure HTTPS in production
    if (process.env.NODE_ENV === 'production' && sanitized.startsWith('http:')) {
      console.warn('HTTP URL detected in production, consider using HTTPS');
    }

    return sanitized;
  }

  /**
   * Sanitize file paths
   */
  sanitizeFilePath(path: string): string {
    let sanitized = this.sanitizeText(path);

    // Remove path traversal attempts
    const dangerousPatterns = [
      /\.\./g,
      /\0/g,
      /[<>:"|?*]/g,
      /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i, // Windows reserved names
    ];

    for (const pattern of dangerousPatterns) {
      sanitized = sanitized.replace(pattern, '');
    }

    // Normalize path separators
    sanitized = sanitized.replace(/[\\\/]+/g, '/');

    // Remove leading/trailing slashes and dots
    sanitized = sanitized.replace(/^[\/\.]+|[\/\.]+$/g, '');

    return sanitized;
  }

  /**
   * Sanitize numeric input
   */
  sanitizeNumber(
    input: string | number,
    options: {
      min?: number;
      max?: number;
      decimals?: number;
      allowNegative?: boolean;
    } = {}
  ): number {
    let value = typeof input === 'string' ? parseFloat(input) : input;

    if (isNaN(value) || !isFinite(value)) {
      throw new Error('Invalid numeric value');
    }

    // Check negative values
    if (!options.allowNegative && value < 0) {
      throw new Error('Negative values not allowed');
    }

    // Apply range limits
    if (options.min !== undefined && value < options.min) {
      value = options.min;
    }
    if (options.max !== undefined && value > options.max) {
      value = options.max;
    }

    // Round to specified decimal places
    if (options.decimals !== undefined) {
      value = Math.round(value * Math.pow(10, options.decimals)) / Math.pow(10, options.decimals);
    }

    return value;
  }

  /**
   * Sanitize JSON input
   */
  sanitizeJSON(input: string): any {
    try {
      // First sanitize the string
      const sanitized = this.sanitizeText(input);

      // Parse JSON
      const parsed = JSON.parse(sanitized);

      // Recursively sanitize object values
      return this.sanitizeObjectValues(parsed);
    } catch (error) {
      ErrorHandler.handle(error, { showNotification: false });
      throw new Error('Invalid JSON format');
    }
  }

  /**
   * Remove control characters except common whitespace
   */
  private removeControlCharacters(input: string): string {
    // Allow tab, newline, carriage return, and space
    return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  }

  /**
   * HTML encode special characters
   */
  private encodeHTML(input: string): string {
    const htmlEntities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;',
    };

    return input.replace(/[&<>"'/]/g, char => htmlEntities[char] || char);
  }

  /**
   * Remove script tags and JavaScript event handlers
   */
  private removeScripts(input: string): string {
    // Remove script tags
    let sanitized = input.replace(/<script[^>]*>.*?<\/script>/gi, '');

    // Remove JavaScript event handlers
    sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');

    // Remove javascript: and data: URLs
    sanitized = sanitized.replace(/javascript:/gi, '');
    sanitized = sanitized.replace(/data:/gi, '');

    return sanitized;
  }

  /**
   * Remove dangerous HTML tags
   */
  private removeDangerousTags(input: string): string {
    const dangerousTags = [
      'script',
      'object',
      'embed',
      'applet',
      'link',
      'style',
      'meta',
      'iframe',
      'frame',
      'frameset',
      'form',
      'input',
      'button',
      'textarea',
    ];

    let sanitized = input;

    for (const tag of dangerousTags) {
      const regex = new RegExp(`<${tag}[^>]*>.*?<\/${tag}>`, 'gi');
      sanitized = sanitized.replace(regex, '');

      // Also remove self-closing tags
      const selfClosingRegex = new RegExp(`<${tag}[^>]*\/?>`, 'gi');
      sanitized = sanitized.replace(selfClosingRegex, '');
    }

    return sanitized;
  }

  /**
   * Remove dangerous HTML attributes
   */
  private removeDangerousAttributes(input: string): string {
    const dangerousAttributes = [
      'onclick',
      'onload',
      'onerror',
      'onmouseover',
      'onmouseout',
      'onfocus',
      'onblur',
      'onchange',
      'onsubmit',
      'onreset',
      'style',
      'background',
      'expression',
    ];

    let sanitized = input;

    for (const attr of dangerousAttributes) {
      const regex = new RegExp(`${attr}\\s*=\\s*["'][^"']*["']`, 'gi');
      sanitized = sanitized.replace(regex, '');
    }

    return sanitized;
  }

  /**
   * Recursively sanitize object values
   */
  private sanitizeObjectValues(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      return this.sanitizeText(obj);
    }

    if (typeof obj === 'number' || typeof obj === 'boolean') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObjectValues(item));
    }

    if (typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const sanitizedKey = this.sanitizeText(key);
        sanitized[sanitizedKey] = this.sanitizeObjectValues(value);
      }
      return sanitized;
    }

    return obj;
  }
}

// Default sanitizer instance
const defaultSanitizer = new InputSanitizer();

/**
 * Quick sanitization functions using default config
 */
export const sanitize = {
  text: (input: string) => defaultSanitizer.sanitizeText(input),
  html: (input: string) => defaultSanitizer.sanitizeHTML(input),
  sql: (input: string) => defaultSanitizer.sanitizeSQL(input),
  email: (input: string) => defaultSanitizer.sanitizeEmail(input),
  url: (input: string) => defaultSanitizer.sanitizeURL(input),
  filePath: (input: string) => defaultSanitizer.sanitizeFilePath(input),
  number: (input: string | number, options?: any) =>
    defaultSanitizer.sanitizeNumber(input, options),
  json: (input: string) => defaultSanitizer.sanitizeJSON(input),
};

/**
 * Create a custom sanitizer with specific configuration
 */
export function createSanitizer(config: Partial<SanitizationConfig>): InputSanitizer {
  return new InputSanitizer(config);
}

/**
 * Validation decorators for common input types
 */
export const validators = {
  /**
   * Validate trading symbol format
   */
  tradingSymbol: (symbol: string): string => {
    const sanitized = sanitize.text(symbol).toUpperCase();

    if (!/^[A-Z0-9]{3,20}$/.test(sanitized)) {
      throw new Error('Invalid trading symbol format');
    }

    return sanitized;
  },

  /**
   * Validate API key format
   */
  apiKey: (key: string): string => {
    const sanitized = sanitize.text(key);

    if (!/^[A-Za-z0-9]{32,}$/.test(sanitized)) {
      throw new Error('Invalid API key format');
    }

    return sanitized;
  },

  /**
   * Validate timeframe format
   */
  timeframe: (timeframe: string): string => {
    const sanitized = sanitize.text(timeframe);
    const validTimeframes = [
      '1m',
      '3m',
      '5m',
      '15m',
      '30m',
      '1h',
      '2h',
      '4h',
      '6h',
      '8h',
      '12h',
      '1d',
      '3d',
      '1w',
      '1M',
    ];

    if (!validTimeframes.includes(sanitized)) {
      throw new Error('Invalid timeframe');
    }

    return sanitized;
  },

  /**
   * Validate percentage values
   */
  percentage: (value: string | number, min = 0, max = 100): number => {
    return sanitize.number(value, { min, max, decimals: 2, allowNegative: min < 0 });
  },
};

export default InputSanitizer;
