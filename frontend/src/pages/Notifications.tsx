import React from 'react';
import * as Icons from 'lucide-react';
import { useNotificationStore } from '../store/useNotificationStore';
import PageHeader from '../components/Common/PageHeader';

const Notifications: React.FC = () => {
  const { notifications, markAsRead, markAllAsRead, clearAllNotifications } = useNotificationStore();

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

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

  return (
    <div className="p-6">
      <PageHeader
        title="Notifications"
        subtitle="Stay up to date with recent activity"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Notifications' }
        ]}
      />

      {/* Action Buttons */}
      {notifications.length > 0 && (
        <div className="flex justify-end space-x-2 mb-4">
          <button
            onClick={markAllAsRead}
            className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
          >
            Mark All as Read
          </button>
          <button
            onClick={clearAllNotifications}
            className="px-4 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
          >
            Clear All
          </button>
        </div>
      )}

      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Icons.Bell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
            <p className="text-sm">You're all caught up! New notifications will appear here.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {notifications.map((notification) => (
              <li 
                key={notification.id} 
                className={`p-4 flex items-start space-x-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                  !notification.read ? 'bg-blue-50' : ''
                }`}
                onClick={() => !notification.read && markAsRead(notification.id)}
              >
                <div className="mt-1">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1">
                  {notification.title && (
                    <p className="text-sm font-medium text-gray-900 mb-1">{notification.title}</p>
                  )}
                  <p className="text-sm text-gray-800">{notification.message}</p>
                  <p className="text-xs text-gray-500 mt-1">{formatTime(notification.timestamp)}</p>
                </div>
                {!notification.read && (
                  <span className="text-xs text-white bg-blue-500 rounded-full px-2 py-0.5">New</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Notifications;
