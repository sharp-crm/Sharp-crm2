import React, { useState, useEffect } from 'react';

interface Country {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
}

interface PhoneNumberInputProps {
  value: string;
  onChange: (fullPhoneNumber: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

const countries: Country[] = [
  { code: 'US', name: 'United States', dialCode: '+1', flag: '🇺🇸' },
  { code: 'CA', name: 'Canada', dialCode: '+1', flag: '🇨🇦' },
  { code: 'GB', name: 'United Kingdom', dialCode: '+44', flag: '🇬🇧' },
  { code: 'AU', name: 'Australia', dialCode: '+61', flag: '🇦🇺' },
  { code: 'IN', name: 'India', dialCode: '+91', flag: '🇮🇳' },
  { code: 'CN', name: 'China', dialCode: '+86', flag: '🇨🇳' },
  { code: 'JP', name: 'Japan', dialCode: '+81', flag: '🇯🇵' },
  { code: 'DE', name: 'Germany', dialCode: '+49', flag: '🇩🇪' },
  { code: 'FR', name: 'France', dialCode: '+33', flag: '🇫🇷' },
  { code: 'IT', name: 'Italy', dialCode: '+39', flag: '🇮🇹' },
  { code: 'ES', name: 'Spain', dialCode: '+34', flag: '🇪🇸' },
  { code: 'BR', name: 'Brazil', dialCode: '+55', flag: '🇧🇷' },
  { code: 'RU', name: 'Russia', dialCode: '+7', flag: '🇷🇺' },
  { code: 'MX', name: 'Mexico', dialCode: '+52', flag: '🇲🇽' },
  { code: 'ZA', name: 'South Africa', dialCode: '+27', flag: '🇿🇦' },
  { code: 'KR', name: 'South Korea', dialCode: '+82', flag: '🇰🇷' },
  { code: 'SG', name: 'Singapore', dialCode: '+65', flag: '🇸🇬' },
  { code: 'AE', name: 'UAE', dialCode: '+971', flag: '🇦🇪' },
  { code: 'SA', name: 'Saudi Arabia', dialCode: '+966', flag: '🇸🇦' },
  { code: 'EG', name: 'Egypt', dialCode: '+20', flag: '🇪🇬' },
];

const PhoneNumberInput: React.FC<PhoneNumberInputProps> = ({
  value,
  onChange,
  placeholder = "Enter phone number",
  disabled = false,
  required = false,
  className = ""
}) => {
  const [selectedCountry, setSelectedCountry] = useState<Country>(countries[0]);
  const [phoneNumber, setPhoneNumber] = useState('');

  // Parse existing phone number to extract country code and number
  useEffect(() => {
    if (value && value.length > 0) {
      // Find matching country code
      const matchingCountry = countries.find(country => 
        value.startsWith(country.dialCode)
      );
      
      if (matchingCountry) {
        setSelectedCountry(matchingCountry);
        setPhoneNumber(value.substring(matchingCountry.dialCode.length));
      } else {
        // If no country code found, assume it's just the number
        setPhoneNumber(value);
      }
    } else {
      setPhoneNumber('');
    }
  }, [value]);

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const country = countries.find(c => c.code === e.target.value);
    if (country) {
      setSelectedCountry(country);
      // Update the full phone number
      const fullNumber = phoneNumber ? `${country.dialCode}${phoneNumber}` : '';
      onChange(fullNumber);
    }
  };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const number = e.target.value.replace(/[^\d]/g, ''); // Only allow digits
    setPhoneNumber(number);
    
    // Update the full phone number
    const fullNumber = number ? `${selectedCountry.dialCode}${number}` : '';
    onChange(fullNumber);
  };

  return (
    <div className={`flex ${className}`}>
      {/* Country Code Selector */}
      <div className="relative">
        <select
          value={selectedCountry.code}
          onChange={handleCountryChange}
          disabled={disabled}
          className={`
            h-full px-3 py-2 border border-gray-300 rounded-l-lg bg-white 
            focus:ring-2 focus:ring-blue-500 focus:border-transparent
            disabled:bg-gray-100 disabled:cursor-not-allowed
            min-w-[120px] appearance-none pr-8
          `}
        >
          {countries.map((country) => (
            <option key={country.code} value={country.code}>
              {country.flag} {country.dialCode}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </div>
      </div>
      
      {/* Phone Number Input */}
      <input
        type="tel"
        value={phoneNumber}
        onChange={handlePhoneNumberChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className={`
          flex-1 px-3 py-2 border border-l-0 border-gray-300 rounded-r-lg
          focus:ring-2 focus:ring-blue-500 focus:border-transparent
          disabled:bg-gray-100 disabled:cursor-not-allowed
        `}
      />
    </div>
  );
};

export default PhoneNumberInput; 