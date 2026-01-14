import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

const Logo: React.FC<LogoProps> = ({ className = '', size = 32 }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 512 512" 
      width={size} 
      height={size} 
      className={className}
      fill="none"
    >
      <defs>
        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1890ff" stopOpacity="1" />
          <stop offset="100%" stopColor="#0050b3" stopOpacity="1" />
        </linearGradient>
      </defs>
      
      {/* Outer Target Ring */}
      <circle cx="256" cy="256" r="180" stroke="url(#grad1)" strokeWidth="40" fill="none" />
      
      {/* Crosshair Lines */}
      <line x1="256" y1="40" x2="256" y2="180" stroke="currentColor" strokeWidth="30" strokeLinecap="round" />
      <line x1="256" y1="332" x2="256" y2="472" stroke="currentColor" strokeWidth="30" strokeLinecap="round" />
      <line x1="40" y1="256" x2="180" y2="256" stroke="currentColor" strokeWidth="30" strokeLinecap="round" />
      <line x1="332" y1="256" x2="472" y2="256" stroke="currentColor" strokeWidth="30" strokeLinecap="round" />
      
      {/* Q Stylized Tail */}
      <path d="M330 330 L420 420" stroke="#1890ff" strokeWidth="50" strokeLinecap="round" />
      
      {/* Inner Dot */}
      <circle cx="256" cy="256" r="30" fill="currentColor" />
    </svg>
  );
};

export default Logo;
