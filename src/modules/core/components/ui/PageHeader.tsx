import React from 'react';

/**
 * Cabeçalho de página consistente (padrão "Agenda Financeira"):
 * título grande + subtítulo à esquerda e ações opcionais à direita.
 * Sem barra/borda própria — flui integrado ao conteúdo sobre o fundo da página.
 */
export function PageHeader({
  title,
  subtitle,
  actions,
  className = '',
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 px-6 pt-6 pb-4 ${className}`}
    >
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-ink truncate">{title}</h1>
        {subtitle && (
          <p className="text-sm text-ink-soft truncate mt-0.5">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-3 shrink-0">{actions}</div>
      )}
    </div>
  );
}
