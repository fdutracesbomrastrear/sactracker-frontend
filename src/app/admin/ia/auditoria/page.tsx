'use client';

import { Suspense, useEffect, useState } from 'react';
import { PageHeader } from '@/modules/core/components/ui/PageHeader';
import { iaApi, AiAuditLog } from '@/modules/admin/api/ia';

function AuditoriaConteudo() {
  const [logs, setLogs] = useState<AiAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [abertos, setAbertos] = useState<Set<string>>(new Set());

  function toggleGaveta(id: string) {
    setAbertos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function loadLogs() {
    try {
      setLoading(true);
      const data = await iaApi.getAuditLogs();
      setLogs(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar auditoria');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
      <PageHeader
        title="Auditoria da IA"
        subtitle="Histórico de conversas onde a IA falhou e transferiu para humano"
        className="shrink-0"
      />
      
      <main className="flex-1 overflow-y-auto p-6 max-w-4xl">
            <div className="mb-6 flex justify-between items-center">
              <p className="text-sm text-ink-soft">
                Abaixo estão as conversas que começaram com o Bot, mas ele não conseguiu resolver e transferiu o atendimento (Modo Humano). Analise os diálogos para treinar a IA na tela de Treinamento.
              </p>
              <button onClick={loadLogs} className="px-3 py-1.5 bg-surface border border-line rounded shadow-sm text-sm font-semibold hover:bg-subtle">
                Atualizar
              </button>
            </div>

            {loading ? (
              <p className="text-ink-soft">Carregando auditoria...</p>
            ) : error ? (
              <p className="text-red-500">{error}</p>
            ) : logs.length === 0 ? (
              <div className="p-8 text-center bg-surface border border-line rounded-xl">
                <p className="text-ink-soft font-medium">Nenhuma falha registrada recentemente.</p>
                <p className="text-sm text-ink-faint mt-1">A IA conseguiu resolver tudo ou não houveram transferências.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {logs.map((log) => {
                  const aberto = abertos.has(log.id);
                  return (
                    <div key={log.id} className="bg-surface border border-line rounded-xl overflow-hidden shadow-sm">
                      <button
                        type="button"
                        onClick={() => toggleGaveta(log.id)}
                        aria-expanded={aberto}
                        className={`w-full bg-subtle px-4 py-3 flex justify-between items-center gap-3 text-left hover:bg-subtle/70 transition-colors ${aberto ? 'border-b border-line' : ''}`}
                      >
                        <div className="min-w-0">
                          <h3 className="font-bold text-ink truncate">{log.contact.name}</h3>
                          <p className="text-xs text-ink-soft truncate">
                            {log.contact.phone} · {log.messages.length} mensagens
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right hidden sm:block">
                            <span className="text-xs font-semibold px-2 py-1 rounded bg-amber-100 text-amber-700">
                              Transferido para Humano
                            </span>
                            <p className="text-xs text-ink-faint mt-1">
                              {new Date(log.updatedAt).toLocaleString('pt-BR')}
                            </p>
                          </div>
                          <svg
                            className={`w-5 h-5 text-ink-faint transition-transform ${aberto ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </button>
                      {aberto && (
                        <div className="p-4 bg-subtle/50 flex flex-col gap-3 max-h-96 overflow-y-auto">
                          {log.messages.map((msg) => (
                            <div key={msg.id} className={`max-w-[80%] p-3 rounded-lg text-sm ${msg.fromMe ? 'bg-purple-100 text-ink ml-auto' : 'bg-surface border border-line text-ink'}`}>
                              <span className="font-bold text-xs opacity-50 block mb-1">
                                {msg.fromMe ? 'Bot Gina' : 'Cliente'}
                              </span>
                              {msg.content}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
      </main>
    </div>
  );
}

export default function AuditoriaPage() {
  return (
    <Suspense fallback={<div className="p-8 text-ink-soft">Carregando...</div>}>
      <AuditoriaConteudo />
    </Suspense>
  );
}
