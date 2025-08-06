import React from 'react';
import * as Icons from 'lucide-react';
import { Deal, Task } from '../../api/services';

interface DealSidebarProps {
  deal?: Deal;
  tasks?: Task[];
}

const DealSidebar: React.FC<DealSidebarProps> = ({ deal, tasks = [] }) => {
  const getOpenActivitiesCount = () => {
    return tasks.filter(task => task.status !== 'Completed').length;
  };

  const getClosedActivitiesCount = () => {
    return tasks.filter(task => task.status === 'Completed').length;
  };

  const sidebarItems = [
    { id: 'notes', label: 'Notes', icon: Icons.FileText, count: deal?.notes ? deal.notes.split('\n\n').length : 0 },
    { id: 'openActivities', label: 'Open Activities', icon: Icons.Activity, count: getOpenActivitiesCount() },
    { id: 'closedActivities', label: 'Closed Activities', icon: Icons.CheckCircle, count: getClosedActivitiesCount() },
    { id: 'products', label: 'Products', icon: Icons.Package, count: deal?.relatedProductIds?.length || 0 },
    { id: 'quotes', label: 'Quotes', icon: Icons.FileText, count: deal?.relatedQuoteIds?.length || 0 },
    { id: 'contacts', label: 'Contacts', icon: Icons.Users, count: deal?.relatedContactIds?.length || 0 },
    { id: 'emails', label: 'Emails', icon: Icons.Mail, count: 0 }
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
      <div className="p-3 border-b border-gray-200">
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

export default DealSidebar; 