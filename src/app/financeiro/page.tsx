'use client';

import { FinanceiroPanel } from '@/modules/financeiro/components/FinanceiroPanel';
import { PageHeader } from '@/modules/core/components/ui/PageHeader';

export default function FinanceiroPage() {
  return (
    <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
      <PageHeader
        title="Financeiro — Boletos"
        subtitle="Consulta e envio via API Rastro"
        className="shrink-0"
      />
      <main className="flex-1 min-h-0 flex">
        <FinanceiroPanel />
      </main>
    </div>
  );
}
