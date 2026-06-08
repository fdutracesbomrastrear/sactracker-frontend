import React from 'react';

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'brand';

const tones: Record<Tone, string> = {
  neutral:
    'text-ink-soft border-line bg-subtle',
  success:
    'text-emerald-700 border-emerald-200 bg-emerald-50 dark:text-emerald-400 dark:border-emerald-500/30 dark:bg-emerald-500/10',
  warning:
    'text-amber-700 border-amber-200 bg-amber-50 dark:text-amber-300 dark:border-amber-500/30 dark:bg-amber-500/10',
  danger:
    'text-red-600 border-red-200 bg-red-50 dark:text-red-400 dark:border-red-500/30 dark:bg-red-500/10',
  info:
    'text-purple-700 border-purple-200 bg-purple-50 dark:text-purple-300 dark:border-purple-500/30 dark:bg-purple-500/10',
  brand:
    'text-purple-800 border-purple-200 bg-purple-50 dark:text-purple-200 dark:border-purple-500/30 dark:bg-purple-500/10',
};

export function StatusPill({
  tone = 'neutral',
  children,
  className = '',
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
