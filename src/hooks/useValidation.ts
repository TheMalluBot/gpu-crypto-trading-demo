import { useState, useCallback, useMemo } from 'react';
import { InputValidator, ValidationResult, FieldValidationRule } from '../utils/validation';

export interface UseValidationOptions {
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  showWarnings?: boolean;
}

export interface FieldState {
  value: unknown;
  validation: ValidationResult;
  touched: boolean;
  dirty: boolean;
}

export interface UseValidationReturn {
  fields: Record<string, FieldState>;
  isValid: boolean;
  hasErrors: boolean;
  hasWarnings: boolean;
  errors: string[];
  warnings: string[];
  setValue: (field: string, value: unknown) => void;
  setTouched: (field: string, touched?: boolean) => void;
  validateField: (field: string) => void;
  validateAll: () => boolean;
  reset: () => void;
  getFieldProps: (field: string) => {
    value: unknown;
    onChange: (value: unknown) => void;
    onBlur: () => void;
    error: boolean;
    helperText: string;
  };
}

/**
 * Custom hook for form validation with real-time feedback
 */
export function useValidation(
  initialValues: Record<string, any>,
  validationRules: Record<string, FieldValidationRule>,
  options: UseValidationOptions = {}
): UseValidationReturn {
  const {
    validateOnChange = true,
    validateOnBlur = true,
    showWarnings = true
  } = options;

  // Initialize field states
  const [fields, setFields] = useState<Record<string, FieldState>>(() => {
    const initialFields: Record<string, FieldState> = {};

    for (const [field, value] of Object.entries(initialValues)) {
      initialFields[field] = {
        value,
        validation: { isValid: true, errors: [], warnings: [] },
        touched: false,
        dirty: false
      };
    }

    return initialFields;
  });

  // Validate a single field
  const validateSingleField = useCallback((field: string, value: unknown): ValidationResult => {
    const rules = validationRules[field];
    if (!rules) {
      return { isValid: true, errors: [], warnings: [] };
    }

    return InputValidator.validateField(value, rules);
  }, [validationRules]);

  // Set field value
  const setValue = useCallback((field: string, value: unknown) => {
    setFields(prev => {
      const currentField = prev[field] || {
        value: '',
        validation: { isValid: true, errors: [], warnings: [] },
        touched: false,
        dirty: false
      };

      const validation = validateOnChange
        ? validateSingleField(field, value)
        : currentField.validation;

      return {
        ...prev,
        [field]: {
          ...currentField,
          value,
          validation,
          dirty: value !== initialValues[field]
        }
      };
    });
  }, [validateOnChange, validateSingleField, initialValues]);

  // Set field touched state
  const setTouched = useCallback((field: string, touched = true) => {
    setFields(prev => {
      const currentField = prev[field];
      if (!currentField) return prev;

      const validation = touched && validateOnBlur
        ? validateSingleField(field, currentField.value)
        : currentField.validation;

      return {
        ...prev,
        [field]: {
          ...currentField,
          touched,
          validation
        }
      };
    });
  }, [validateOnBlur, validateSingleField]);

  // Validate specific field
  const validateField = useCallback((field: string) => {
    setFields(prev => {
      const currentField = prev[field];
      if (!currentField) return prev;

      const validation = validateSingleField(field, currentField.value);

      return {
        ...prev,
        [field]: {
          ...currentField,
          validation,
          touched: true
        }
      };
    });
  }, [validateSingleField]);

  // Validate all fields
  const validateAll = useCallback((): boolean => {
    let allValid = true;

    setFields(prev => {
      const newFields = { ...prev };

      for (const [field, fieldState] of Object.entries(newFields)) {
        const validation = validateSingleField(field, fieldState.value);

        newFields[field] = {
          ...fieldState,
          validation,
          touched: true
        };

        if (!validation.isValid) {
          allValid = false;
        }
      }

      return newFields;
    });

    return allValid;
  }, [validateSingleField]);

  // Reset form
  const reset = useCallback(() => {
    setFields(() => {
      const resetFields: Record<string, FieldState> = {};

      for (const [field, value] of Object.entries(initialValues)) {
        resetFields[field] = {
          value,
          validation: { isValid: true, errors: [], warnings: [] },
          touched: false,
          dirty: false
        };
      }

      return resetFields;
    });
  }, [initialValues]);

  // Get field props for easy integration with form components
  const getFieldProps = useCallback((field: string) => {
    const fieldState = fields[field] || {
      value: '',
      validation: { isValid: true, errors: [], warnings: [] },
      touched: false,
      dirty: false
    };

    const hasError = fieldState.touched && !fieldState.validation.isValid;
    const hasWarning = fieldState.touched && showWarnings && fieldState.validation.warnings.length > 0;

    let helperText = '';
    if (hasError) {
      helperText = fieldState.validation.errors[0] || '';
    } else if (hasWarning) {
      helperText = fieldState.validation.warnings[0] || '';
    }

    return {
      value: fieldState.value,
      onChange: (value: any) => setValue(field, value),
      onBlur: () => setTouched(field, true),
      error: hasError,
      helperText
    };
  }, [fields, setValue, setTouched, showWarnings]);

  // Computed values
  const computedValues = useMemo(() => {
    const allErrors: string[] = [];
    const allWarnings: string[] = [];
    let isValid = true;

    for (const fieldState of Object.values(fields)) {
      if (fieldState.touched) {
        allErrors.push(...fieldState.validation.errors);
        allWarnings.push(...fieldState.validation.warnings);

        if (!fieldState.validation.isValid) {
          isValid = false;
        }
      }
    }

    return {
      isValid,
      hasErrors: allErrors.length > 0,
      hasWarnings: allWarnings.length > 0,
      errors: allErrors,
      warnings: allWarnings
    };
  }, [fields]);

  return {
    fields,
    ...computedValues,
    setValue,
    setTouched,
    validateField,
    validateAll,
    reset,
    getFieldProps
  };
}