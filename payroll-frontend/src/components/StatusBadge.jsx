/**
 * StatusBadge Component
 * Displays payroll status with appropriate color and icon
 */

import React from 'react';
import { getStatusColor, getStatusLabel } from '../utils/formatters';

const StatusBadge = ({ status, size = 'md' }) => {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  const statusIcons = {
    draft: '🟨',
    pending_approval: '🟨',
    approved: '🟩',
    paid: '🟩',
    rejected: '🔴',
  };

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full font-semibold ${getStatusColor(
        status
      )} ${sizeClasses[size]}`}
    >
      {statusIcons[status]} {getStatusLabel(status)}
    </span>
  );
};

export default StatusBadge;
