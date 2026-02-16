import React from 'react';
import { Check } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, checked, ...props }, ref) => {
    return (
      <label className="flex items-start gap-3 cursor-pointer group">
        <div className="relative flex items-center justify-center shrink-0 mt-0.5">
          <input ref={ref} type="checkbox" checked={checked} className="peer sr-only" {...props} />
          <div
            className={cn(
              'w-5 h-5 rounded-lg border border-white/10 bg-white/5 transition-all duration-200',
              'peer-checked:bg-primary peer-checked:border-primary peer-checked:shadow-[0_0_15px_rgba(59,130,246,0.5)]',
              'group-hover:border-primary/50 group-hover:bg-primary/5',
              'peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[#111827]',
              className
            )}
          />
          <Check
            className={cn(
              'absolute w-3.5 h-3.5 text-white transition-all duration-200 scale-50 opacity-0',
              'peer-checked:scale-110 peer-checked:opacity-100'
            )}
            strokeWidth={4}
          />
        </div>
        {(label || description) && (
          <div className="flex flex-col">
            {label && (
              <span className="text-sm font-bold text-gray-200 select-none group-hover:text-white transition-colors">
                {label}
              </span>
            )}
            {description && (
              <span className="text-xs text-gray-500 leading-relaxed group-hover:text-gray-400 transition-colors">
                {description}
              </span>
            )}
          </div>
        )}
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export default Checkbox;
