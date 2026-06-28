/**
 * @file frontend/src/components/ui/Input.tsx
 * @description Componente input base integrado con accesibilidad y estados de error.
 */

import { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', id, ...props }, ref) => {
    // Generar un ID único si no se provee uno, para enlazar el label y el input
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className="w-full flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-gray-900">
            {label}
          </label>
        )}
        
        <input
          id={inputId}
          ref={ref}
          className={`
            w-full rounded-brand px-3 py-2 text-base transition-colors
            input-glass
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? 'border-danger focus:border-danger focus:ring-1 focus:ring-danger' : ''}
            ${className}
          `}
          {...props}
        />

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

Input.displayName = 'Input';
