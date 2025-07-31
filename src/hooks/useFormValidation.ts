import { useState, useCallback } from 'react';

export interface ValidationRule {
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: unknown) => string | null;
}

export interface FieldConfig {
  [key: string]: ValidationRule;
}

export interface FormErrors {
  [key: string]: string;
}

export interface FormTouched {
  [key: string]: boolean;
}

export const useFormValidation = <T extends Record<string, unknown>>(
  initialValues: T,
  validationRules: FieldConfig
) => {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<FormTouched>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateField = useCallback(
    (name: string, value: unknown): string => {
      const rules = validationRules[name];
      if (!rules) return '';

      // Required validation
      if (rules.required && (!value || value === '' || value === 0)) {
        return `${name.charAt(0).toUpperCase() + name.slice(1)} is required`;
      }

      // Skip other validations if field is empty and not required
      if (!value && !rules.required) return '';

      // Min/Max for numbers
      if (typeof value === 'number') {
        if (rules.min !== undefined && value < rules.min) {
          return `Must be at least ${rules.min}`;
        }
        if (rules.max !== undefined && value > rules.max) {
          return `Must be no more than ${rules.max}`;
        }
      }

      // MinLength/MaxLength for strings
      if (typeof value === 'string') {
        if (rules.minLength !== undefined && value.length < rules.minLength) {
          return `Must be at least ${rules.minLength} characters`;
        }
        if (rules.maxLength !== undefined && value.length > rules.maxLength) {
          return `Must be no more than ${rules.maxLength} characters`;
        }
      }

      // Pattern validation
      if (rules.pattern && typeof value === 'string' && !rules.pattern.test(value)) {
        return 'Invalid format';
      }

      // Custom validation
      if (rules.custom) {
        const customError = rules.custom(value);
        if (customError) return customError;
      }

      return '';
    },
    [validationRules]
  );

  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    Object.keys(validationRules).forEach(name => {
      const error = validateField(name, values[name as keyof T]);
      if (error) {
        newErrors[name] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [values, validateField, validationRules]);

  const handleChange = useCallback(
    (name: string, value: unknown) => {
      setValues(prev => ({ ...prev, [name]: value }));

      // Real-time validation for touched fields
      if (touched[name]) {
        const error = validateField(name, value);
        setErrors(prev => ({ ...prev, [name]: error }));
      }
    },
    [touched, validateField]
  );

  const handleBlur = useCallback(
    (name: string) => {
      setTouched(prev => ({ ...prev, [name]: true }));

      // Validate on blur
      const error = validateField(name, values[name as keyof T]);
      setErrors(prev => ({ ...prev, [name]: error }));
    },
    [values, validateField]
  );

  const handleSubmit = useCallback(
    async (onSubmit: (values: T) => Promise<void> | void) => {
      setIsSubmitting(true);

      // Mark all fields as touched
      const allTouched: FormTouched = {};
      Object.keys(validationRules).forEach(name => {
        allTouched[name] = true;
      });
      setTouched(allTouched);

      const isValid = validateForm();

      if (isValid) {
        try {
          await onSubmit(values);
        } catch (error) {
          console.error('Form submission error:', error);
        }
      }

      setIsSubmitting(false);
    },
    [values, validateForm, validationRules]
  );

  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  const setFieldValue = useCallback((name: string, value: unknown) => {
    setValues(prev => ({ ...prev, [name]: value }));
  }, []);

  const setFieldError = useCallback((name: string, error: string) => {
    setErrors(prev => ({ ...prev, [name]: error }));
  }, []);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    validateForm,
    resetForm,
    setFieldValue,
    setFieldError,
    isValid: Object.keys(errors).length === 0,
  };
};
