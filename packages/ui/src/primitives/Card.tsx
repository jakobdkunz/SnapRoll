import * as React from 'react';

type CardProps = React.HTMLAttributes<HTMLDivElement>;

export const Card: React.FC<CardProps> = ({ className = '', ...props }) => {
  return <div className={`rounded-xl bg-white dark:bg-slate-900 shadow-soft border border-slate-200 dark:border-slate-800 ${className}`} {...props} />;
};
