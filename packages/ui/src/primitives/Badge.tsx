import * as React from 'react';

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: 'green' | 'red' | 'yellow' | 'gray' | 'slate';
};

export const Badge: React.FC<BadgeProps> = ({ tone = 'slate', className = '', ...props }) => {
  const tones: Record<NonNullable<BadgeProps['tone']>, string> = {
    green: 'bg-green-100 text-green-800 dark:bg-neutral-800 dark:text-green-200',
    red: 'bg-red-100 text-red-800 dark:bg-neutral-800 dark:text-red-200',
    yellow: 'bg-yellow-100 text-yellow-800 dark:bg-neutral-800 dark:text-yellow-200',
    gray: 'bg-gray-100 text-gray-800 dark:bg-neutral-800 dark:text-gray-200',
    slate: 'bg-slate-100 text-slate-800 dark:bg-neutral-800 dark:text-slate-200',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${tones[tone]} ${className}`} {...props} />
  );
};
