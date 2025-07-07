import React from 'react';

interface StatusBadgeProps {
  status: string;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, variant = 'default' }) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'info':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusVariant = (status: string) => {
    const lowercaseStatus = status.toLowerCase();
    if (['active', 'completed', 'won', 'qualified', 'closed won'].includes(lowercaseStatus)) {
      return 'success';
    }
    if (['pending', 'in progress', 'contacted', 'negotiation'].includes(lowercaseStatus)) {
      return 'warning';
    }
    if (['inactive', 'lost', 'cancelled', 'closed lost'].includes(lowercaseStatus)) {
      return 'error';
    }
    if (['new', 'scheduled', 'open'].includes(lowercaseStatus)) {
      return 'info';
    }
    return 'default';
  };

  const finalVariant = variant === 'default' ? getStatusVariant(status) : variant;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getVariantClasses()}`}>
      {status}
    </span>
  );
};

export default StatusBadge;