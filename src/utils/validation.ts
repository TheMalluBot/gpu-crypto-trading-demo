/**
 * Comprehensive input validation utilities for the trading application
 */

import { ErrorHandler, ErrorType, ErrorSeverity } from './errorHandling';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface FieldValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  min?: number;
  max?: number;
  custom?: (value: unknown) => string | null;
}

export class InputValidator {
  private static readonly VALID_INTERVALS = [
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

  private static readonly API_KEY_PATTERN = /^[A-Za-z0-9]{32,}$/;
  private static readonly SYMBOL_PATTERN = /^[A-Z0-9]{3,20}$/;
  private static readonly URL_PATTERN = /^https:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  /**
   * Validate a single field with given rules
   */
  static validateField(value: unknown, rules: FieldValidationRule): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required validation
    if (rules.required && (value === null || value === undefined || value === '')) {
      errors.push('This field is required');
      return { isValid: false, errors, warnings };
    }

    // Skip other validations if value is empty and not required
    if (!rules.required && (value === null || value === undefined || value === '')) {
      return { isValid: true, errors, warnings };
    }

    // String validations
    if (typeof value === 'string') {
      if (rules.minLength && value.length < rules.minLength) {
        errors.push(`Minimum length is ${rules.minLength} characters`);
      }
      if (rules.maxLength && value.length > rules.maxLength) {
        errors.push(`Maximum length is ${rules.maxLength} characters`);
      }
      if (rules.pattern && !rules.pattern.test(value)) {
        errors.push('Invalid format');
      }
    }

    // Number validations
    if (typeof value === 'number') {
      if (rules.min !== undefined && value < rules.min) {
        errors.push(`Minimum value is ${rules.min}`);
      }
      if (rules.max !== undefined && value > rules.max) {
        errors.push(`Maximum value is ${rules.max}`);
      }
    }

    // Custom validation
    if (rules.custom) {
      const customError = rules.custom(value);
      if (customError) {
        errors.push(customError);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate API settings
   */
  static validateApiSettings(settings: {
    apiKey?: string;
    apiSecret?: string;
    baseUrl?: string;
    testnet?: boolean;
  }): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // API Key validation
    if (settings.apiKey) {
      if (!this.API_KEY_PATTERN.test(settings.apiKey)) {
        errors.push('API key must be at least 32 alphanumeric characters');
      }
    } else if (!settings.testnet) {
      warnings.push('API key is recommended for live trading');
    }

    // API Secret validation
    if (settings.apiSecret) {
      if (!this.API_KEY_PATTERN.test(settings.apiSecret)) {
        errors.push('API secret must be at least 32 alphanumeric characters');
      }
    } else if (!settings.testnet) {
      warnings.push('API secret is required for live trading');
    }

    // Base URL validation
    if (settings.baseUrl && !this.URL_PATTERN.test(settings.baseUrl)) {
      errors.push('Base URL must be a valid HTTPS URL');
    }

    // Security warnings
    if (settings.apiKey && settings.apiSecret && settings.testnet) {
      warnings.push('Using real API credentials with testnet mode');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate trading symbol
   */
  static validateSymbol(symbol: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!symbol) {
      errors.push('Symbol is required');
    } else if (!this.SYMBOL_PATTERN.test(symbol)) {
      errors.push('Symbol must be 3-20 uppercase letters and numbers only');
    } else {
      // Common symbol format warnings
      if (!symbol.includes('USDT') && !symbol.includes('BTC') && !symbol.includes('ETH')) {
        warnings.push('Uncommon symbol format - verify this is correct');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate trading interval
   */
  static validateInterval(interval: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!interval) {
      errors.push('Interval is required');
    } else if (!this.VALID_INTERVALS.includes(interval)) {
      errors.push(`Invalid interval. Valid options: ${this.VALID_INTERVALS.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate order parameters
   */
  static validateOrder(order: {
    symbol?: string;
    side?: 'buy' | 'sell';
    type?: 'market' | 'limit';
    quantity?: number;
    price?: number;
  }): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Symbol validation
    if (order.symbol) {
      const symbolResult = this.validateSymbol(order.symbol);
      errors.push(...symbolResult.errors);
      warnings.push(...symbolResult.warnings);
    } else {
      errors.push('Symbol is required');
    }

    // Quantity validation
    if (order.quantity === undefined || order.quantity === null) {
      errors.push('Quantity is required');
    } else if (order.quantity <= 0) {
      errors.push('Quantity must be greater than zero');
    } else if (order.quantity > 1000000) {
      warnings.push('Very large quantity - please verify');
    } else {
      // Check for reasonable decimal places
      const decimalPlaces = (order.quantity.toString().split('.')[1] || '').length;
      if (decimalPlaces > 8) {
        warnings.push('Quantity has many decimal places - may be rounded by exchange');
      }
    }

    // Price validation for limit orders
    if (order.type === 'limit') {
      if (order.price === undefined || order.price === null) {
        errors.push('Price is required for limit orders');
      } else if (order.price <= 0) {
        errors.push('Price must be greater than zero');
      } else {
        // Check for reasonable decimal places
        const decimalPlaces = (order.price.toString().split('.')[1] || '').length;
        if (decimalPlaces > 8) {
          warnings.push('Price has many decimal places - may be rounded by exchange');
        }
      }
    }

    // Side validation
    if (!order.side) {
      errors.push('Order side (buy/sell) is required');
    }

    // Type validation
    if (!order.type) {
      errors.push('Order type is required');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate risk management parameters
   */
  static validateRiskParameters(params: {
    stopLossPercent?: number;
    takeProfitPercent?: number;
    maxPositionSize?: number;
    maxDailyLoss?: number;
  }): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Stop loss validation
    if (params.stopLossPercent !== undefined) {
      if (params.stopLossPercent <= 0) {
        errors.push('Stop loss percentage must be greater than zero');
      } else if (params.stopLossPercent > 50) {
        warnings.push('Stop loss percentage is very high (>50%)');
      } else if (params.stopLossPercent < 0.1) {
        warnings.push('Stop loss percentage is very low (<0.1%)');
      }
    }

    // Take profit validation
    if (params.takeProfitPercent !== undefined) {
      if (params.takeProfitPercent <= 0) {
        errors.push('Take profit percentage must be greater than zero');
      } else if (params.takeProfitPercent > 100) {
        warnings.push('Take profit percentage is very high (>100%)');
      }
    }

    // Position size validation
    if (params.maxPositionSize !== undefined) {
      if (params.maxPositionSize <= 0) {
        errors.push('Maximum position size must be greater than zero');
      } else if (params.maxPositionSize > 100) {
        errors.push('Maximum position size cannot exceed 100% of account');
      } else if (params.maxPositionSize > 50) {
        warnings.push('Maximum position size is very high (>50% of account)');
      }
    }

    // Daily loss validation
    if (params.maxDailyLoss !== undefined) {
      if (params.maxDailyLoss <= 0) {
        errors.push('Maximum daily loss must be greater than zero');
      } else if (params.maxDailyLoss > 20) {
        warnings.push('Maximum daily loss is very high (>20%)');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate form data with multiple fields
   */
  static validateForm(
    data: Record<string, unknown>,
    rules: Record<string, FieldValidationRule>
  ): Record<string, ValidationResult> {
    const results: Record<string, ValidationResult> = {};

    try {
      for (const [field, fieldRules] of Object.entries(rules)) {
        results[field] = this.validateField(data[field], fieldRules);
      }
    } catch (error) {
      // Log validation errors for debugging
      ErrorHandler.handle(error, {
        showNotification: false,
        logToConsole: true,
      });

      // Return error state for all fields
      for (const field of Object.keys(rules)) {
        results[field] = {
          isValid: false,
          errors: ['Validation system error'],
          warnings: [],
        };
      }
    }

    return results;
  }

  /**
   * Validate with error handling and logging
   */
  static async validateWithErrorHandling<T>(
    value: T,
    validator: (val: T) => ValidationResult,
    context?: string
  ): Promise<ValidationResult> {
    try {
      const result = validator(value);

      // Log validation failures for debugging
      if (!result.isValid) {
        ErrorHandler.createError(
          ErrorType.VALIDATION,
          ErrorSeverity.LOW,
          `Validation failed${context ? ` for ${context}` : ''}`,
          result.errors.join(', '),
          { value, context }
        );
      }

      return result;
    } catch (error) {
      await ErrorHandler.handle(error, {
        showNotification: false,
        logToConsole: true,
      });

      return {
        isValid: false,
        errors: ['Validation system error'],
        warnings: [],
      };
    }
  }

  /**
   * Check if all validation results are valid
   */
  static isFormValid(results: Record<string, ValidationResult>): boolean {
    return Object.values(results).every(result => result.isValid);
  }

  /**
   * Get all errors from validation results
   */
  static getAllErrors(results: Record<string, ValidationResult>): string[] {
    return Object.values(results).flatMap(result => result.errors);
  }

  /**
   * Get all warnings from validation results
   */
  static getAllWarnings(results: Record<string, ValidationResult>): string[] {
    return Object.values(results).flatMap(result => result.warnings);
  }
}
