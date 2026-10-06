import React from 'react';

export default function Badge({ variant = 'default', children, className = '' }) {
  const getStyles = () => {
    switch (variant.toUpperCase()) {
      case 'ACTIVE':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'INACTIVE':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'SUPER_ADMIN':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'PMO':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'TEAM_MEMBER':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStyles()} ${className}`}
    >
      {children}
    </span>
  );
}
