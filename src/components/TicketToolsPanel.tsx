'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { extrairPlacaDoTexto } from '@/lib/placa';
import {
  cancelCobrancaAgendamento,
  CobrancaAgendamentoItem,
  createCobrancaAgendamento,
  createCrmNote,
  CrmNoteItem,
  fetchTicketCrm,
  PausaAtiva,
} from '@/lib/crm';

type Tab = 'crm' | 'agcob';

type Props = {
  ticketId: string;
  contactName: string;
  documentoSugerido?: string;
  initialTab?: Tab;
  onClose: () => void;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function TicketToolsPanel({
  ticketId,
  contactName,
  documentoSugerido = '',
  initialTab = 'crm',
  onClose,
}: Props) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [notes, setNotes] = useState<CrmNoteItem[]>([]);
  const [agendamentos, setAgendamentos] = useState<CobrancaAgendamentoItem[]>([]);
  const [pausaAtiva, setPausaAtiva] = useState<PausaAtiva | null>(null);

  const [notaBody, setNotaBody] = useState('');
  const [notaFollowUp, setNotaFollowUp] = useState('');
  const [salvandoNota, setSalvandoNota] = useState(false);

  const [cpf, setCpf] = useState(documentoSugerido);
  const [contrato, setContrato] = useState('');
  const [retomarEm, setRetomarEm] = useState('');
  const [motivo, setMotivo] = useState('');
  const [salvandoAg, setSalvandoAg] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const data = await fetchTicketCrm(ticketId);
      setNotes(data.notes);
      setAgendamentos(data.agendamentos);
      setPausaAtiva(data.pausaAtiva);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab, ticketId]);

  useEffect(() => {
    if (documentoSugerido) setCpf(documentoSugerido);
  }, [documentoSugerido]);

  const handleSalvarNota = async () => {
    if (!notaBody.trim()) return;
    setSalvandoNota(true);
    setErro(null);
    try {
      const note = await createCrmNote(
        ticketId,
        notaBody.trim(),
        notaFollowUp || undefined
      );
      setNotes((prev) => [note, ...prev]);
      setNotaBody('');
      setNotaFollowUp('');
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro');
    } finally {
      setSalvandoNota(false);
    }
  };

  const handleAgendar = async () => {
    if (!cpf.trim() || !retomarEm) {
      setErro('Informe CPF/CNPJ e a data para retomar a cobrança.');
      return;
    }
    setSalvandoAg(true);
    setErro(null);
    try {
      const ag = await createCobrancaAgendamento(ticketId, {
        cpf: cpf.trim(),
        retomarEm,
        contrato: contrato.trim() || undefined,
        motivo: motivo.trim() || undefined,
      });
      setPausaAtiva(ag);
      setContrato('');
      setMotivo('');
      setRetomarEm('');
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro');
    } finally {
      setSalvandoAg(false);
    }
  };

  const handleCancelarPausa = async () => {
    if (!pausaAtiva) return;
    setSalvandoAg(true);
    try {
      await cancelCobrancaAgendamento(pausaAtiva.id);
      setPausaAtiva(null);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro');
    } finally {
      setSalvandoAg(false);
    }
  };

  const placaSugerida = extrairPlacaDoTexto(contactName);

  return (
    <div className="absolute inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/25 backdrop-blur-[1px]"
        aria-label="Fechar painel"
        onClick={onClose}
      />
      <div className="relative z-50 w-full max-w-md bg-white shadow-2xl border-l border-slate-200 flex flex-col h-full">
        {placaSugerida ? (
          <div className="px-4 py-2 border-b border-purple-100 bg-purple-50 shrink-0">
            <Link
              href={`/monitoramento?placa=${encodeURIComponent(placaSugerida)}`}
              className="text-xs font-semibold text-purple-800 hover:underline"
            >
              Ver {placaSugerida} no monitoramento →
            </Link>
          </div>
        ) : null}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
          <div>
            <h3 className="font-semibold text-slate-900 text-sm">Ferramentas</h3>
            <p className="text-xs text-slate-500 truncate max-w-[240px]">{contactName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <div className="flex border-b border-slate-100 shrink-0">
          <button
            type="button"
            onClick={() => setTab('crm')}
            className={`flex-1 py-2.5 text-xs font-semibold ${
              tab === 'crm'
                ? 'text-purple-900 border-b-2 border-purple-700'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            CRM
          </button>
          <button
            type="button"
            onClick={() => setTab('agcob')}
            className={`flex-1 py-2.5 text-xs font-semibold ${
              tab === 'agcob'
                ? 'text-purple-900 border-b-2 border-purple-700'
                : 'text-slate-500 hover:text-slate-700'
            }`}
            title="Agendamento de cobrança"
          >
            Ag. Cob.
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {erro && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg p-2 mb-3">
              {erro}
            </p>
          )}
          {loading && <p className="text-sm text-slate-400">Carregando...</p>}

          {!loading && tab === 'crm' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 space-y-2">
                <label className="text-xs font-semibold text-slate-700">Nova anotação</label>
                <textarea
                  value={notaBody}
                  onChange={(e) => setNotaBody(e.target.value)}
                  rows={3}
                  placeholder="Negociação, combinado com o cliente, próximos passos..."
                  className="w-full text-sm text-slate-900 bg-white rounded-lg border border-slate-200 px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-purple-200"
                />
                <label className="text-[11px] text-slate-500 block">
                  Retornar contato em (opcional)
                </label>
                <input
                  type="date"
                  value={notaFollowUp}
                  onChange={(e) => setNotaFollowUp(e.target.value)}
                  className="w-full text-sm text-slate-900 bg-white rounded-lg border border-slate-200 px-3 py-1.5"
                />
                <button
                  type="button"
                  disabled={salvandoNota || !notaBody.trim()}
                  onClick={() => void handleSalvarNota()}
                  className="w-full py-2 text-xs font-semibold bg-purple-950 text-white rounded-lg disabled:opacity-50"
                >
                  {salvandoNota ? 'Salvando…' : 'Salvar anotação'}
                </button>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                  Histórico
                </h4>
                {notes.length === 0 && (
                  <p className="text-xs text-slate-400">Nenhuma anotação ainda.</p>
                )}
                {notes.map((n) => (
                  <div
                    key={n.id}
                    className="rounded-lg border border-slate-100 bg-white p-3 text-sm shadow-sm"
                  >
                    <p className="text-slate-800 whitespace-pre-wrap">{n.body}</p>
                    {n.followUpAt && (
                      <p className="text-[11px] text-amber-700 mt-1">
                        Retorno: {formatDate(n.followUpAt)}
                      </p>
                    )}
                    <p className="text-[10px] text-slate-400 mt-2">
                      {n.createdBy.name} · {formatDateTime(n.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && tab === 'agcob' && (
            <div className="space-y-4">
              {pausaAtiva && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm">
                  <p className="font-semibold text-emerald-900">Cobrança pausada</p>
                  <p className="text-xs text-emerald-800 mt-1">
                    Retoma em <strong>{formatDate(pausaAtiva.retomarEm)}</strong>
                    {pausaAtiva.contrato ? ` · Contrato ${pausaAtiva.contrato}` : ''}
                  </p>
                  {pausaAtiva.motivo && (
                    <p className="text-xs text-emerald-700 mt-1">{pausaAtiva.motivo}</p>
                  )}
                  <button
                    type="button"
                    disabled={salvandoAg}
                    onClick={() => void handleCancelarPausa()}
                    className="mt-2 text-xs font-medium text-red-700 hover:underline"
                  >
                    Cancelar pausa e voltar a cobrar
                  </button>
                </div>
              )}

              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 space-y-2">
                <p className="text-xs text-slate-600">
                  O cliente combinou um prazo? Pausa a cobrança automática (bot e rotinas) até a
                  data. Depois disso, se ainda houver pendência, volta a ser cobrado.
                </p>
                <label className="text-xs font-semibold text-slate-700">CPF / CNPJ</label>
                <input
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  placeholder="Somente números"
                  className="w-full text-sm text-slate-900 bg-white rounded-lg border border-slate-200 px-3 py-2"
                />
                <label className="text-xs font-semibold text-slate-700">Contrato (opcional)</label>
                <input
                  value={contrato}
                  onChange={(e) => setContrato(e.target.value)}
                  className="w-full text-sm text-slate-900 bg-white rounded-lg border border-slate-200 px-3 py-2"
                />
                <label className="text-xs font-semibold text-slate-700">
                  Retomar cobrança em
                </label>
                <input
                  type="date"
                  value={retomarEm}
                  onChange={(e) => setRetomarEm(e.target.value)}
                  className="w-full text-sm text-slate-900 bg-white rounded-lg border border-slate-200 px-3 py-2"
                />
                <label className="text-xs font-semibold text-slate-700">Observações</label>
                <textarea
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  rows={2}
                  className="w-full text-sm rounded-lg border border-slate-200 px-3 py-2 resize-none"
                />
                <button
                  type="button"
                  disabled={salvandoAg}
                  onClick={() => void handleAgendar()}
                  className="w-full py-2 text-xs font-semibold bg-teal-700 text-white rounded-lg disabled:opacity-50"
                >
                  {salvandoAg ? 'Salvando…' : 'Agendar pausa de cobrança'}
                </button>
              </div>

              {agendamentos.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                    Histórico de agendamentos
                  </h4>
                  {agendamentos.map((a) => (
                    <div
                      key={a.id}
                      className="rounded-lg border border-slate-100 p-2 text-xs text-slate-600"
                    >
                      <span
                        className={`font-semibold ${
                          a.status === 'ACTIVE' ? 'text-teal-700' : 'text-slate-400'
                        }`}
                      >
                        {a.status === 'ACTIVE' ? 'Ativo' : 'Cancelado'}
                      </span>
                      {' · '}
                      até {formatDate(a.retomarEm)} · CPF ***{a.cpf.slice(-4)}
                      <br />
                      {a.createdBy.name} · {formatDateTime(a.createdAt)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
