import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import * as Icons from 'lucide-react';
import {
  modulesItem,
  reportsItems,
  analyticsItems,
  settingsItems,
  chatItems,
  getSidebarItems
} from '../../data/sidebarData';
import { SidebarItem } from '../../types';
import { useAuthStore } from '../../store/useAuthStore';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggle }) => {
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const user = useAuthStore((s) => s.user);
  const [sidebarItems, setSidebarItems] = useState<SidebarItem[]>([]);

  // Update sidebar items when user role changes
  useEffect(() => {
    const items = getSidebarItems();
    setSidebarItems(items);
  }, [user?.role]);

  const toggleExpanded = (path: string) => {
    setExpandedItems(prev =>
      prev.includes(path) ? prev.filter(item => item !== path) : [...prev, path]
    );
  };

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  const renderSidebarItem = (item: SidebarItem, level = 0) => {
    const Icon = Icons[item.icon as keyof typeof Icons] as any;
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.path);
    const active = isActive(item.path);

    return (
      <div key={item.path} className="mb-1">
        <div
          className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${active
            ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-500'
            : 'text-gray-700 hover:bg-gray-100'
            } ${level > 0 ? 'ml-4' : ''}`}
          onClick={() => {
            if (hasChildren) toggleExpanded(item.path);
          }}
        >
          <Link
            to={item.path}
            className="flex items-center flex-1 min-w-0"
            onClick={(e) => {
              if (hasChildren) e.preventDefault();
            }}
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && (
              <span className="ml-3 text-sm font-medium truncate">{item.name}</span>
            )}
          </Link>
          {hasChildren && !isCollapsed && (
            <Icons.ChevronDown
              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            />
          )}
        </div>
        {hasChildren && isExpanded && !isCollapsed && (
          <div className="mt-1 space-y-1">
            {item.children!.map(child => renderSidebarItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`bg-white border-r border-gray-200 h-full flex flex-col transition-width duration-300 ${isCollapsed ? 'w-16' : 'w-64'
      }`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        {!isCollapsed && (
          <div className="flex items-center">
            <Icons.Zap className="w-8 h-8 text-blue-600" />
            <Link
              to="/"
              className="ml-2 text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors duration-200 cursor-pointer"
            >
              <span className="ml-2 text-xl font-bold text-gray-900">SharpCRM</span>

            </Link>
          </div>
        )}
        <button 
          onClick={onToggle}
          className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <Icons.Menu className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Modules Section */}
        <div className="space-y-1">
          {renderSidebarItem({
            ...modulesItem,
            children: sidebarItems
          })}
        </div>

        {/* Reports */}
        <div className="border-t border-gray-200 pt-4">
          {reportsItems.map(item => renderSidebarItem(item))}
        </div>

        {/* Analytics */}
        <div className="border-t border-gray-200 pt-4">
          {analyticsItems.map(item => renderSidebarItem(item))}
        </div>

        {/* Settings */}
        <div className="border-t border-gray-200 pt-4">
          {settingsItems.map(item => renderSidebarItem(item))}
        </div>

        {/* Utilities */}
        <div className="border-t border-gray-200 pt-4 space-y-1">
          <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {!isCollapsed && 'Utilities'}
          </div>
          <Link to="/integrations/email" className="flex items-center px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-100">
            <Icons.Mail className="w-5 h-5" />
            {!isCollapsed && <span className="ml-3"><b>Email Integration</b></span>}
          </Link>
          {/* Chat */}
          <div className="border-t border-gray-200 pt-4">
            {chatItems.map(item => renderSidebarItem(item))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
