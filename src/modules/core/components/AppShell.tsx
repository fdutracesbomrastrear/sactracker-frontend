'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getHomePath, parsePermissions } from '@/modules/core/lib/roles';
import { getUser, isAuthenticated } from '@/modules/core/lib/auth';
import { AppSidebar } from '@/modules/core/components/AppSidebar';

/**
 * AppShell — layout global para todas as rotas autenticadas.
 * O AppSidebar fica fixo aqui e nunca recarrega entre navegações.
 * Cada page.tsx filho apenas renderiza seu conteúdo principal.
 */
export function AppShell({
  children,
  allowedPermissions,
}: {
  children: React.ReactNode;
  allowedPermissions?: string[];
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [permissions, setPermissions] = useState<string[]>([]);
  const didCheck = useRef(false);

  useEffect(() => {
    if (didCheck.current) return;
    didCheck.current = true;

    if (!isAuthenticated()) {
      router.replace('/login');
      return;
    }

    const user = getUser();
    const perms = parsePermissions(user?.permissions);
    setPermissions(perms);

    if (perms.includes('ADMIN')) {
      setReady(true);
      return;
    }

    if (allowedPermissions && allowedPermissions.length > 0) {
      const hasAccess = allowedPermissions.some((p) => perms.includes(p));
      if (!hasAccess) {
        router.replace(getHomePath(perms));
        return;
      }
    }

    setReady(true);
  }, [router, allowedPermissions]);

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-sidebar">
        <div className="flex flex-col items-center gap-4">
          <div className="w-11 h-11 rounded-xl overflow-hidden ring-1 ring-white/15 bg-surface">
            <img src="/logo.png" alt="SacTracker" className="w-full h-full object-cover" />
          </div>
          <div className="flex gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-white/70 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-white/50 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-app">
      <AppSidebar permissions={permissions} />
      <main className="flex-1 min-w-0 overflow-hidden flex flex-col">
        {children}
      </main>
    </div>
  );
}
