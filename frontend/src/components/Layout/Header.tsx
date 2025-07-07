import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useNotificationStore } from '../../store/useNotificationStore';
import avatar from '../../Assets/avatar.png';

import AddNewModal from '../Common/AddNewModal';
import CalendarModal from '../Common/CalendarModal';
import NotificationPanel from '../Common/NotificationsPanel';

interface HeaderProps {
  onToggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAddNew, setShowAddNew] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const notificationRef = useRef<HTMLDivElement>(null);
  const user = useAuthStore((s) => s.user);
  const { notifications, unreadCount } = useNotificationStore();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left: Toggle + Search */}
          <div className="flex items-center space-x-4 w-1/2">
            <button
              onClick={onToggleSidebar}
              className="md:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
            >
              <Icons.Menu className="w-5 h-5" />
            </button>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
            />
          </div>

          {/* Right: Actions */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowAddNew(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Icons.Plus className="w-4 h-4 mr-2" />
              Add New
            </button>

            <button
              onClick={() => setShowCalendar(true)}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Icons.Calendar className="w-5 h-5" />
            </button>

            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors relative"
              >
                <Icons.Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
              {showNotifications && (
                <NotificationPanel
                  notifications={notifications}
                  onClose={() => setShowNotifications(false)}
                />
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Link
                to="/profile"
                className="flex items-center space-x-2 hover:bg-gray-100 rounded-lg p-2 transition-colors"
              >
                <img
                  src={avatar}
                  alt={`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'User'}
                  className="w-8 h-8 rounded-full object-cover"
                />
                <div className="text-left">
                  <div className="text-sm font-medium text-gray-900">{`${user?.firstName || ''} ${user?.lastName || ''}`.trim()}</div>
                  <div className="text-xs text-gray-500">{user?.role}</div>
                </div>
              </Link>

              <Link
                to="/logout"
                className="p-2 text-red-600 hover:text-red-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Icons.LogOut className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Modals from Common folder */}
      <AddNewModal isOpen={showAddNew} onClose={() => setShowAddNew(false)} />
      <CalendarModal isOpen={showCalendar} onClose={() => setShowCalendar(false)} />
    </>
  );
};

export default Header;
