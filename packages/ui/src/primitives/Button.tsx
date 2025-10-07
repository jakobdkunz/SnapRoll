import * as React from 'react';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost';
};

export const Button: React.FC<ButtonProps> = ({ variant = 'primary', className = '', disabled, ...props }) => {
  const base = 'inline-flex items-center justify-center rounded-xl px-4 py-2 font-medium shadow-soft transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed';
  const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-600',
    secondary: 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white focus:ring-slate-900 dark:focus:ring-slate-100',
    ghost: 'bg-transparent hover:bg-slate-100 text-slate-900 dark:text-slate-100 dark:hover:bg-slate-800',
  };
  return <button className={`${base} ${variants[variant]} ${className}`} disabled={disabled} {...props} />;
};
