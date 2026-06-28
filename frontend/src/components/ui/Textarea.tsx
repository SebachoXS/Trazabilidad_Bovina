/**
 * @file frontend/src/components/ui/Textarea.tsx
 * @description Componente Textarea base integrado con accesibilidad y estados de error.
 */

import { forwardRef } from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, className = '', id, rows = 3, ...props }, ref) => {
    const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className="w-full flex flex-col gap-1">
        {label && (
          <label htmlFor={textareaId} className="text-sm font-medium text-gray-900">
            {label}
          </label>
        )}
        
        <textarea
          id={textareaId}
          ref={ref}
          rows={rows}
          className={`
            w-full rounded-brand px-3 py-2 text-base transition-colors resize-y
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

Textarea.displayName = 'Textarea';
