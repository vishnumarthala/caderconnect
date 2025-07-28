'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { InputProps } from '@/types';

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className, 
    type = 'text', 
    placeholder, 
    value, 
    onChange, 
    error, 
    disabled = false, 
    required = false,
    ...props 
  }, ref) => {
    const baseClasses = 'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
    
    const errorClasses = error 
      ? 'border-red-300 bg-red-50 focus:ring-red-500 focus:border-red-500' 
      : 'border-gray-300';

    return (
      <div className="w-full">
        <input
          ref={ref}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={disabled}
          required={required}
          className={cn(
            baseClasses,
            errorClasses,
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;