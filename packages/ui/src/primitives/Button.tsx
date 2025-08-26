import * as React from 'react';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost';
};

export const Button: React.FC<ButtonProps> = ({ variant = 'primary', className = '', disabled, ...props }) => {
  const base = 'inline-flex items-center justify-center rounded-xl px-4 py-2 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
    primary: 'bg-blue-500 text-white hover:bg-blue-600 focus:ring-blue-500 shadow-soft',
    secondary: 'bg-blue-500 text-white hover:bg-blue-600 focus:ring-blue-500 shadow-soft',
    ghost: 'bg-transparent hover:bg-slate-100 text-slate-900 shadow-soft',
  };
  
  // Check if this is a white button and apply stronger shadow
  const isWhiteButton = className.includes('bg-white') || className.includes('bg-white/');
  const shadowClass = isWhiteButton ? 'shadow-white-button' : '';
  
  return <button className={`${base} ${variants[variant]} ${shadowClass} ${className}`} disabled={disabled} {...props} />;
};
