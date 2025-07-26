/**
 * Comprehensive error handling utilities for the trading application
 */

export enum ErrorType {
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  API = 'API',
  AUTHENTICATION = 'AUTHENTICATION',
  PERMISSION = 'PERMISSION',
  RATE_LIMIT = 'RATE_LIMIT',
  UNKNOWN = 'UNKNOWN',
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface AppError {
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  details?: string;
  code?: string;
  timestamp: Date;
  stack?: string;
  context?: Record<string, unknown>;
}

export interface ErrorHandlerOptions {
  showNotification?: boolean;
  logToConsole?: boolean;
  reportToService?: boolean;
  fallbackValue?: unknown;
}

/**
 * Enhanced error handler class with comprehensive error management
 */
export class ErrorHandler {
  private static errorQueue: AppError[] = [];
  private static maxQueueSize = 100;

  /**
   * Create a standardized error object
   */
  static createError(
    type: ErrorType,
    severity: ErrorSeverity,
    message: string,
    details?: string,
    context?: Record<string, unknown>
  ): AppError {
    return {
      type,
      severity,
      message,
      details,
      timestamp: new Date(),
      stack: new Error().stack,
      context,
    };
  }

  /**
   * Handle errors with comprehensive logging and user feedback
   */
  static async handle(
    error: unknown,
    options: ErrorHandlerOptions = {}
  ): Promise<AppError> {
    const {
      showNotification = true,
      logToConsole = true,
      reportToService = false,
    } = options;

    const appError = this.normalizeError(error);
    
    // Add to error queue
    this.addToQueue(appError);

    // Log to console if enabled
    if (logToConsole) {
      this.logError(appError);
    }

    // Show user notification if enabled
    if (showNotification) {
      await this.showErrorNotification(appError);
    }

    // Report to error service if enabled
    if (reportToService) {
      await this.reportError(appError);
    }

    return appError;
  }

  /**
   * Normalize different error types into AppError format
   */
  private static normalizeError(error: unknown): AppError {
    if (error instanceof Error) {
      // Check for specific error types
      if (error.message.includes('fetch')) {
        return this.createError(
          ErrorType.NETWORK,
          ErrorSeverity.MEDIUM,
          'Network connection failed',
          error.message
        );
      }
      
      if (error.message.includes('Unauthorized') || error.message.includes('401')) {
        return this.createError(
          ErrorType.AUTHENTICATION,
          ErrorSeverity.HIGH,
          'Authentication failed',
          error.message
        );
      }

      if (error.message.includes('rate limit') || error.message.includes('429')) {
        return this.createError(
          ErrorType.RATE_LIMIT,
          ErrorSeverity.MEDIUM,
          'Rate limit exceeded',
          error.message
        );
      }

      return this.createError(
        ErrorType.UNKNOWN,
        ErrorSeverity.MEDIUM,
        error.message,
        error.stack
      );
    }

    if (typeof error === 'string') {
      return this.createError(
        ErrorType.UNKNOWN,
        ErrorSeverity.LOW,
        error
      );
    }

    return this.createError(
      ErrorType.UNKNOWN,
      ErrorSeverity.LOW,
      'An unknown error occurred',
      String(error)
    );
  }

  /**
   * Add error to internal queue for analysis
   */
  private static addToQueue(error: AppError): void {
    this.errorQueue.push(error);
    
    // Keep queue size manageable
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue = this.errorQueue.slice(-this.maxQueueSize);
    }
  }

  /**
   * Log error to console with appropriate level
   */
  private static logError(error: AppError): void {
    const logMessage = `[${error.type}] ${error.message}`;
    
    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        console.error(logMessage, error);
        break;
      case ErrorSeverity.MEDIUM:
        console.warn(logMessage, error);
        break;
      case ErrorSeverity.LOW:
        console.info(logMessage, error);
        break;
    }
  }

  /**
   * Show user-friendly error notification
   */
  private static async showErrorNotification(error: AppError): Promise<void> {
    // Import notification manager dynamically to avoid circular dependencies
    const { default: NotificationManager } = await import('./notifications');
    
    const userMessage = this.getUserFriendlyMessage(error);
    
    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        NotificationManager.error('Error', userMessage);
        break;
      case ErrorSeverity.MEDIUM:
        NotificationManager.warning('Warning', userMessage);
        break;
      case ErrorSeverity.LOW:
        NotificationManager.info('Info', userMessage);
        break;
    }
  }

  /**
   * Convert technical error to user-friendly message
   */
  private static getUserFriendlyMessage(error: AppError): string {
    switch (error.type) {
      case ErrorType.NETWORK:
        return 'Unable to connect to the server. Please check your internet connection.';
      case ErrorType.AUTHENTICATION:
        return 'Your session has expired. Please log in again.';
      case ErrorType.PERMISSION:
        return 'You do not have permission to perform this action.';
      case ErrorType.RATE_LIMIT:
        return 'Too many requests. Please wait a moment and try again.';
      case ErrorType.VALIDATION:
        return error.message; // Validation messages are usually user-friendly
      case ErrorType.API:
        return 'Server error occurred. Please try again later.';
      default:
        return error.message || 'An unexpected error occurred.';
    }
  }

  /**
   * Report error to external service (placeholder)
   */
  private static async reportError(error: AppError): Promise<void> {
    try {
      // In a real application, you would send this to an error reporting service
      // like Sentry, LogRocket, or a custom API
      console.info('Error reported to service:', error);
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  }

  /**
   * Get recent errors for debugging
   */
  static getRecentErrors(count = 10): AppError[] {
    return this.errorQueue.slice(-count);
  }

  /**
   * Clear error queue
   */
  static clearErrors(): void {
    this.errorQueue = [];
  }

  /**
   * Get error statistics
   */
  static getErrorStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    
    this.errorQueue.forEach(error => {
      const key = `${error.type}_${error.severity}`;
      stats[key] = (stats[key] || 0) + 1;
    });
    
    return stats;
  }
}

/**
 * Async error boundary hook for React components
 */
export const withErrorHandling = <T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  options?: ErrorHandlerOptions
) => {
  return async (...args: T): Promise<R | null> => {
    try {
      return await fn(...args);
    } catch (error) {
      await ErrorHandler.handle(error, options);
      return (options?.fallbackValue as R) || null;
    }
  };
};

/**
 * Sync error boundary wrapper
 */
export const withSyncErrorHandling = <T extends unknown[], R>(
  fn: (...args: T) => R,
  options?: ErrorHandlerOptions
) => {
  return (...args: T): R | null => {
    try {
      return fn(...args);
    } catch (error) {
      ErrorHandler.handle(error, options);
      return (options?.fallbackValue as R) || null;
    }
  };
};

/**
 * Validation error helper
 */
export const createValidationError = (
  field: string,
  message: string,
  value?: unknown
): AppError => {
  return ErrorHandler.createError(
    ErrorType.VALIDATION,
    ErrorSeverity.MEDIUM,
    `${field}: ${message}`,
    `Invalid value: ${String(value)}`,
    { field, value }
  );
};

/**
 * Network error helper
 */
export const createNetworkError = (
  operation: string,
  details?: string
): AppError => {
  return ErrorHandler.createError(
    ErrorType.NETWORK,
    ErrorSeverity.HIGH,
    `Network error during ${operation}`,
    details
  );
};

/**
 * API error helper
 */
export const createApiError = (
  endpoint: string,
  status: number,
  message: string
): AppError => {
  const severity = status >= 500 ? ErrorSeverity.HIGH : ErrorSeverity.MEDIUM;
  
  return ErrorHandler.createError(
    ErrorType.API,
    severity,
    `API error (${status}): ${message}`,
    `Endpoint: ${endpoint}`,
    { endpoint, status }
  );
};