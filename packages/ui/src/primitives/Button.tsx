import * as React from 'react';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost';
};

export const Button: React.FC<ButtonProps> = ({ variant = 'primary', className = '', disabled, ...props }) => {
  const base = 'inline-flex items-center justify-center rounded-xl px-4 py-2 font-medium shadow-soft transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed';
  const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-600 border border-transparent dark:border-transparent',
    secondary: 'bg-slate-100 text-slate-900 hover:bg-white focus:ring-slate-900 border border-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 dark:focus:ring-slate-100 dark:border-slate-700',
    ghost: 'bg-transparent hover:bg-slate-100 text-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700',
  };
  return <button className={`${base} ${variants[variant]} ${className}`} disabled={disabled} {...props} />;
};
