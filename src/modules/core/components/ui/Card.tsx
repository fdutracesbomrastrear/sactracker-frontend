import React from 'react';

/**
 * Superfície chapada com borda fina (sem sombras pesadas), tema-aware.
 */
export function Card({
  className = '',
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`bg-surface border border-line rounded-xl ${className}`}
      {...props}
    />
  );
}
