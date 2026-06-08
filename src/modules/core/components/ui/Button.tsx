'use client';

import React from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type Size = 'sm' | 'md';

const base =
  'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60 disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap';

const variants: Record<Variant, string> = {
  primary: 'bg-purple-700 text-white hover:bg-purple-600',
  secondary:
    'bg-surface text-ink border border-line hover:bg-subtle',
  ghost: 'text-ink-soft hover:text-ink hover:bg-subtle',
  danger:
    'bg-surface text-red-600 border border-red-200 hover:bg-red-50 dark:border-red-500/30 dark:hover:bg-red-500/10',
  success:
    'bg-surface text-emerald-700 border border-emerald-200 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-500/30 dark:hover:bg-emerald-500/10',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
};

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  );
}
