export interface PasswordValidation {
  isValid: boolean;
  errors: string[];
  requirements: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
  };
}

export const validatePassword = (password: string): PasswordValidation => {
  const requirements = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password)
  };

  const errors: string[] = [];
  
  if (!requirements.minLength) {
    errors.push('At least 8 characters');
  }
  if (!requirements.hasUppercase) {
    errors.push('At least 1 uppercase letter');
  }
  if (!requirements.hasLowercase) {
    errors.push('At least 1 lowercase letter');
  }
  if (!requirements.hasNumber) {
    errors.push('At least 1 number');
  }
  if (!requirements.hasSpecialChar) {
    errors.push('At least 1 special character (!@#$%^&*(),.?":{}|<>)');
  }

  return {
    isValid: Object.values(requirements).every(req => req),
    errors,
    requirements
  };
};

export const getPasswordStrength = (password: string): { strength: string; color: string } => {
  const validation = validatePassword(password);
  const validCount = Object.values(validation.requirements).filter(req => req).length;
  
  if (validCount <= 2) {
    return { strength: 'Weak', color: 'text-red-600' };
  } else if (validCount <= 3) {
    return { strength: 'Fair', color: 'text-orange-600' };
  } else if (validCount <= 4) {
    return { strength: 'Good', color: 'text-yellow-600' };
  } else {
    return { strength: 'Strong', color: 'text-green-600' };
  }
}; 