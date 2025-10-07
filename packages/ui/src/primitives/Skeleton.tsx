import * as React from 'react';

export type SkeletonProps = React.HTMLAttributes<HTMLDivElement> & {
  rounded?: boolean;
};

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', rounded = true, ...props }) => {
  const radius = rounded ? 'rounded-md' : '';
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse bg-slate-200 dark:bg-neutral-800 ${radius} ${className}`}
      {...props}
    />
  );
};
