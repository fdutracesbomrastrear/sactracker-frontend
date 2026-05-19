'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ClienteFinanceiroGrupo,
  enviarFaturaWhatsapp,
  EnviarWhatsappTipo,
  fetchFinanceiroFaturas,
  fetchFinanceiroPorDocumento,
  formatarTextoBoleto,
  FaturaItem,
  resolverTelefoneCliente,
} from '@/lib/financeiro';

type FinanceiroPanelProps = {
  compact?: boolean;
  documentoInicial?: string;
  telefoneAtivo?: string;
  ticketId?: string;
  onEnviarNoChat?: (texto: string) => void;
  onMensagensEnviadas?: () => void;
};

function statusBadgeClass(status: string) {
  if (status === '3') return 'bg-red-100 text-red-700 border-red-200';
  if (status === '2') return 'bg-amber-100 text-amber-800 border-amber-200';
  if (status === '1') return 'bg-green-100 text-green-700 border-green-200';
  return 'bg-slate-100 text-slate-600 border-slate-200';
}

export function FinanceiroPanel({
  compact = false,
  documentoInicial = '',
  telefoneAtivo,
  ticketId,
  onEnviarNoChat,
  onMensagensEnviadas,
}: FinanceiroPanelProps) {
  const [busca, setBusca] = useState('');
  const [buscaDeb, setBuscaDeb] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [documento, setDocumento] = useState(documentoInicial);
  const [dados, setDados] = useState<ClienteFinanceiroGrupo[]>([]);
  const [grupoUnico, setGrupoUnico] = useState<ClienteFinanceiroGrupo | null>(null);
  const [total, setTotal] = useState(0);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [enviandoWpp, setEnviandoWpp] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setBuscaDeb(busca.trim()), 400);
    return () => window.clearTimeout(t);
  }, [busca]);

  const carregarLista = useCallback(async () => {
    if (compact) return;
    setCarregando(true);
    setErro(null);
    setGrupoUnico(null);
    try {
      const r = await fetchFinanceiroFaturas({
        q: buscaDeb || undefined,
        status: filtroStatus || undefined,
        take: 50,
        skip: 0,
      });
      setDados(r.clientes);
      setTotal(r.total);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar');
      setDados([]);
    } finally {
      setCarregando(false);
    }
  }, [buscaDeb, filtroStatus, compact]);

  useEffect(() => {
    if (!compact) void carregarLista();
  }, [carregarLista, compact]);

  async function consultarDocumento() {
    const doc = documento.replace(/\D/g, '');
    if (doc.length !== 11 && doc.length !== 14) {
      setErro('Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido');
      return;
    }
    setCarregando(true);
    setErro(null);
    try {
      const g = await fetchFinanceiroPorDocumento(doc);
      setGrupoUnico(g);
      setDados([]);
    } catch (e) {
      setGrupoUnico(null);
      setErro(e instanceof Error ? e.message : 'Cliente não encontrado');
    } finally {
      setCarregando(false);
    }
  }

  const gruposExibir = grupoUnico ? [grupoUnico] : dados;

  async function dispararWhatsapp(
    grupo: ClienteFinanceiroGrupo,
    f: FaturaItem,
    tipo: EnviarWhatsappTipo
  ) {
    const telefone = resolverTelefoneCliente(grupo, telefoneAtivo);
    if (!telefone) {
      setErro('Cliente sem telefone cadastrado na Rastro System');
      return;
    }

    const chave = `${f.id}-${tipo}`;
    setEnviandoWpp(chave);
    setErro(null);
    setFeedback(null);
    try {
      await enviarFaturaWhatsapp({
        telefone,
        tipo,
        fatura: f,
        nomeCliente: grupo.pessoa.nome,
        ticketId,
      });
      setFeedback(
        tipo === 'pix'
          ? 'PIX enviado no WhatsApp do cliente'
          : 'Boleto enviado no WhatsApp do cliente'
      );
      onMensagensEnviadas?.();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao enviar WhatsApp');
    } finally {
      setEnviandoWpp(null);
    }
  }

  function renderFatura(f: FaturaItem, grupo: ClienteFinanceiroGrupo) {
    const telefone = resolverTelefoneCliente(grupo, telefoneAtivo);
    const nome = grupo.pessoa.nome;
    const enviandoBoleto = enviandoWpp === `${f.id}-boleto`;
    const enviandoPix = enviandoWpp === `${f.id}-pix`;
    return (
      <div
        key={f.id}
        className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 space-y-2"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-slate-800">
              Venc: {f.dataFormatada}
              {f.diasAtraso > 0 && (
                <span className="text-red-600"> ({f.diasAtraso}d atraso)</span>
              )}
            </p>
            <p className="text-sm font-bold text-purple-900">
              R$ {f.valorCalculado}
            </p>
          </div>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusBadgeClass(f.status)}`}
          >
            {f.statusTexto}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {f.linkBoleto && (
            <a
              href={f.linkBoleto}
              target="_blank"
              rel="noreferrer"
              className="text-[10px] font-semibold bg-purple-950 text-white px-2 py-1 rounded-lg hover:bg-purple-900"
            >
              PDF
            </a>
          )}
          <button
            type="button"
            disabled={!telefone || !!enviandoWpp}
            title={telefone ? 'Enviar resumo do boleto no WhatsApp do cliente' : 'Sem telefone cadastrado'}
            onClick={() => void dispararWhatsapp(grupo, f, 'boleto')}
            className="text-[10px] font-semibold bg-emerald-600 text-white px-2 py-1 rounded-lg hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {enviandoBoleto ? '...' : 'WhatsApp'}
          </button>
          {f.pixCopiaCola && (
            <>
              <button
                type="button"
                disabled={!telefone || !!enviandoWpp}
                title={telefone ? 'Enviar PIX copia e cola no WhatsApp' : 'Sem telefone cadastrado'}
                onClick={() => void dispararWhatsapp(grupo, f, 'pix')}
                className="text-[10px] font-semibold bg-teal-600 text-white px-2 py-1 rounded-lg hover:bg-teal-500 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {enviandoPix ? '...' : 'PIX WhatsApp'}
              </button>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(f.pixCopiaCola!);
                  setFeedback('PIX copiado para a área de transferência');
                }}
                className="text-[10px] font-semibold border border-slate-200 bg-white px-2 py-1 rounded-lg hover:bg-slate-50"
              >
                Copiar PIX
              </button>
            </>
          )}
          {onEnviarNoChat && (
            <button
              type="button"
              onClick={() => onEnviarNoChat(formatarTextoBoleto(f, nome))}
              className="text-[10px] font-semibold bg-amber-400 text-purple-950 px-2 py-1 rounded-lg hover:bg-amber-500"
            >
              Chat ativo
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${compact ? 'h-full' : 'min-h-0 flex-1'}`}>
      <div className={`${compact ? 'p-4' : 'p-6'} border-b border-slate-100 shrink-0`}>
        <div className="flex items-center justify-between gap-2 mb-2">
          <h3 className="text-sm font-bold uppercase tracking-wider text-purple-900">
            Financeiro
          </h3>
          {!compact && (
            <Link
              href="/financeiro"
              className="text-[10px] font-semibold text-blue-600 hover:underline"
            >
              Tela completa
            </Link>
          )}
        </div>
        <p className="text-xs text-slate-500 mb-3">
          Boletos espelhados da Rastro System (RS Trak)
        </p>

        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={documento}
            onChange={(e) => setDocumento(e.target.value)}
            placeholder="CPF ou CNPJ do cliente"
            className="flex-1 text-xs rounded-lg border border-slate-200 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
          />
          <button
            type="button"
            onClick={() => void consultarDocumento()}
            disabled={carregando}
            className="text-xs font-bold bg-purple-950 text-white px-3 py-1.5 rounded-lg disabled:opacity-50"
          >
            Buscar
          </button>
        </div>

        {!compact && (
          <>
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar nome, CPF ou telefone…"
              className="w-full text-xs rounded-lg border border-slate-200 px-2 py-1.5 mb-2 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
            />
            <div className="flex gap-1 flex-wrap">
              {[
                { v: '', l: 'Todos' },
                { v: '3', l: 'Vencidos' },
                { v: '2', l: 'Abertos' },
                { v: '1', l: 'Pagos' },
              ].map((opt) => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setFiltroStatus(opt.v)}
                  className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                    filtroStatus === opt.v
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {opt.l}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {erro && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg p-2">
            {erro}
          </p>
        )}
        {feedback && (
          <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg p-2">
            {feedback}
          </p>
        )}
        {carregando && (
          <p className="text-xs text-slate-400 text-center">Consultando Rastro System…</p>
        )}
        {!carregando && gruposExibir.length === 0 && (
          <p className="text-xs text-slate-400 text-center">
            {compact
              ? 'Busque pelo CPF/CNPJ do cliente'
              : 'Nenhum cliente encontrado. Ajuste os filtros ou busque por documento.'}
          </p>
        )}
        {!compact && total > 0 && (
          <p className="text-[10px] uppercase tracking-wider text-slate-400">
            {gruposExibir.length} de {total} clientes
          </p>
        )}
        {gruposExibir.map((grupo) => (
          <div
            key={grupo.pessoa.id}
            className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm"
          >
            <div className="px-3 py-2.5 bg-slate-50 border-b border-slate-100 flex justify-between items-start gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-800">{grupo.pessoa.nome}</p>
                <p className="text-[10px] text-slate-500">
                  {grupo.pessoa.documento || 'Sem documento'}
                </p>
              </div>
              {grupo.temBoletosAtrasados && (
                <span className="text-[9px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full shrink-0">
                  EM ATRASO
                </span>
              )}
            </div>
            <div className="p-3 space-y-2">
              {grupo.faturas.length === 0 ? (
                <p className="text-xs italic text-slate-400">Sem faturas.</p>
              ) : (
                grupo.faturas.map((f) => renderFatura(f, grupo))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
