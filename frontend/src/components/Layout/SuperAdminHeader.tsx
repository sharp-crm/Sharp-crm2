import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useNotificationStore } from '../../store/useNotificationStore';
import { getRoleDisplayName } from '../../utils/roleAccess';
import avatar from '../../Assets/avatar.png';
import CalendarModal from '../Common/CalendarModal';
import NotificationPanel from '../Common/NotificationsPanel';

interface SuperAdminHeaderProps {
  onToggleSidebar: () => void;
}

const SuperAdminHeader: React.FC<SuperAdminHeaderProps> = ({ onToggleSidebar }) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const { user, logout } = useAuthStore();
  const { notifications, unreadCount } = useNotificationStore();
  const roleDisplayName = getRoleDisplayName();
  const notificationRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    await logout();
  };

  const getUserDisplayName = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user?.firstName || user?.email || 'Super Admin';
  };

  // Click outside handler for notifications
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
          {/* Left side - Super Admin Badge */}
          <div className="flex items-center">
            <div className="flex items-center gap-2 bg-purple-50 px-3 py-1 rounded-lg border border-purple-200">
              <Icons.Crown className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-700">Super Admin</span>
            </div>
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center space-x-4">
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
                  alt={getUserDisplayName()}
                  className="w-8 h-8 rounded-full object-cover"
                />
                <div className="text-left">
                  <div className="text-sm font-medium text-gray-900">{getUserDisplayName()}</div>
                  <div className="text-xs text-gray-500">{roleDisplayName}</div>
                </div>
              </Link>

              <button
                onClick={handleLogout}
                className="p-2 text-red-600 hover:text-red-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Icons.LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Calendar Modal */}
      <CalendarModal isOpen={showCalendar} onClose={() => setShowCalendar(false)} />
    </>
  );
};

export default SuperAdminHeader; 