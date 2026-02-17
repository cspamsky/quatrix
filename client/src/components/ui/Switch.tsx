import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}

const Switch = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  className,
}: SwitchProps) => {
  return (
    <label
      className={cn(
        'flex items-start gap-3 cursor-pointer group select-none',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      <div className="relative flex items-center shrink-0 mt-0.5">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={checked}
          onChange={(e) => !disabled && onChange(e.target.checked)}
          disabled={disabled}
        />
        {/* Track */}
        <div
          className={cn(
            'w-10 h-5 bg-white/5 border border-white/10 rounded-full transition-all duration-300',
            'peer-checked:bg-primary/20 peer-checked:border-primary/50',
            'group-hover:border-white/20'
          )}
        />
        {/* Thumb */}
        <div
          className={cn(
            'absolute left-1 top-1 w-3 h-3 bg-gray-400 rounded-full transition-all duration-300 transform',
            'peer-checked:translate-x-5 peer-checked:bg-primary peer-checked:shadow-[0_0_10px_rgba(59,130,246,0.8)]',
            'peer-checked:scale-110'
          )}
        />
      </div>
      {(label || description) && (
        <div className="flex flex-col">
          {label && (
            <span className="text-sm font-bold text-gray-200 group-hover:text-white transition-colors">
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
};

export default Switch;
