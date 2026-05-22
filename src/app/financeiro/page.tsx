'use client';

import { FinanceiroPanel } from '@/modules/financeiro/components/FinanceiroPanel';
import { AppSidebar } from '@/modules/core/components/AppSidebar';
import { clearSession, getUser } from '@/modules/core/lib/auth';
import { parsePermissions, roleLabel } from '@/modules/core/lib/roles';
import { useRouter } from 'next/navigation';

import { AuthGuard } from '@/modules/core/components/AuthGuard';

export default function FinanceiroPage() {
  const router = useRouter();
  const user = getUser();
  const permissions = parsePermissions(user?.permissions);

  return (
    <AuthGuard allowedPermissions={['FINANCEIRO']}>
      <div className="flex h-screen overflow-hidden bg-slate-50">
        <AppSidebar permissions={permissions} />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-6 shrink-0">
            <div>
              <h1 className="text-lg font-bold text-purple-950">Financeiro — Boletos</h1>
              <p className="text-xs text-slate-500">Consulta e envio via API Rastro</p>
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
            <FinanceiroPanel />
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
