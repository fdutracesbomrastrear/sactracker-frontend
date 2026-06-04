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
import { useState } from 'react';

type NavItem = {
  href: string;
  title: string;
  show: boolean;
  icon: React.ReactNode;
  group?: string;
};

const Tooltip = ({ label }: { label: string }) => (
  <span className="
    pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50
    bg-slate-900 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg
    whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150
    shadow-xl ring-1 ring-white/10
    before:content-[''] before:absolute before:right-full before:top-1/2 before:-translate-y-1/2
    before:border-4 before:border-transparent before:border-r-slate-900
  ">
    {label}
  </span>
);

export function AppSidebar({ permissions }: { permissions: string[] }) {
  const pathname = usePathname();
  const { openSettings } = usePanelSettings();
  const router = useRouter();
  const user = getUser();
  const [hoverItem, setHoverItem] = useState<string | null>(null);

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
  ];

  const operacional = items.filter((i) => i.show && i.group === 'Operacional');
  const adminItems = items.filter((i) => i.show && i.group === 'Admin');

  const NavLink = ({ item }: { item: NavItem }) => {
    const active = pathname === item.href || pathname.startsWith(item.href + '/');
    return (
      <div className="relative group">
        <Link
          href={item.href}
          className={`
            relative flex items-center justify-center w-11 h-11 rounded-xl transition-all duration-200
            ${active
              ? 'bg-amber-400 text-purple-950 shadow-lg shadow-amber-500/30'
              : 'text-purple-300 hover:text-white hover:bg-white/10'
            }
          `}
        >
          {item.icon}
        </Link>
        <Tooltip label={item.title} />
      </div>
    );
  };

  return (
    <aside
      className="
        relative z-30 flex flex-col items-center shrink-0 h-screen
        w-[70px] select-none
        bg-gradient-to-b from-purple-950 via-purple-950/90 to-purple-950/70
        border-r border-white/5 shadow-2xl shadow-black/40
      "
    >
      {/* Logo */}
      <div className="flex flex-col items-center pt-4 pb-3 w-full border-b border-white/10">
        <div className="
          w-11 h-11 rounded-xl
          bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600
          flex items-center justify-center shadow-lg shadow-amber-600/30
          ring-2 ring-amber-300/20
        ">
          <span className="font-black text-purple-950 text-sm tracking-tight">ST</span>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex flex-col items-center flex-1 w-full overflow-y-auto overflow-x-hidden py-3 gap-1 px-2 no-scrollbar">
        {operacional.length > 0 && (
          <>
            <span className="text-[9px] font-bold text-purple-700/60 uppercase tracking-widest mt-1 mb-1">Op</span>
            {operacional.map((item) => <NavLink key={item.href} item={item} />)}
          </>
        )}

        {adminItems.length > 0 && (
          <>
            <div className="w-8 h-px bg-white/10 my-2" />
            <span className="text-[9px] font-bold text-purple-700/60 uppercase tracking-widest mb-1">ADM</span>
            {adminItems.map((item) => <NavLink key={item.href} item={item} />)}
          </>
        )}
      </nav>

      {/* Bottom actions */}
      <div className="flex flex-col items-center gap-1 pb-4 w-full px-2 border-t border-white/10 pt-3">
        {/* Avatar / user info */}
        <div className="relative group mb-1">
          <button
            type="button"
            title={user?.name ?? 'Usuário'}
            className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold shadow-md ring-2 ring-white/10 hover:ring-amber-400/50 transition-all"
          >
            {(user?.name ?? 'U').charAt(0).toUpperCase()}
          </button>
          <span className="
            pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50
            bg-slate-900 text-white text-xs px-2.5 py-1.5 rounded-lg whitespace-nowrap
            opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-xl
            ring-1 ring-white/10
            before:content-[''] before:absolute before:right-full before:top-1/2 before:-translate-y-1/2
            before:border-4 before:border-transparent before:border-r-slate-900
          ">
            <span className="font-semibold">{user?.name ?? '—'}</span>
            <br />
            <span className="text-purple-300 text-[11px]">{roleLabel(permissions)}</span>
          </span>
        </div>

        {/* Settings */}
        <div className="relative group">
          <button
            type="button"
            onClick={openSettings}
            title="Configurações"
            className="flex items-center justify-center w-10 h-10 rounded-xl text-purple-400 hover:text-white hover:bg-white/10 transition-all duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <Tooltip label="Configurações" />
        </div>

        {/* Logout */}
        <div className="relative group">
          <button
            type="button"
            title="Sair"
            onClick={() => {
              clearSession();
              router.push('/login');
            }}
            className="flex items-center justify-center w-10 h-10 rounded-xl text-purple-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
          <Tooltip label="Sair" />
        </div>
      </div>
    </aside>
  );
}
