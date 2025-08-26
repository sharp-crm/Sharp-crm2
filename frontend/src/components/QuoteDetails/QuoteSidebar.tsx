import React from 'react';
import * as Icons from 'lucide-react';
import { Quote, Task } from '../../types';

interface QuoteSidebarProps {
  quote: Quote;
  tasks?: Task[];
}

const QuoteSidebar: React.FC<QuoteSidebarProps> = ({ quote, tasks = [] }) => {
  // Calculate counts based on quote data
  const getNotesCount = () => {
    if (!quote.notes || quote.notes.trim() === '') {
      return 0;
    }
    
    // Notes are stored as timestamp: content separated by \n\n
    // Count the number of note entries
    const noteEntries = quote.notes.split('\n\n').filter(entry => entry.trim() !== '');
    return noteEntries.length;
  };

  const getOpenActivitiesCount = () => {
    return tasks.filter(task => task.status !== 'Completed' && !task.isDeleted).length;
  };

  const getClosedActivitiesCount = () => {
    return tasks.filter(task => task.status === 'Completed' && !task.isDeleted).length;
  };

  const getEmailsCount = () => {
    return 0; // No emails data available
  };

  const sidebarItems = [
    { 
      id: 'notes', 
      label: 'Notes', 
      icon: Icons.FileText, 
      count: getNotesCount() 
    },
    { 
      id: 'open-activities', 
      label: 'Open Tasks', 
      icon: Icons.Activity, 
      count: getOpenActivitiesCount() 
    },
    { 
      id: 'closed-activities', 
      label: 'Closed Tasks', 
      icon: Icons.CheckCircle, 
      count: getClosedActivitiesCount() 
    },
    { 
      id: 'emails', 
      label: 'Emails', 
      icon: Icons.Mail, 
      count: getEmailsCount() 
    }
  ];

  const handleSectionClick = (sectionId: string) => {
    // Scroll to the corresponding section in the Overview tab
    const element = document.getElementById(`section-${sectionId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      
      // Add highlight effect to the section title
      const titleElement = element.querySelector('h3');
      if (titleElement) {
        titleElement.classList.add('highlight-section-title');
        setTimeout(() => {
          titleElement.classList.remove('highlight-section-title');
        }, 1000);
      }
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-2 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900">Related List</h3>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-3 space-y-1">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleSectionClick(item.id)}
              className="w-full flex items-center justify-between px-2 py-1.5 rounded-md text-sm transition-colors text-gray-700 hover:bg-gray-50 hover:text-gray-900"
            >
              <div className="flex items-center space-x-2">
                <item.icon className="w-4 h-4" />
                <span className="font-medium">{item.label}</span>
              </div>
              {item.count > 0 && (
                <span className="bg-gray-200 text-gray-700 text-xs px-1.5 py-0.5 rounded-full font-medium">
                  {item.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default QuoteSidebar; 