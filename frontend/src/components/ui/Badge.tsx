/**
 * @file frontend/src/components/ui/Badge.tsx
 * @description Componente Badge para mostrar el estado del animal.
 */

import { forwardRef } from 'react';

export type AnimalState = 'ACTIVO' | 'EN_RETIRO' | 'GESTANTE' | 'VENDIDO' | 'MUERTO' | 'DADO_DE_BAJA' | 'INACTIVO';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  estado: AnimalState;
}

const stateStyles: Record<AnimalState, string> = {
  ACTIVO: 'bg-primary/10 text-primary border-primary/20',
  EN_RETIRO: 'bg-danger/10 text-danger border-danger/20',
  GESTANTE: 'bg-amber-900/50 text-amber-400 border-amber-500/30',
  VENDIDO: 'bg-white/5 text-[var(--text-muted)] border-white/10',
  MUERTO: 'bg-black/40 text-[var(--text-muted)] border-white/10',
  DADO_DE_BAJA: 'bg-gray-100 text-gray-800 border-gray-200',
  INACTIVO: 'bg-gray-100 text-gray-800 border-gray-200',
};

const stateLabels: Record<AnimalState, string> = {
  ACTIVO: 'Activo',
  EN_RETIRO: 'En Retiro',
  GESTANTE: 'Gestante',
  VENDIDO: 'Vendido',
  MUERTO: 'Fallecido',
  DADO_DE_BAJA: 'Baja',
  INACTIVO: 'Inactivo',
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ estado, className = '', ...props }, ref) => {
    const style = stateStyles[estado] || stateStyles['ACTIVO'];
    const label = stateLabels[estado] || estado;

    return (
      <span
        ref={ref}
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${style} ${className}`}
        {...props}
      >
        {label}
      </span>
    );
  }
);

Badge.displayName = 'Badge';
