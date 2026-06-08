'use client';

import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SaudeFrotaPanel } from '@/modules/monitoramento/components/SaudeFrotaPanel';
import { getUser } from '@/modules/core/lib/auth';
import { parsePermissions, canAccessSaudeFrota } from '@/modules/core/lib/roles';
import { PageHeader } from '@/modules/core/components/ui/PageHeader';

function SaudeFrotaConteudo() {
  const router = useRouter();
  const user = getUser();
  const permissions = parsePermissions(user?.permissions);
  const hasAccess = canAccessSaudeFrota(permissions);

  useEffect(() => {
    if (!hasAccess) {
      router.replace('/');
    }
  }, [hasAccess, router]);

  if (!hasAccess) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-subtle text-ink-soft font-sans">
        <span className="text-4xl mb-3">🔒</span>
        <h2 className="text-lg font-bold text-ink">Acesso Restrito</h2>
        <p className="text-xs text-ink-faint mt-1">Você não possui permissão para acessar a Saúde da Frota.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
      <PageHeader
        title="Saúde da Frota"
        subtitle="Monitoramento ativo de bateria e conectividade"
        className="shrink-0"
      />
      <main className="flex-1 min-h-0 flex">
        <SaudeFrotaPanel />
      </main>
    </div>
  );
}

export default function SaudeFrotaPage() {
  return (
    <Suspense fallback={<div className="p-8 text-ink-soft">Carregando saúde da frota…</div>}>
      <SaudeFrotaConteudo />
    </Suspense>
  );
}
