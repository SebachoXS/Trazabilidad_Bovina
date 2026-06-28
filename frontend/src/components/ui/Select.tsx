/**
 * @file frontend/src/components/ui/Select.tsx
 * @description Componente Select base integrado con accesibilidad y estados de error.
 */

import { forwardRef } from 'react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options?: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, options, className = '', id, children, ...props }, ref) => {
    const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className="w-full flex flex-col gap-1">
        {label && (
          <label htmlFor={selectId} className="text-sm font-medium text-gray-900">
            {label}
          </label>
        )}
        
        <select
          id={selectId}
          ref={ref}
          className={`
            w-full rounded-brand px-3 py-2 text-base transition-colors
            input-glass bg-white
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? 'border-danger focus:border-danger focus:ring-1 focus:ring-danger' : ''}
            ${className}
          `}
          {...props}
        >
          {(!options && !children) && <option value="" disabled>Seleccione una opción</option>}
          {options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
          {children}
        </select>

        {error && (
          <span className="text-sm text-danger mt-1">
            {error}
          </span>
        )}

        {helperText && !error && (
          <span className="text-sm text-gray-600 mt-1">
            {helperText}
          </span>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
