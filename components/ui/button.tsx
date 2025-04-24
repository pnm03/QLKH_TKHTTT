import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'default', size = 'default', ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';
    
    const variants = {
      default: 'bg-blue-600 text-white hover:bg-blue-700',
      outline: 'border border-gray-300 bg-transparent hover:bg-gray-100 text-gray-700',
      ghost: 'bg-transparent hover:bg-gray-100 text-gray-700',
      link: 'bg-transparent underline-offset-4 hover:underline text-blue-600 hover:bg-transparent',
    };
    
    const sizes = {
      default: 'h-10 py-2 px-4',
      sm: 'h-8 px-3 text-sm',
      lg: 'h-12 px-8 text-lg',
    };
    
    const variantStyle = variants[variant];
    const sizeStyle = sizes[size];
    
    return (
      <button
        className={`${baseStyles} ${variantStyle} ${sizeStyle} ${className}`}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
