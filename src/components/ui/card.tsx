'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { BaseComponentProps } from '@/types';

interface CardProps extends BaseComponentProps {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  border?: boolean;
  hover?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ 
    className, 
    children, 
    padding = 'md', 
    shadow = 'md', 
    border = true, 
    hover = false,
    ...props 
  }, ref) => {
    const baseClasses = 'bg-white rounded-lg';
    
    const paddingClasses = {
      none: '',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6'
    };

    const shadowClasses = {
      none: '',
      sm: 'shadow-sm',
      md: 'shadow-md',
      lg: 'shadow-lg',
      xl: 'shadow-xl'
    };

    const borderClasses = border ? 'border border-gray-200' : '';
    const hoverClasses = hover ? 'hover:shadow-lg transition-shadow duration-200' : '';

    return (
      <div
        ref={ref}
        className={cn(
          baseClasses,
          paddingClasses[padding],
          shadowClasses[shadow],
          borderClasses,
          hoverClasses,
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

// Card Header Component
interface CardHeaderProps extends BaseComponentProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, children, title, subtitle, action, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex items-center justify-between pb-4 border-b border-gray-200', className)}
        {...props}
      >
        <div className="flex-1">
          {title && (
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          )}
          {subtitle && (
            <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
          )}
          {children}
        </div>
        {action && (
          <div className="ml-4 flex-shrink-0">
            {action}
          </div>
        )}
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader';

// Card Content Component
interface CardContentProps extends BaseComponentProps {
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, children, padding = 'none', ...props }, ref) => {
    const paddingClasses = {
      none: '',
      sm: 'pt-3',
      md: 'pt-4',
      lg: 'pt-6'
    };

    return (
      <div
        ref={ref}
        className={cn(paddingClasses[padding], className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardContent.displayName = 'CardContent';

// Card Footer Component
export const CardFooter = forwardRef<HTMLDivElement, BaseComponentProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('pt-4 border-t border-gray-200 mt-4', className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardFooter.displayName = 'CardFooter';

export { Card };
export default Card;