'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ModulePermission,
  canAccessCobranca,
  canAccessFinanceiro,
  canAccessInbox,
  canAccessMonitoramento,
} from '@/modules/core/lib/roles';
import { usePanelSettings } from '@/modules/core/hooks/PanelSettingsProvider';

type NavItem = {
  href: string;
  title: string;
  show: boolean;
  icon: React.ReactNode;
};

export function AppSidebar({ permissions }: { permissions: ModulePermission[] }) {
  const pathname = usePathname();
  const { openSettings } = usePanelSettings();

  const items: NavItem[] = [
    {
      href: '/inbox',
      title: 'Atendimentos',
      show: canAccessInbox(permissions),
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
        />
      ),
    },
    {
      href: '/financeiro',
      title: 'Financeiro',
      show: canAccessFinanceiro(permissions),
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      ),
    },
    {
      href: '/monitoramento',
      title: 'Monitoramento',
      show: canAccessMonitoramento(permissions),
      icon: (
        <>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </>
      ),
    },
    {
      href: '/cobranca',
      title: 'Cobrança',
      show: canAccessCobranca(permissions),
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      ),
    },
    {
      href: '/admin/historico',
      title: 'Histórico',
      show: permissions.includes('ADMIN'),
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      ),
    },
    {
      href: '/admin/usuarios',
      title: 'Equipe',
      show: permissions.includes('ADMIN'),
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
        />
      ),
    },
  ];

  return (
    <div className="w-20 bg-purple-950 flex flex-col items-center py-6 shadow-2xl z-20 shrink-0 px-2 min-h-screen">
      <div className="h-12 w-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-lg mb-4">
        <span className="font-bold text-xl text-purple-950">ST</span>
      </div>
      {items
        .filter((item) => item.show)
        .map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.title}
              className={`w-full aspect-square flex items-center justify-center rounded-xl mb-2 transition-colors ${
                active
                  ? 'text-amber-400 bg-white/10'
                  : 'text-purple-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {item.icon}
              </svg>
            </Link>
          );
        })}
      <div className="flex-1" />
      <button
        type="button"
        onClick={openSettings}
        title="Configurações"
        className="w-full aspect-square flex items-center justify-center rounded-xl text-purple-300 hover:text-white hover:bg-white/5 transition-colors"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </button>
    </div>
  );
}
