import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import * as Icons from 'lucide-react';
import { CalendarEvent } from '../../types';

interface CalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CalendarModal: React.FC<CalendarModalProps> = ({ isOpen, onClose }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');

  // Year range constants
  const currentYear = new Date().getFullYear();
  const minYear = currentYear - 125;
  const maxYear = currentYear + 50;

  const mockEvents: CalendarEvent[] = [
    {
      id: '1',
      title: 'Sales Call',
      date: '2024-01-22',
      time: '10:00 AM',
      type: 'call',
      attendees: ['Sarah Johnson', 'Mike Chen']
    },
    {
      id: '2',
      title: 'Client Demo - TechCorp',
      date: '2024-01-23',
      time: '2:00 PM',
      type: 'demo',
      attendees: ['John Smith']
    },
    {
      id: '3',
      title: 'Follow-up Call',
      date: '2024-01-24',
      time: '11:30 AM',
      type: 'call'
    },
    {
      id: '4',
      title: 'Review Task',
      date: '2024-01-25',
      time: '3:00 PM',
      type: 'task',
      attendees: ['Emily Davis', 'Alex Rodriguez']
    },
    {
      id: '5',
      title: 'Contract Review',
      date: '2024-01-26',
      time: '9:00 AM',
      type: 'task'
    }
  ];

  // Helper function to check if a date is within allowed range
  const isDateInRange = (date: Date) => {
    const year = date.getFullYear();
    return year >= minYear && year <= maxYear;
  };

  // Helper function to generate year options
  const getYearOptions = () => {
    const years = [];
    for (let year = maxYear; year >= minYear; year--) {
      years.push(year);
    }
    return years;
  };

  // Helper function to generate month options
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

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const getWeekDays = (date: Date) => {
    const days = [];
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay()); // Start from Sunday
    for (let i = 0; i < 7; i++) {
      days.push(new Date(startOfWeek));
      startOfWeek.setDate(startOfWeek.getDate() + 1);
    }
    return days;
  };

  const getEventsForDate = (date: Date) => {
    return mockEvents.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const getEventTypeColor = (type: string) => {
    const colors = {
      call: 'bg-green-500',
      task: 'bg-orange-500',
      demo: 'bg-purple-500'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-500';
  };

  const nextPeriod = () => {
    let nextDate: Date;

    if (viewMode === 'month') {
      nextDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    } else if (viewMode === 'week') {
      nextDate = new Date(currentDate);
      nextDate.setDate(currentDate.getDate() + 7);
    } else {
      nextDate = new Date(currentDate);
      nextDate.setDate(currentDate.getDate() + 1);
    }

    // Check if the new date is within range
    if (isDateInRange(nextDate)) {
      setCurrentDate(nextDate);
    }
  };

  const prevPeriod = () => {
    let prevDate: Date;

    if (viewMode === 'month') {
      prevDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    } else if (viewMode === 'week') {
      prevDate = new Date(currentDate);
      prevDate.setDate(currentDate.getDate() - 7);
    } else {
      prevDate = new Date(currentDate);
      prevDate.setDate(currentDate.getDate() - 1);
    }

    // Check if the new date is within range
    if (isDateInRange(prevDate)) {
      setCurrentDate(prevDate);
    }
  };

  const canNavigateNext = () => {
    let nextDate: Date;

    if (viewMode === 'month') {
      nextDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    } else if (viewMode === 'week') {
      nextDate = new Date(currentDate);
      nextDate.setDate(currentDate.getDate() + 7);
    } else {
      nextDate = new Date(currentDate);
      nextDate.setDate(currentDate.getDate() + 1);
    }

    return isDateInRange(nextDate);
  };

  const canNavigatePrev = () => {
    let prevDate: Date;

    if (viewMode === 'month') {
      prevDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    } else if (viewMode === 'week') {
      prevDate = new Date(currentDate);
      prevDate.setDate(currentDate.getDate() - 7);
    } else {
      prevDate = new Date(currentDate);
      prevDate.setDate(currentDate.getDate() - 1);
    }

    return isDateInRange(prevDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(null);
  };

  const handleYearChange = (year: number) => {
    const newDate = new Date(year, currentDate.getMonth(), 1);
    if (isDateInRange(newDate)) {
      setCurrentDate(newDate);
    }
  };

  const handleMonthChange = (month: number) => {
    const newDate = new Date(currentDate.getFullYear(), month, 1);
    if (isDateInRange(newDate)) {
      setCurrentDate(newDate);
    }
  };

  const formatPeriodTitle = () => {
    if (viewMode === 'month') {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else if (viewMode === 'week') {
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else {
      return currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    }
  };

  const renderMonthView = () => {
    const days = getDaysInMonth(currentDate);
    const today = new Date();

    return (
      <div className="grid grid-cols-7 gap-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="p-2 text-center text-sm font-medium text-gray-500 border-b">
            {day}
          </div>
        ))}
        {days.map((day, index) => (
          <div key={index} className="min-h-[100px] border border-gray-100 p-1">
            {day && (
              <>
                <button
                  onClick={() => setSelectedDate(day)}
                  className={`w-6 h-6 text-sm rounded-full hover:bg-gray-100 transition-colors ${
                    day.toDateString() === today.toDateString()
                      ? 'bg-blue-100 text-blue-700 font-semibold'
                      : ''
                  } ${
                    selectedDate && day.toDateString() === selectedDate.toDateString()
                      ? 'bg-blue-600 text-white'
                      : ''
                  }`}
                >
                  {day.getDate()}
                </button>
                <div className="mt-1 space-y-1">
                  {getEventsForDate(day).slice(0, 2).map(event => (
                    <div
                      key={event.id}
                      className={`text-xs p-1 rounded text-white truncate ${getEventTypeColor(event.type)}`}
                      title={`${event.time} - ${event.title}`}
                    >
                      {event.title}
                    </div>
                  ))}
                  {getEventsForDate(day).length > 2 && (
                    <div className="text-xs text-gray-500">
                      +{getEventsForDate(day).length - 2} more
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderWeekView = () => {
    const days = getWeekDays(currentDate);
    const today = new Date();

    return (
      <div className="grid grid-cols-7 gap-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="p-2 text-center text-sm font-medium text-gray-500 border-b">
            {day}
          </div>
        ))}
        {days.map((day, index) => (
          <div key={index} className="min-h-[100px] border border-gray-100 p-1">
            <button
              onClick={() => setSelectedDate(day)}
              className={`w-6 h-6 text-sm rounded-full hover:bg-gray-100 transition-colors ${
                day.toDateString() === today.toDateString()
                  ? 'bg-blue-100 text-blue-700 font-semibold'
                  : ''
              } ${
                selectedDate && day.toDateString() === selectedDate.toDateString()
                  ? 'bg-blue-600 text-white'
                  : ''
              }`}
            >
              {day.getDate()}
            </button>
            <div className="mt-1 space-y-1">
              {getEventsForDate(day).slice(0, 2).map(event => (
                <div
                  key={event.id}
                  className={`text-xs p-1 rounded text-white truncate ${getEventTypeColor(event.type)}`}
                  title={`${event.time} - ${event.title}`}
                >
                  {event.title}
                </div>
              ))}
              {getEventsForDate(day).length > 2 && (
                <div className="text-xs text-gray-500">
                  +{getEventsForDate(day).length - 2} more
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderDayView = () => {
    const dayEvents = getEventsForDate(currentDate);
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div className="space-y-2">
        {hours.map(hour => {
          const hourEvents = dayEvents.filter(event => {
            const eventHour = parseInt(event.time.split(':')[0]);
            const isPM = event.time.includes('PM');
            const adjustedHour = isPM && eventHour !== 12 ? eventHour + 12 : eventHour;
            return adjustedHour === hour;
          });

          return (
            <div key={hour} className="flex border-b border-gray-100 min-h-[60px]">
              <div className="w-20 text-sm text-gray-500 p-2">
                {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
              </div>
              <div className="flex-1 p-2">
                {hourEvents.map(event => (
                  <div
                    key={event.id}
                    className={`p-2 rounded mb-1 text-white text-sm ${getEventTypeColor(event.type)}`}
                  >
                    <div className="font-medium">{event.title}</div>
                    <div className="text-xs opacity-90">{event.time}</div>
                    {event.attendees && (
                      <div className="text-xs opacity-90">
                        {event.attendees.join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <Dialog.Title className="text-lg font-semibold text-gray-900">
              Calendar
            </Dialog.Title>
            <div className="flex items-center space-x-4">
              {/* View Mode Toggle */}
              <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                {(['month', 'week', 'day'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      viewMode === mode
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Icons.X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>
          
          <div className="p-6">
            {/* Enhanced Calendar Header with Dropdowns */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                {/* Previous Period Button */}
                <button
                  onClick={prevPeriod}
                  disabled={!canNavigatePrev()}
                  className={`p-2 rounded-lg transition-colors ${
                    canNavigatePrev() 
                      ? 'hover:bg-gray-100 text-gray-700' 
                      : 'text-gray-300 cursor-not-allowed'
                  }`}
                >
                  <Icons.ChevronLeft className="w-5 h-5" />
                </button>

                {/* Month and Year Dropdowns for Month View */}
                {viewMode === 'month' && (
                  <div className="flex items-center space-x-2">
                    {/* Month Dropdown */}
                    <select
                      value={currentDate.getMonth()}
                      onChange={(e) => handleMonthChange(parseInt(e.target.value))}
                      className="px-3 py-2 text-sm font-medium bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                      className="px-3 py-2 text-sm font-medium bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {getYearOptions().map(year => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Period Title for Week/Day Views */}
                {viewMode !== 'month' && (
                  <h2 className="text-xl font-semibold text-gray-900">
                    {formatPeriodTitle()}
                  </h2>
                )}

                {/* Next Period Button */}
                <button
                  onClick={nextPeriod}
                  disabled={!canNavigateNext()}
                  className={`p-2 rounded-lg transition-colors ${
                    canNavigateNext() 
                      ? 'hover:bg-gray-100 text-gray-700' 
                      : 'text-gray-300 cursor-not-allowed'
                  }`}
                >
                  <Icons.ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Today Button */}
              <button
                onClick={goToToday}
                className="flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <Icons.Calendar className="w-4 h-4 mr-2" />
                Today
              </button>
            </div>



            {/* Calendar Content */}
            <div className="mb-6">
              {viewMode === 'month' && renderMonthView()}
              {viewMode === 'week' && renderWeekView()}
              {viewMode === 'day' && renderDayView()}
            </div>

            {/* Selected Date Events */}
            {selectedDate && viewMode === 'month' && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Events for {selectedDate.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })}
                </h3>
                <div className="space-y-3">
                  {getEventsForDate(selectedDate).map(event => (
                    <div key={event.id} className="flex items-center p-3 bg-gray-50 rounded-lg">
                      <div className={`w-3 h-3 rounded-full mr-3 ${getEventTypeColor(event.type)}`}></div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{event.title}</div>
                        <div className="text-sm text-gray-600">{event.time}</div>
                        {event.attendees && (
                          <div className="text-sm text-gray-500">
                            Attendees: {event.attendees.join(', ')}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 capitalize">
                        {event.type}
                      </div>
                    </div>
                  ))}
                  {getEventsForDate(selectedDate).length === 0 && (
                    <p className="text-gray-500 text-center py-4">No events scheduled for this date</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default CalendarModal;