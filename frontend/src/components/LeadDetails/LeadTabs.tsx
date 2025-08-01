import React from 'react';
import * as Icons from 'lucide-react';
import { Lead } from '../../api/services';

// Add highlight effect styles
const highlightStyles = `
  .highlight-section-title {
    animation: highlightPulse 1s ease-in-out;
  }
  
  @keyframes highlightPulse {
    0% { background-color: #fef3c7; }
    50% { background-color: #fde68a; }
    100% { background-color: transparent; }
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = highlightStyles;
  document.head.appendChild(styleElement);
}

interface LeadTabsProps {
  activeTab: 'overview' | 'timeline';
  onTabChange: (tab: 'overview' | 'timeline') => void;
  lead: Lead;
  getUserDisplayName: (userId: string) => string;
}

const LeadTabs: React.FC<LeadTabsProps> = ({
  activeTab,
  onTabChange,
  lead,
  getUserDisplayName
}) => {
  return (
    <div className="h-full flex flex-col">
      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="flex space-x-8">
          <button
            onClick={() => onTabChange('overview')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => onTabChange('timeline')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'timeline'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Timeline
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'overview' ? (
          <OverviewTab lead={lead} getUserDisplayName={getUserDisplayName} />
        ) : (
          <TimelineTab lead={lead} getUserDisplayName={getUserDisplayName} />
        )}
      </div>
    </div>
  );
};

// Overview Tab Component
const OverviewTab: React.FC<{ lead: Lead; getUserDisplayName: (userId: string) => string }> = ({
  lead,
  getUserDisplayName
}) => {
  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Lead Information */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Lead Information</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Lead Owner</label>
                <p className="text-gray-900">{getUserDisplayName(lead.leadOwner)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Title</label>
                <p className="text-gray-900">{lead.title || '—'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Phone</label>
                <p className="text-gray-900">{lead.phone || '—'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Lead Source</label>
                <p className="text-gray-900">{lead.leadSource || '—'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Company</label>
                <p className="text-gray-900">{lead.company}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Lead Name</label>
                <p className="text-gray-900">{lead.firstName} {lead.lastName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Email</label>
                <p className="text-gray-900">{lead.email || '—'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Lead Status</label>
                <p className="text-gray-900">{lead.leadStatus}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Address Information */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Address Information</h3>
          {(lead.street || lead.city || lead.state || lead.country) ? (
            <div className="space-y-2">
              {lead.street && <p className="text-gray-900">{lead.street}</p>}
              {lead.area && <p className="text-gray-900">{lead.area}</p>}
              <p className="text-gray-900">
                {[lead.city, lead.state, lead.zipCode].filter(Boolean).join(', ')}
              </p>
              {lead.country && <p className="text-gray-900">{lead.country}</p>}
            </div>
          ) : (
            <p className="text-gray-500 italic">No address information provided</p>
          )}
        </div>

        {/* Notes Section */}
        <div id="section-notes" className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Notes</h3>
            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              Add a note
            </button>
          </div>
          <div className="space-y-3">
            <div className="text-center py-8">
              <Icons.FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No notes yet</p>
            </div>
          </div>
        </div>

        {/* Products Section */}
        <div id="section-products" className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Products</h3>
            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              Add Product
            </button>
          </div>
          <div className="text-center py-8">
            <Icons.Package className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No records found</p>
          </div>
        </div>

        {/* Open Activities Section */}
        <div id="section-openActivities" className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Open Activities</h3>
            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              Add New
            </button>
          </div>
          <div className="text-center py-8">
            <Icons.Activity className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No open activities yet</p>
          </div>
        </div>

        {/* Closed Activities Section */}
        <div id="section-closedActivities" className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Closed Activities</h3>
            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              Add New
            </button>
          </div>
          <div className="text-center py-8">
            <Icons.CheckCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No closed activities yet</p>
          </div>
        </div>

        {/* Emails Section */}
        <div id="section-emails" className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Emails</h3>
            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              Add New
            </button>
          </div>
          <div className="text-center py-8">
            <Icons.Mail className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No emails yet</p>
          </div>
        </div>

        {/* Audit Information */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Audit Information</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Created:</span>
              <span className="text-gray-900">{new Date(lead.createdAt || '').toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Created By:</span>
              <span className="text-gray-900">{lead.createdBy ? getUserDisplayName(lead.createdBy) : 'Unknown User'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Updated:</span>
              <span className="text-gray-900">{lead.updatedAt ? new Date(lead.updatedAt).toLocaleString() : 'Not updated'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Updated By:</span>
              <span className="text-gray-900">{lead.updatedBy ? getUserDisplayName(lead.updatedBy) : 'Unknown User'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Timeline Tab Component
const TimelineTab: React.FC<{ lead: Lead; getUserDisplayName: (userId: string) => string }> = ({
  lead,
  getUserDisplayName
}) => {
  // Mock timeline data - in a real app, this would come from an API
  const timelineEvents = [
    {
      id: 1,
      type: 'created',
      title: 'Lead Created',
      description: `Lead ${lead.firstName} ${lead.lastName} was created`,
      timestamp: new Date(lead.createdAt),
      user: getUserDisplayName(lead.createdBy)
    },
    {
      id: 2,
      type: 'updated',
      title: 'Lead Updated',
      description: 'Lead information was updated',
      timestamp: lead.updatedAt ? new Date(lead.updatedAt) : new Date(lead.createdAt),
      user: getUserDisplayName(lead.updatedBy || lead.createdBy)
    }
  ];

  return (
    <div className="p-6">
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Activity Timeline</h3>
        </div>
        
        <div className="p-6">
          <div className="space-y-6">
            {timelineEvents.map((event, index) => (
              <div key={event.id} className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Icons.Activity className="w-4 h-4 text-blue-600" />
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">{event.title}</p>
                    <p className="text-sm text-gray-500">
                      {event.timestamp.toLocaleDateString()} {event.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                  <p className="text-xs text-gray-500 mt-1">by {event.user}</p>
                </div>
              </div>
            ))}
            
            {timelineEvents.length === 0 && (
              <div className="text-center py-8">
                <Icons.Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No activity recorded yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadTabs; 