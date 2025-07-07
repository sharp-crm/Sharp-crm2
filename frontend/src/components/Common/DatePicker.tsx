import React, { useState, useRef, useEffect } from 'react';
import * as Icons from 'lucide-react';

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  label?: string;
}

const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  placeholder = "Select date",
  required = false,
  className = "",
  label
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    value ? new Date(value) : null
  );
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLDivElement>(null);

  // Date range constants
  const currentYear = new Date().getFullYear();
  const minYear = currentYear - 125;
  const maxYear = currentYear;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update selected date when value prop changes
  useEffect(() => {
    if (value) {
      const date = new Date(value);
      setSelectedDate(date);
      setCurrentDate(new Date(date.getFullYear(), date.getMonth(), 1));
    }
  }, [value]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const isDateInRange = (date: Date) => {
    const year = date.getFullYear();
    const today = new Date();
    return year >= minYear && year <= maxYear && date <= today;
  };

  const getYearOptions = () => {
    const years = [];
    for (let year = maxYear; year >= minYear; year--) {
      years.push(year);
    }
    return years;
  };

  const getMonthOptions = () => {
    return [
      { value: 0, label: 'January' },
      { value: 1, label: 'February' },
      { value: 2, label: 'March' },
      { value: 3, label: 'April' },
      { value: 4, label: 'May' },
      { value: 5, label: 'June' },
      { value: 6, label: 'July' },
      { value: 7, label: 'August' },
      { value: 8, label: 'September' },
      { value: 9, label: 'October' },
      { value: 10, label: 'November' },
      { value: 11, label: 'December' }
    ];
  };

  const calculateDropdownPosition = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
      
      // Position calendar above the input field
      // Calendar height is approximately 320px (estimated with padding)
      const calendarHeight = 320;
      const spacing = 8;
      let topPosition = rect.top + scrollTop - calendarHeight - spacing;
      
      // Ensure calendar doesn't go above viewport
      if (topPosition < scrollTop + 20) {
        topPosition = scrollTop + 20;
      }
      
      setDropdownPosition({
        top: topPosition,
        left: rect.left + scrollLeft
      });
    }
  };

  const handleDateSelect = (date: Date) => {
    if (isDateInRange(date)) {
      setSelectedDate(date);
      onChange(date.toISOString().split('T')[0]);
      setIsOpen(false);
    }
  };

  const toggleDropdown = () => {
    if (!isOpen) {
      calculateDropdownPosition();
    }
    setIsOpen(!isOpen);
  };

  const handleYearChange = (year: number) => {
    const newDate = new Date(year, currentDate.getMonth(), 1);
    setCurrentDate(newDate);
  };

  const handleMonthChange = (month: number) => {
    const newDate = new Date(currentDate.getFullYear(), month, 1);
    setCurrentDate(newDate);
  };

  const canNavigatePrev = () => {
    const prevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    return prevMonth.getFullYear() >= minYear;
  };

  const canNavigateNext = () => {
    const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    const today = new Date();
    return nextMonth <= today;
  };

  const navigatePrev = () => {
    if (canNavigatePrev()) {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    }
  };

  const navigateNext = () => {
    if (canNavigateNext()) {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    }
  };

  const formatDisplayDate = () => {
    if (selectedDate) {
      return selectedDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
    return '';
  };

  const renderCalendar = () => {
    const days = getDaysInMonth(currentDate);
    const today = new Date();

    return (
      <div 
        className="fixed z-[9999] bg-white border border-gray-300 rounded-lg shadow-xl p-4 w-80 transition-opacity duration-200 ease-out" 
        style={{
          top: dropdownPosition.top,
          left: dropdownPosition.left
        }}>
        {/* Header with navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={navigatePrev}
            disabled={!canNavigatePrev()}
            className={`p-1 rounded hover:bg-gray-100 transition-colors ${
              !canNavigatePrev() ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600'
            }`}
          >
            <Icons.ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-2">
            {/* Month Dropdown */}
            <select
              value={currentDate.getMonth()}
              onChange={(e) => handleMonthChange(parseInt(e.target.value))}
              className="px-2 py-1 text-sm bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {getMonthOptions().map(month => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>

            {/* Year Dropdown */}
            <select
              value={currentDate.getFullYear()}
              onChange={(e) => handleYearChange(parseInt(e.target.value))}
              className="px-2 py-1 text-sm bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {getYearOptions().map(year => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={navigateNext}
            disabled={!canNavigateNext()}
            className={`p-1 rounded hover:bg-gray-100 transition-colors ${
              !canNavigateNext() ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600'
            }`}
          >
            <Icons.ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Days of week header */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
            <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => (
            <div key={index} className="flex justify-center">
              {day && (
                <button
                  type="button"
                  onClick={() => handleDateSelect(day)}
                  disabled={!isDateInRange(day)}
                  className={`w-8 h-8 text-sm rounded-full transition-colors ${
                    !isDateInRange(day)
                      ? 'text-gray-300 cursor-not-allowed'
                      : day.toDateString() === today.toDateString()
                      ? 'bg-blue-100 text-blue-700 font-semibold hover:bg-blue-200'
                      : selectedDate && day.toDateString() === selectedDate.toDateString()
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {day.getDate()}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      
      <div
        ref={inputRef}
        onClick={toggleDropdown}
        className="relative w-full p-2 border border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-colors bg-white"
      >
        <div className="flex items-center justify-between">
          <span className={`text-sm ${selectedDate ? 'text-gray-900' : 'text-gray-500'}`}>
            {formatDisplayDate() || placeholder}
          </span>
          <Icons.Calendar className="w-5 h-5 text-gray-400" />
        </div>
        
        {/* Hidden input for form validation */}
        <input
          type="hidden"
          value={value}
          required={required}
        />
      </div>

      {isOpen && renderCalendar()}
    </div>
  );
};

export default DatePicker; 