'use client';

import { Suspense } from 'react';
import { AppSidebar } from '@/modules/core/components/AppSidebar';
import { MonitoramentoPanel } from '@/modules/monitoramento/components/MonitoramentoPanel';
import { clearSession, getUser } from '@/modules/core/lib/auth';
import { parsePermissions, roleLabel } from '@/modules/core/lib/roles';
import { AuthGuard } from '@/modules/core/components/AuthGuard';
import { useRouter } from 'next/navigation';

function MonitoramentoConteudo() {
  const router = useRouter();
  const user = getUser();
  const permissions = parsePermissions(user?.permissions);

  return (
    <AuthGuard allowedPermissions={['MONITORAMENTO']}>
      <div className="flex h-screen overflow-hidden bg-slate-50">
        <AppSidebar permissions={permissions} />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-6 shrink-0">
            <div>
              <h1 className="text-lg font-bold text-purple-950">Monitoramento</h1>
              <p className="text-xs text-slate-500">Frota Rastro · SMS · status ao vivo</p>
            </div>
            <div className="flex items-center gap-3">
              {user && (
                <span className="text-xs text-slate-500">
                  {user.name} · {roleLabel(permissions)}
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  clearSession();
                  router.push('/login');
                }}
                className="text-xs font-medium text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100"
              >
                Sair
              </button>
            </div>
          </header>
          <main className="flex-1 min-h-0 flex">
            <MonitoramentoPanel />
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}

export default function MonitoramentoPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-500">Carregando monitoramento…</div>}>
      <MonitoramentoConteudo />
    </Suspense>
  );
}
