'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  CobrancaResultado,
  CobrancaStatus,
  dispararRotinaCobranca,
  dispararVencemEm2Dias,
  dispararFaturaUnicaPendente,
  dispararVencemHoje,
  dispararVencidosOntem,
  fetchCobrancaStatus,
  simularVencemEm2Dias,
  simularVencemHoje,
  simularVencidosOntem,
  SimulacaoCobranca,
} from '@/modules/cobranca/api/cobranca';
import { PageHeader } from '@/modules/core/components/ui/PageHeader';

export default function CobrancaPage() {
  const [mounted, setMounted] = useState(false);
  const [status, setStatus] = useState<CobrancaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [acao, setAcao] = useState<string | null>(null);
  const [resultado, setResultado] = useState<CobrancaResultado | null>(null);
  const [simulacao, setSimulacao] = useState<SimulacaoCobranca | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      setStatus(await fetchCobrancaStatus());
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function executar(
    nome: string,
    fn: () => Promise<CobrancaResultado | SimulacaoCobranca>
  ) {
    setAcao(nome);
    setErro(null);
    setResultado(null);
    setSimulacao(null);
    try {
      const r = await fn();
      if ('linhasEnviariam' in r) setSimulacao(r);
      else setResultado(r);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro');
    } finally {
      setAcao(null);
    }
  }

  return (
    <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
      <PageHeader
        title="Cobrança ativa"
        subtitle="Disparos e simulações"
        className="shrink-0"
      />

      <main className="flex-1 p-6 max-w-3xl w-full mx-auto space-y-6 overflow-y-auto">
        {loading && <p className="text-sm text-ink-soft">Carregando...</p>}
        {erro && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">
            {erro}
          </p>
        )}

        {status && (
          <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
            <h2 className="text-sm font-bold text-ink mb-2">Status</h2>
            <ul className="text-sm text-ink-soft space-y-1">
              <li>
                Automação:{' '}
                <strong>{status.enabled ? 'Ativa' : 'Pausada'}</strong>
              </li>
              <li>Horário comercial: {status.horario}</li>
              <li>Clientes com trava registrada: {status.registros}</li>
            </ul>
            <p className="text-xs text-ink-faint mt-3">
              A rotina automática roda a cada hora (09h–18h). Disparos manuais ignoram o horário.
            </p>
          </div>
        )}

        <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-ink">Disparos reais</h2>
          <p className="text-xs text-ink-soft">
            Lembrete → boleto → PIX em bolha separada. ~70–90s entre clientes.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={!!acao} onClick={() => void executar('d2', dispararVencemEm2Dias)} className="text-xs font-bold bg-blue-600 text-white px-4 py-2 rounded-lg disabled:opacity-50">{acao === 'd2' ? '...' : 'D-2'}</button>
            <button type="button" disabled={!!acao} onClick={() => void executar('hoje', dispararVencemHoje)} className="text-xs font-bold bg-emerald-600 text-white px-4 py-2 rounded-lg disabled:opacity-50">{acao === 'hoje' ? '...' : 'D0 hoje'}</button>
            <button type="button" disabled={!!acao} onClick={() => void executar('ontem', dispararVencidosOntem)} className="text-xs font-bold bg-amber-600 text-white px-4 py-2 rounded-lg disabled:opacity-50">{acao === 'ontem' ? '...' : 'D+1 ontem'}</button>
            <button type="button" disabled={!!acao} onClick={() => void executar('unica', dispararFaturaUnicaPendente)} className="text-xs font-bold bg-teal-600 text-white px-4 py-2 rounded-lg disabled:opacity-50">{acao === 'unica' ? '...' : '1 fatura'}</button>
            <button type="button" disabled={!!acao} onClick={() => void executar('rotina', dispararRotinaCobranca)} className="text-xs font-bold bg-purple-950 text-white px-4 py-2 rounded-lg disabled:opacity-50">{acao === 'rotina' ? '...' : 'Várias vencidas'}</button>
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-ink">Simulação (dry-run)</h2>
          <p className="text-xs text-ink-soft">Não envia mensagens — apenas lista quem receberia.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={!!acao} onClick={() => void executar('sim-d2', simularVencemEm2Dias)} className="text-xs font-semibold border border-line px-4 py-2 rounded-lg hover:bg-subtle disabled:opacity-50">Simular D-2</button>
            <button type="button" disabled={!!acao} onClick={() => void executar('sim-hoje', simularVencemHoje)} className="text-xs font-semibold border border-line px-4 py-2 rounded-lg hover:bg-subtle disabled:opacity-50">Simular D0</button>
            <button type="button" disabled={!!acao} onClick={() => void executar('sim-ontem', simularVencidosOntem)} className="text-xs font-semibold border border-line px-4 py-2 rounded-lg hover:bg-subtle disabled:opacity-50">Simular D+1</button>
          </div>
        </div>

        {resultado && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            <p className="font-semibold">{resultado.mensagem}</p>
            <p className="mt-1 text-xs">
              Enviados: {resultado.enviados} · Pulados: {resultado.pulados} · Sem WhatsApp:{' '}
              {resultado.semWhatsapp}
            </p>
          </div>
        )}

        {simulacao && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 space-y-2">
            <p>
              Total analisado: <strong>{simulacao.total}</strong> · Enviariam:{' '}
              <strong>{simulacao.enviariam}</strong> · Pulados:{' '}
              <strong>{simulacao.pulados}</strong>
            </p>
            {simulacao.linhasEnviariam.length > 0 && (
              <pre className="text-[10px] whitespace-pre-wrap max-h-48 overflow-y-auto bg-white/60 p-2 rounded-lg">
                {simulacao.linhasEnviariam.slice(0, 50).join('\n')}
                {simulacao.linhasEnviariam.length > 50
                  ? `\n... +${simulacao.linhasEnviariam.length - 50} mais`
                  : ''}
              </pre>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

