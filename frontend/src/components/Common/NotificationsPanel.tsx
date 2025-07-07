import React from 'react';
import * as Icons from 'lucide-react';
import { Notification } from '../../types';
import { Link } from 'react-router-dom';
import { useNotificationStore } from '../../store/useNotificationStore';

interface NotificationsPanelProps {
  notifications: Notification[];
  onClose: () => void;
}

const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ notifications, onClose }) => {
  const { markAsRead, markAllAsRead } = useNotificationStore();

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <Icons.CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <Icons.AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <Icons.AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Icons.Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
  };

  const hasUnreadNotifications = notifications.some(n => !n.read);

  return (
    <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
        <div className="flex items-center space-x-2">
          {hasUnreadNotifications && (
            <button
              onClick={markAllAsRead}
              className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
            >
              Mark all read
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Icons.X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>
      
      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <Icons.Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p>No notifications</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.slice(0, 5).map((notification) => (
              <div
                key={notification.id}
                className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                  !notification.read ? 'bg-blue-50' : ''
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start space-x-3">
                  {getNotificationIcon(notification.type)}
                  <div className="flex-1 min-w-0">
                    {notification.title && (
                      <p className="text-sm font-medium text-gray-900">
                        {notification.title}
                      </p>
                    )}
                    <p className="text-sm text-gray-600 mt-1">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      {formatTime(notification.timestamp)}
                    </p>
                  </div>
                  {!notification.read && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="p-4 border-t border-gray-200">
        <Link
          to="/notifications"
          onClick={onClose}
          className="block text-center text-sm text-blue-600 hover:underline py-2"
        >
          View All Notifications
        </Link>
      </div>
    </div>
  );
};

export default NotificationsPanel;