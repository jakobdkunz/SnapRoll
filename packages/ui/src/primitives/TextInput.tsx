import * as React from 'react';

type TextInputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`w-full rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-slate-900 dark:text-slate-100 px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed disabled:border-slate-200 dark:disabled:bg-neutral-800 dark:disabled:text-slate-500 dark:disabled:border-neutral-700 ${className}`}
        {...props}
      />
    );
  }
);
TextInput.displayName = 'TextInput';
