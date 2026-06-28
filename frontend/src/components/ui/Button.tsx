/**
 * @file frontend/src/components/ui/Button.tsx
 * @description Componente botón base con variantes de diseño y estados de carga.
 */

import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  isLoading?: boolean;
  fullWidth?: boolean;
}

const variantStyles = {
  primary: 'bg-primary text-white hover:bg-primary-light',
  secondary: 'bg-secondary text-white hover:bg-secondary-light',
  outline: 'border-2 border-primary text-primary hover:bg-primary/10',
  danger: 'bg-danger text-white hover:bg-danger-light',
  ghost: 'text-primary hover:bg-primary/10',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', isLoading = false, fullWidth = false, children, disabled, ...props }, ref) => {
    
    const baseStyles = 'font-medium py-2.5 px-4 rounded-brand flex items-center justify-center gap-2 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary';
    const widthStyle = fullWidth ? 'w-full' : '';
    const disabledStyle = (disabled || isLoading) ? 'opacity-60 cursor-not-allowed' : '';
    const variantStyle = variantStyles[variant];

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${widthStyle} ${variantStyle} ${disabledStyle} ${className}`}
        {...props}
      >
        {isLoading && <Loader2 className="w-5 h-5 animate-spin" />}
        {!isLoading && children}
      </button>
    );
  }
);

Button.displayName = 'Button';
