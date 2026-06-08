'use client';

import { useTheme } from '@/modules/core/hooks/ThemeProvider';

/**
 * Toggle compacto de tema claro/escuro, pensado para o rodapé da sidebar.
 */
export function ThemeToggle({ labeled = false }: { labeled?: boolean }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
      aria-label="Alternar tema"
      className={`group flex items-center gap-3 ${labeled ? 'w-full px-3' : 'justify-center w-10'} h-10 rounded-lg text-sidebar-ink-soft hover:text-sidebar-ink hover:bg-sidebar-hover transition-colors`}
    >
      {isDark ? (
        <svg className="w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75"
            d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
        </svg>
      ) : (
        <svg className="w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75"
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )}
      {labeled && (
        <span className="text-sm font-medium">{isDark ? 'Tema escuro' : 'Tema claro'}</span>
      )}
    </button>
  );
}
