import React from 'react';
import { validatePassword, getPasswordStrength } from '../../utils/passwordValidation';

interface PasswordStrengthMeterProps {
  password: string;
  showRequirements?: boolean;
}

const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({ 
  password, 
  showRequirements = true 
}) => {
  const validation = validatePassword(password);
  const strength = getPasswordStrength(password);
  
  const getStrengthValue = () => {
    const validCount = Object.values(validation.requirements).filter(req => req).length;
    return (validCount / 5) * 100;
  };

  const getStrengthColor = () => {
    const strengthValue = getStrengthValue();
    if (strengthValue <= 40) return 'bg-red-500';
    if (strengthValue <= 60) return 'bg-orange-500';
    if (strengthValue <= 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStrengthTextColor = () => {
    const strengthValue = getStrengthValue();
    if (strengthValue <= 40) return 'text-red-600';
    if (strengthValue <= 60) return 'text-orange-600';
    if (strengthValue <= 80) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (!password) return null;

  return (
    <div className="space-y-2">
      {/* Strength Meter Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600">Strength:</span>
          <div className="flex items-center space-x-1">
            <span className={`text-xs font-medium ${getStrengthTextColor()}`}>
              {strength.strength}
            </span>
            {getStrengthValue() >= 80 && (
              <span className="text-green-500 text-xs"></span>
            )}
            {getStrengthValue() >= 60 && getStrengthValue() < 80 && (
              <span className="text-yellow-500 text-xs"></span>
            )}
            {getStrengthValue() < 60 && getStrengthValue() > 0 && (
              <span className="text-orange-500 text-xs"></span>
            )}
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 shadow-inner">
          <div 
            className={`h-2 rounded-full transition-all duration-500 ease-out ${getStrengthColor()} shadow-sm`}
            style={{ width: `${getStrengthValue()}%` }}
          ></div>
        </div>
      </div>

      {/* Requirements Checklist */}
      {showRequirements && (
        <div className="bg-gray-50 p-2 rounded border">
          <p className="text-xs font-medium text-gray-700 mb-1.5">Requirements:</p>
          <div className="grid grid-cols-1 gap-1">
            <div className={`flex items-center text-xs ${validation.requirements.minLength ? 'text-green-600' : 'text-red-600'}`}>
              <span className={`w-3 h-3 rounded-full mr-1.5 flex items-center justify-center text-white text-xs font-bold ${validation.requirements.minLength ? 'bg-green-500' : 'bg-red-500'}`}>
                {validation.requirements.minLength ? '✓' : '✗'}
              </span>
              8+ characters
            </div>
            
            <div className={`flex items-center text-xs ${validation.requirements.hasUppercase ? 'text-green-600' : 'text-red-600'}`}>
              <span className={`w-3 h-3 rounded-full mr-1.5 flex items-center justify-center text-white text-xs font-bold ${validation.requirements.hasUppercase ? 'bg-green-500' : 'bg-red-500'}`}>
                {validation.requirements.hasUppercase ? '✓' : '✗'}
              </span>
              1+ uppercase
            </div>
            
            <div className={`flex items-center text-xs ${validation.requirements.hasLowercase ? 'text-green-600' : 'text-red-600'}`}>
              <span className={`w-3 h-3 rounded-full mr-1.5 flex items-center justify-center text-white text-xs font-bold ${validation.requirements.hasLowercase ? 'bg-green-500' : 'bg-red-500'}`}>
                {validation.requirements.hasLowercase ? '✓' : '✗'}
              </span>
              1+ lowercase
            </div>
            
            <div className={`flex items-center text-xs ${validation.requirements.hasNumber ? 'text-green-600' : 'text-red-600'}`}>
              <span className={`w-3 h-3 rounded-full mr-1.5 flex items-center justify-center text-white text-xs font-bold ${validation.requirements.hasNumber ? 'bg-green-500' : 'bg-red-500'}`}>
                {validation.requirements.hasNumber ? '✓' : '✗'}
              </span>
              1+ number
            </div>
            
            <div className={`flex items-center text-xs ${validation.requirements.hasSpecialChar ? 'text-green-600' : 'text-red-600'}`}>
              <span className={`w-3 h-3 rounded-full mr-1.5 flex items-center justify-center text-white text-xs font-bold ${validation.requirements.hasSpecialChar ? 'bg-green-500' : 'bg-red-500'}`}>
                {validation.requirements.hasSpecialChar ? '✓' : '✗'}
              </span>
              1+ special
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PasswordStrengthMeter; 