import * as React from 'react';

type TextInputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`w-full rounded-xl border border-slate-300 bg-white px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed disabled:border-slate-200 ${className}`}
        {...props}
      />
    );
  }
);
TextInput.displayName = 'TextInput';
