'use client';

import { Suspense } from 'react';
import { MonitoramentoPanel } from '@/modules/monitoramento/components/MonitoramentoPanel';
import { PageHeader } from '@/modules/core/components/ui/PageHeader';

function MonitoramentoConteudo() {
  return (
    <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
      <PageHeader
        title="Monitoramento"
        subtitle="Frota Rastro · SMS · status ao vivo"
        className="shrink-0"
      />
      <main className="flex-1 min-h-0 flex">
        <MonitoramentoPanel />
      </main>
    </div>
  );
}

export default function MonitoramentoPage() {
  return (
    <Suspense fallback={<div className="p-8 text-ink-soft">Carregando monitoramento…</div>}>
      <MonitoramentoConteudo />
    </Suspense>
  );
}
