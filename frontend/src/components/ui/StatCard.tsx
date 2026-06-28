/**
 * @file frontend/src/components/ui/StatCard.tsx
 * @description Tarjeta visual para desplegar una métrica numérica en el Dashboard.
 */

import React from 'react';

export interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color?: 'primary' | 'danger' | 'amber' | 'blue' | 'gray';
  description?: string;
}

const colorStyles = {
  primary: 'bg-primary/10 text-primary border-primary/20',
  danger: 'bg-danger/10 text-danger border-danger/20',
  amber: 'bg-amber-100 text-amber-600 border-amber-200',
  blue: 'bg-blue-100 text-blue-600 border-blue-200',
  gray: 'bg-gray-100 text-gray-600 border-gray-200',
};

export function StatCard({ title, value, icon, color = 'primary', description }: StatCardProps) {
  const badgeStyle = colorStyles[color];

  return (
    <div className="glass-panel border border-white/10 rounded-brand-xl p-6 shadow-sm hover:shadow-md transition-shadow flex items-start justify-between">
      <div>
        <h3 className="text-[var(--text-muted)] font-medium text-sm mb-1">{title}</h3>
        <p className="text-3xl font-bold text-white">{value}</p>
        {description && (
          <p className="text-sm text-white/50 mt-1">{description}</p>
        )}
      </div>
      <div className={`p-3 rounded-full border ${badgeStyle}`}>
        {icon}
      </div>
    </div>
  );
}
