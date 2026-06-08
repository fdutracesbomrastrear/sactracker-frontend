'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  canAccessCobranca,
  canAccessFinanceiro,
  canAccessInbox,
  canAccessMonitoramento,
  canAccessSaudeFrota,
} from '@/modules/core/lib/roles';
import { usePanelSettings } from '@/modules/core/hooks/PanelSettingsProvider';
import { clearSession, getUser } from '@/modules/core/lib/auth';
import { parsePermissions, roleLabel } from '@/modules/core/lib/roles';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '@/modules/core/components/ui/ThemeToggle';
import { ProfileAvatar } from '@/modules/core/components/ui/ProfileAvatar';
import { useProfile } from '@/modules/core/hooks/ProfileProvider';

type NavItem = {
  href: string;
  title: string;
  show: boolean;
  icon: React.ReactNode;
  group?: string;
};

export function AppSidebar({ permissions }: { permissions: string[] }) {
  const pathname = usePathname();
  const { openSettings } = usePanelSettings();
  const router = useRouter();
  const user = getUser();
  const { avatarUrl } = useProfile();

  const items: NavItem[] = [
    {
      href: '/inbox',
      title: 'Atendimentos',
      group: 'Operacional',
      show: canAccessInbox(permissions),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75"
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      ),
    },
    {
      href: '/financeiro',
      title: 'Financeiro',
      group: 'Operacional',
      show: canAccessFinanceiro(permissions),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75"
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      href: '/monitoramento',
      title: 'Monitoramento',
      group: 'Operacional',
      show: canAccessMonitoramento(permissions),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75"
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75"
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      href: '/saude-frota',
      title: 'Saúde da Frota',
      group: 'Operacional',
      show: canAccessSaudeFrota(permissions),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75"
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      href: '/cobranca',
      title: 'Cobrança',
      group: 'Operacional',
      show: canAccessCobranca(permissions),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      ),
    },
    // Admin group
    {
      href: '/admin/dashboard',
      title: 'Dashboard',
      group: 'Admin',
      show: permissions.includes('ADMIN'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75"
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      href: '/admin/historico',
      title: 'Histórico',
      group: 'Admin',
      show: permissions.includes('ADMIN'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75"
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      href: '/admin/usuarios',
      title: 'Equipe',
      group: 'Admin',
      show: permissions.includes('ADMIN'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75"
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      href: '/admin/respostas-rapidas',
      title: 'Respostas Rápidas',
      group: 'Admin',
      show: permissions.includes('ADMIN'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      href: '/admin/ia/treinamento',
      title: 'Treinar IA',
      group: 'Admin',
      show: permissions.includes('ADMIN'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75"
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
    },
    {
      href: '/admin/skyeyer',
      title: 'Skyeyer AI',
      group: 'Admin',
      show: permissions.includes('ADMIN') || permissions.includes('MONITORAMENTO') || permissions.some(p => p.startsWith('SKYEYER_')),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0zm-12.542 0C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
    },
    {
      href: '/admin/campanhas',
      title: 'Campanhas',
      group: 'Admin',
      show: permissions.includes('ADMIN') || permissions.includes('FINANCEIRO'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75"
            d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
        </svg>
      ),
    },
    {
      href: '/admin/ia/auditoria',
      title: 'Auditoria IA',
      group: 'Admin',
      show: permissions.includes('ADMIN'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75"
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
    },
    {
      href: '/admin/acessos',
      title: 'Acessos e Logs',
      group: 'Admin',
      show: permissions.includes('ADMIN'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      href: '/admin/financeiro/baixas',
      title: 'Guia de Baixas',
      group: 'Admin',
      show: permissions.includes('ADMIN') || permissions.includes('FINANCEIRO'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75"
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      href: '/admin/financeiro/agenda',
      title: 'Agenda Financeira',
      group: 'Admin',
      show: permissions.includes('ADMIN') || permissions.includes('FINANCEIRO'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
  ];

  const operacional = items.filter((i) => i.show && i.group === 'Operacional');
  const adminItems = items.filter((i) => i.show && i.group === 'Admin');

  const NavLink = ({ item }: { item: NavItem }) => {
    const active = pathname === item.href || pathname.startsWith(item.href + '/');
    return (
      <Link
        href={item.href}
        className={`
          relative flex items-center gap-3 h-10 px-3 rounded-lg text-sm font-medium transition-colors
          ${active
            ? 'bg-sidebar-active text-sidebar-ink'
            : 'text-sidebar-ink-soft hover:text-sidebar-ink hover:bg-sidebar-hover'
          }
        `}
      >
        {active && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full bg-amber-400" />
        )}
        <span className={active ? 'text-amber-400' : ''}>{item.icon}</span>
        <span className="truncate">{item.title}</span>
      </Link>
    );
  };

  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <span className="px-3 mt-4 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-sidebar-ink-faint">
      {children}
    </span>
  );

  return (
    <aside
      className="
        relative z-30 flex flex-col shrink-0 h-screen w-60 select-none
        bg-sidebar border-r border-black/20
      "
    >
      {/* Logo + wordmark */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-white/10 shrink-0">
        <div className="w-9 h-9 rounded-lg overflow-hidden flex items-center justify-center ring-1 ring-white/15 bg-surface shrink-0">
          <img src="/logo.png" alt="SacTracker" className="w-full h-full object-cover" />
        </div>
        <span className="text-sidebar-ink font-semibold tracking-tight">SacTracker</span>
      </div>

      {/* Nav items */}
      <nav className="flex flex-col flex-1 w-full overflow-y-auto overflow-x-hidden px-2 pb-3 no-scrollbar">
        {operacional.length > 0 && (
          <>
            <SectionLabel>Operacional</SectionLabel>
            {operacional.map((item) => <NavLink key={item.href} item={item} />)}
          </>
        )}

        {adminItems.length > 0 && (
          <>
            <SectionLabel>Admin</SectionLabel>
            {adminItems.map((item) => <NavLink key={item.href} item={item} />)}
          </>
        )}
      </nav>

      {/* Bottom actions */}
      <div className="w-full px-2 pb-3 pt-2 border-t border-white/10 shrink-0">
        {/* User block */}
        <div className="flex items-center gap-3 px-2 py-2 mb-1">
          <ProfileAvatar
            name={user?.name ?? 'Usuário'}
            avatarUrl={avatarUrl}
            size="sm"
          />
          <div className="min-w-0">
            <p className="text-sm font-medium text-sidebar-ink truncate">{user?.name ?? '—'}</p>
            <p className="text-[11px] text-sidebar-ink-soft truncate">{roleLabel(permissions)}</p>
          </div>
        </div>

        <ThemeToggle labeled />

        <button
          type="button"
          onClick={openSettings}
          className="group flex items-center gap-3 w-full px-3 h-10 rounded-lg text-sidebar-ink-soft hover:text-sidebar-ink hover:bg-sidebar-hover transition-colors"
        >
          <svg className="w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-sm font-medium">Configurações</span>
        </button>

        <button
          type="button"
          onClick={() => {
            clearSession();
            router.push('/login');
          }}
          className="group flex items-center gap-3 w-full px-3 h-10 rounded-lg text-sidebar-ink-soft hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <svg className="w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="text-sm font-medium">Sair</span>
        </button>
      </div>
    </aside>
  );
}
