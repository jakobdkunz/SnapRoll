import * as React from 'react';

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: 'green' | 'red' | 'yellow' | 'gray' | 'slate';
};

export const Badge: React.FC<BadgeProps> = ({ tone = 'slate', className = '', ...props }) => {
  const tones: Record<NonNullable<BadgeProps['tone']>, string> = {
    green: 'bg-green-100 text-green-800',
    red: 'bg-red-100 text-red-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    gray: 'bg-gray-100 text-gray-800',
    slate: 'bg-slate-100 text-slate-800',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${tones[tone]} ${className}`} {...props} />
  );
};
