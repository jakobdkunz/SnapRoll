import * as React from 'react';

type CardProps = React.HTMLAttributes<HTMLDivElement>;

export const Card: React.FC<CardProps> = ({ className = '', ...props }) => {
  return <div className={`rounded-xl bg-white shadow-soft border border-slate-200 ${className}`} {...props} />;
};
