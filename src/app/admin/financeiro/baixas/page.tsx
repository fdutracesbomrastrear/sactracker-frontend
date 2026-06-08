'use client';

import { Suspense, useEffect, useState } from 'react';
import { PageHeader } from '@/modules/core/components/ui/PageHeader';
import { apiFetchJSON } from '@/modules/core/lib/api';

type BoletoBaixa = {
  id: string;
  barcode: string;
  originalValue: number;
  juros: number;
  multa: number;
  totalPaid: number;
  createdAt: string;
  user: { name: string; email: string } | null;
};

function formatCurrency(val: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
}

function BaixasConteudo() {
  const [baixas, setBaixas] = useState<BoletoBaixa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  async function loadBaixas() {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetchJSON<BoletoBaixa[]>('/api/v1/financeiro/baixas');
      setBaixas(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar a guia de baixas');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBaixas();
  }, []);

  // Filter baixas logic
  const filteredBaixas = baixas.filter((b) => {
    const term = searchQuery.toLowerCase();
    return (
      (b.user?.name || '').toLowerCase().includes(term) ||
      (b.user?.email || '').toLowerCase().includes(term) ||
      b.barcode.includes(searchQuery)
    );
  });

  // Calculate metrics
  const totalOriginal = filteredBaixas.reduce((acc, curr) => acc + curr.originalValue, 0);
  const totalJuros = filteredBaixas.reduce((acc, curr) => acc + curr.juros, 0);
  const totalMulta = filteredBaixas.reduce((acc, curr) => acc + curr.multa, 0);
  const totalPaid = filteredBaixas.reduce((acc, curr) => acc + curr.totalPaid, 0);

  return (
    <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden bg-subtle/50">
      <PageHeader
        title="Guia de Baixas Manuais"
        subtitle="Conciliação de recebimentos de boletos e Pix efetuados em campo"
        className="shrink-0"
      />

      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Statistics Dashboard widgets */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-surface p-4 rounded-2xl border border-line/60 shadow-sm flex flex-col justify-between hover:border-purple-200 transition-all duration-200">
            <span className="text-[10px] font-black tracking-wider text-ink-faint uppercase">Total Arrecadado (Caixa)</span>
            <span className="text-2xl font-black text-ink mt-1">{formatCurrency(totalPaid)}</span>
            <span className="text-xs text-ink-soft mt-2">{filteredBaixas.length} baixas manuais</span>
          </div>
          <div className="bg-surface p-4 rounded-2xl border border-line/60 shadow-sm flex flex-col justify-between hover:border-sky-200 transition-all duration-200">
            <span className="text-[10px] font-black tracking-wider text-ink-faint uppercase">Valor Nominal (Original)</span>
            <span className="text-2xl font-black text-sky-700 mt-1">{formatCurrency(totalOriginal)}</span>
            <span className="text-xs text-ink-soft mt-2">Valor base dos títulos</span>
          </div>
          <div className="bg-surface p-4 rounded-2xl border border-line/60 shadow-sm flex flex-col justify-between hover:border-emerald-200 transition-all duration-200">
            <span className="text-[10px] font-black tracking-wider text-ink-faint uppercase">Juros de Mora</span>
            <span className="text-2xl font-black text-emerald-700 mt-1">{formatCurrency(totalJuros)}</span>
            <span className="text-xs text-ink-soft mt-2">Acúmulo diário por atraso</span>
          </div>
          <div className="bg-surface p-4 rounded-2xl border border-line/60 shadow-sm flex flex-col justify-between hover:border-amber-200 transition-all duration-200">
            <span className="text-[10px] font-black tracking-wider text-ink-faint uppercase">Multa Arrecadada</span>
            <span className="text-2xl font-black text-amber-700 mt-1">{formatCurrency(totalMulta)}</span>
            <span className="text-xs text-ink-soft mt-2">Taxas fixas de 2%</span>
          </div>
        </div>

        {/* Filters and search box */}
        <div className="bg-surface p-4 rounded-2xl border border-line/60 shadow-sm">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="w-full md:w-1/3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por operador ou código de barras/pix..."
                className="w-full rounded-xl bg-subtle border border-line px-4 py-2.5 text-sm placeholder-slate-400 focus:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-600/10 transition-all text-ink"
              />
            </div>
            
            <button
              type="button"
              onClick={loadBaixas}
              className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold shadow hover:bg-purple-700 transition-all flex items-center gap-1.5 shrink-0"
            >
              🔄 Atualizar
            </button>
          </div>
        </div>

        {/* Data Table */}
        {loading ? (
          <div className="p-8 text-center bg-surface border border-line/60 rounded-2xl shadow-sm">
            <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-ink-soft font-medium text-sm">Carregando faturas baixadas...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center bg-surface border border-line/60 rounded-2xl shadow-sm">
            <p className="text-red-500 font-semibold">{error}</p>
            <button
              onClick={loadBaixas}
              className="mt-3 px-4 py-2 bg-subtle text-ink border border-line rounded-xl text-xs font-bold hover:bg-subtle"
            >
              Tentar Novamente
            </button>
          </div>
        ) : filteredBaixas.length === 0 ? (
          <div className="p-12 text-center bg-surface border border-line/60 rounded-2xl shadow-sm">
            <p className="text-ink-soft font-medium">Nenhum registro de baixa localizado.</p>
            <p className="text-xs text-ink-faint mt-1">Os recebimentos confirmados pelos operadores no aplicativo aparecerão aqui.</p>
          </div>
        ) : (
          <div className="bg-surface border border-line/60 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-subtle border-b border-line text-[10px] font-black uppercase text-ink-faint tracking-wider">
                    <th className="py-4 px-6">Data/Hora</th>
                    <th className="py-4 px-6">Operador</th>
                    <th className="py-4 px-6">Código do Boleto/Pix</th>
                    <th className="py-4 px-6 text-right">Valor Nominal</th>
                    <th className="py-4 px-6 text-right">Juros (Atraso)</th>
                    <th className="py-4 px-6 text-right">Multa (2%)</th>
                    <th className="py-4 px-6 text-right">Total Recebido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-xs text-ink">
                  {filteredBaixas.map((baixa) => (
                    <tr key={baixa.id} className="hover:bg-subtle/50 transition-colors">
                      {/* Timestamp */}
                      <td className="py-4 px-6 whitespace-nowrap text-ink-soft font-mono">
                        {new Date(baixa.createdAt).toLocaleString('pt-BR')}
                      </td>

                      {/* Operator info */}
                      <td className="py-4 px-6">
                        {baixa.user ? (
                          <div className="flex items-center gap-2.5">
                            <span className="w-8 h-8 rounded-full bg-purple-500/10 text-purple-700 font-bold flex items-center justify-center border border-purple-500/15 shrink-0 uppercase">
                              {baixa.user.name.charAt(0)}
                            </span>
                            <div>
                              <p className="font-bold text-ink">{baixa.user.name}</p>
                              <p className="text-[10px] text-ink-faint font-mono">{baixa.user.email}</p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-ink-faint italic font-medium">— Operador Desconhecido</span>
                        )}
                      </td>

                      {/* Code/Barcode */}
                      <td className="py-4 px-6 font-mono text-ink-soft max-w-xs truncate" title={baixa.barcode}>
                        {baixa.barcode}
                      </td>

                      {/* Original Value */}
                      <td className="py-4 px-6 text-right font-semibold text-ink">
                        {formatCurrency(baixa.originalValue)}
                      </td>

                      {/* Juros */}
                      <td className="py-4 px-6 text-right text-emerald-600">
                        {baixa.juros > 0 ? `+${formatCurrency(baixa.juros)}` : '—'}
                      </td>

                      {/* Multa */}
                      <td className="py-4 px-6 text-right text-amber-600">
                        {baixa.multa > 0 ? `+${formatCurrency(baixa.multa)}` : '—'}
                      </td>

                      {/* Total Paid */}
                      <td className="py-4 px-6 text-right font-black text-ink">
                        {formatCurrency(baixa.totalPaid)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function BaixasPage() {
  return (
    <Suspense fallback={<div className="p-8 text-ink-soft text-sm">Carregando guia de baixas...</div>}>
      <BaixasConteudo />
    </Suspense>
  );
}
