import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  loadingText?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading,
      loadingText,
      icon,
      iconPosition = 'left',
      fullWidth,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const variants = {
      primary:
        'bg-primary hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20 active:scale-95',
      secondary:
        'bg-gray-800 hover:bg-gray-700 text-white border border-gray-700/50 active:scale-95',
      ghost: 'text-gray-400 hover:text-white hover:bg-white/5 active:scale-95',
      danger: 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20 active:scale-95',
      success:
        'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 active:scale-95',
    };

    const sizes = {
      sm: 'px-3 py-1 text-xs rounded-lg',
      md: 'px-5 py-1.5 text-sm rounded-xl font-bold h-[34px]',
      lg: 'px-6 py-2.5 text-base rounded-xl font-bold',
    };

    return (
      <button
        ref={ref}
        disabled={isLoading || disabled}
        className={cn(
          'flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap',
          variants[variant],
          sizes[size],
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {isLoading ? (
          <>
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
            {loadingText || children}
          </>
        ) : (
          <>
            {icon && iconPosition === 'left' && <span className="mr-2">{icon}</span>}
            {children}
            {icon && iconPosition === 'right' && <span className="ml-2">{icon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
