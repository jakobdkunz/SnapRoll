import * as React from 'react';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost';
};

export const Button: React.FC<ButtonProps> = ({ variant = 'primary', className = '', disabled, ...props }) => {
  const base = 'inline-flex items-center justify-center rounded-xl px-4 py-2 font-medium shadow-soft transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
    primary: 'bg-primary text-white hover:bg-blue-500 focus:ring-primary',
    secondary: 'bg-accent text-slate-900 hover:bg-pink-200 focus:ring-accent',
    ghost: 'bg-transparent hover:bg-slate-100 text-slate-900',
  };
  return <button className={`${base} ${variants[variant]} ${className}`} disabled={disabled} {...props} />;
};
