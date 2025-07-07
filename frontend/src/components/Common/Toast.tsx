import React, { useEffect } from 'react';
import * as Icons from 'lucide-react';
import { useToastStore } from '../../store/useToastStore';

const Toast: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <Icons.CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <Icons.XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <Icons.AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'info':
        return <Icons.Info className="w-5 h-5 text-blue-500" />;
      default:
        return null;
    }
  };

  const getBgColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-start p-4 rounded-lg shadow-lg border ${getBgColor(toast.type)} animate-fade-in-up`}
          role="alert"
        >
          <div className="flex-shrink-0">{getIcon(toast.type)}</div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-gray-900">{toast.title}</h3>
            <div className="mt-1 text-sm text-gray-600">{toast.message}</div>
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="ml-4 flex-shrink-0 inline-flex text-gray-400 hover:text-gray-500 focus:outline-none"
          >
            <Icons.X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default Toast; 