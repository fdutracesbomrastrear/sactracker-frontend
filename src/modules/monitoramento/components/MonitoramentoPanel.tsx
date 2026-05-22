'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  bloquearVeiculoMonitoramento,
  desbloquearVeiculoMonitoramento,
  enviarSmsLivreMonitoramento,
  fetchChipsManual,
  fetchFamiliasComandos,
  fetchProtocolosModelos,
  salvarChipManual,
  fetchHistoricoSms,
  fetchRastreamentoConfig,
  fetchVeiculoMonitoramento,
  fetchVeiculoPorPlaca,
  fetchVeiculosMonitoramento,
  FiltroVeiculo,
  OrdenarVeiculo,
  RastreamentoConfig,
  SmsHistoricoItem,
  VeiculoMonitoramento,
} from '@/modules/monitoramento/api/rastreamento';
import { getUser } from '@/modules/core/lib/auth';
import { canEnviarComandoSms, parsePermissions } from '@/modules/core/lib/roles';
import { StatusVeiculoPanel } from '@/modules/monitoramento/components/StatusVeiculoPanel';

type AcaoComando = 'bloquear' | 'desbloquear' | null;

const FILTROS: { id: FiltroVeiculo; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'bloqueados', label: 'Bloqueados' },
  { id: 'sem_sinal', label: 'Sem sinal' },
  { id: 'sem_chip', label: 'Sem chip' },
  { id: 'ignicao_ligada', label: 'Ignição on' },
];

function BotoesComandoVeiculo({
  veiculo,
  enviando,
  podeSms,
  onBloquear,
  onDesbloquear,
}: {
  veiculo: VeiculoMonitoramento;
  enviando: AcaoComando;
  podeSms: boolean;
  onBloquear: () => void;
  onDesbloquear: () => void;
}) {
  const eq = veiculo.comandosRastreador;
  const ocupado = enviando !== null;
  const desabilitadoBase = !podeSms || ocupado;

  return (
    <div className="space-y-2">
      {!podeSms ? (
        <p className="text-xs text-slate-500">Envio SMS: perfil Atendente (somente leitura).</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onBloquear}
          disabled={desabilitadoBase || !eq.chip || !eq.comandoBloquear}
          className="inline-flex flex-1 min-w-[120px] items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
        >
          {enviando === 'bloquear' ? 'Enviando…' : 'Bloquear'}
        </button>
        <button
          type="button"
          onClick={onDesbloquear}
          disabled={desabilitadoBase || !eq.chip || !eq.comandoDesbloquear}
          className="inline-flex flex-1 min-w-[120px] items-center justify-center gap-2 rounded-lg border border-emerald-600 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
        >
          {enviando === 'desbloquear' ? 'Enviando…' : 'Desbloquear'}
        </button>
      </div>
    </div>
  );
}

function IndicadorLista({ v }: { v: VeiculoMonitoramento }) {
  const cor =
    v.status.bloqueado === true
      ? 'bg-red-500'
      : v.status.online === false
        ? 'bg-amber-400'
        : v.status.online === true
          ? 'bg-emerald-500'
          : 'bg-slate-300';
  return <span className={`inline-block w-2 h-2 rounded-full ${cor} mr-1.5`} title="Status" />;
}

export function MonitoramentoPanel() {
  const searchParams = useSearchParams();
  const role = parsePermissions(getUser()?.permissions);
  const podeSms = canEnviarComandoSms(role);

  const [cfg, setCfg] = useState<RastreamentoConfig | null>(null);
  const [veiculos, setVeiculos] = useState<VeiculoMonitoramento[]>([]);
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<FiltroVeiculo>('todos');
  const [ordenar, setOrdenar] = useState<OrdenarVeiculo>('placa');
  const [carregando, setCarregando] = useState(true);
  const [enviandoComando, setEnviandoComando] = useState<AcaoComando>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [msgOk, setMsgOk] = useState<string | null>(null);
  const [acompanharAoVivo, setAcompanharAoVivo] = useState(false);
  const [aguardandoConfirmacao, setAguardandoConfirmacao] = useState(false);
  const [ultimaAcaoSms, setUltimaAcaoSms] = useState<'bloquear' | 'desbloquear' | null>(null);
  const [historico, setHistorico] = useState<SmsHistoricoItem[]>([]);
  const [comandoLivre, setComandoLivre] = useState('');
  const [mostrarChips, setMostrarChips] = useState(false);
  const [mostrarProtocolos, setMostrarProtocolos] = useState(false);
  const deepLinkHandled = useRef(false);

  const selecionado = veiculos.find((v) => v.id === selecionadoId) ?? null;

  const atualizarVeiculoNaLista = useCallback((atualizado: VeiculoMonitoramento) => {
    setVeiculos((lista) => lista.map((v) => (v.id === atualizado.id ? atualizado : v)));
    setSelecionadoId(atualizado.id);
  }, []);

  const carregar = useCallback(
    async (atualizar = false) => {
      setCarregando(true);
      setErro(null);
      try {
        const clienteParam = searchParams.get('cliente') || undefined;
        const [c, lista] = await Promise.all([
          fetchRastreamentoConfig(),
          fetchVeiculosMonitoramento({
            q: busca.trim() || undefined,
            cliente: clienteParam,
            filtro,
            ordenar,
            atualizar,
          }),
        ]);
        setCfg(c);
        setVeiculos(lista.veiculos);
        return lista.veiculos;
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'Erro ao carregar frota');
        return [];
      } finally {
        setCarregando(false);
      }
    },
    [busca, filtro, ordenar, searchParams]
  );

  const recarregarSelecionado = useCallback(async () => {
    if (!selecionadoId) return;
    try {
      const fresh = await fetchVeiculoMonitoramento(selecionadoId, true);
      atualizarVeiculoNaLista(fresh);
      const h = await fetchHistoricoSms(selecionadoId);
      setHistorico(h);
    } catch {
      /* ignore */
    }
  }, [selecionadoId, atualizarVeiculoNaLista]);

  useEffect(() => {
    void carregar(true).then((lista) => {
      if (deepLinkHandled.current) return;
      const placa = searchParams.get('placa');
      const id = searchParams.get('id');
      if (placa) {
        void fetchVeiculoPorPlaca(placa, true)
          .then((v) => {
            atualizarVeiculoNaLista(v);
            deepLinkHandled.current = true;
          })
          .catch(() => {
            const found = lista.find(
              (x) => x.placa.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() ===
                placa.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
            );
            if (found) setSelecionadoId(found.id);
          });
      } else if (id) {
        setSelecionadoId(id);
        deepLinkHandled.current = true;
      } else if (lista[0]) {
        setSelecionadoId(lista[0].id);
      }
    });
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void carregar(true), 400);
    return () => clearTimeout(t);
  }, [busca, filtro, ordenar, carregar]);

  useEffect(() => {
    if (!acompanharAoVivo || !selecionadoId) return;
    const t = setInterval(() => void recarregarSelecionado(), 30000);
    return () => clearInterval(t);
  }, [acompanharAoVivo, selecionadoId, recarregarSelecionado]);

  useEffect(() => {
    if (!selecionadoId) return;
    void fetchHistoricoSms(selecionadoId).then(setHistorico).catch(() => setHistorico([]));
  }, [selecionadoId]);

  useEffect(() => {
    if (!aguardandoConfirmacao || !selecionado || !ultimaAcaoSms) return;
    let n = 0;
    const esperado = ultimaAcaoSms === 'bloquear';
    const t = setInterval(() => {
      n += 1;
      void fetchVeiculoMonitoramento(selecionado.id, true).then((v) => {
        atualizarVeiculoNaLista(v);
        const ok = esperado ? v.status.bloqueado === true : v.status.bloqueado === false;
        if (ok || n >= 6) {
          setAguardandoConfirmacao(false);
          if (ok) setMsgOk('Status do rastreador atualizado.');
          else if (n >= 6) setMsgOk('Comando enviado. Atualize novamente se o status não mudou.');
        }
      });
    }, 30000);
    return () => clearInterval(t);
  }, [aguardandoConfirmacao, selecionado, ultimaAcaoSms, atualizarVeiculoNaLista]);

  async function handleComando(acao: 'bloquear' | 'desbloquear') {
    if (!selecionado || !podeSms) return;
    const eq = selecionado.comandosRastreador;
    const comando = acao === 'bloquear' ? eq.comandoBloquear : eq.comandoDesbloquear;
    if (!eq.chip || !comando) {
      setErro('Chip ou comando indisponível.');
      return;
    }
    if (!window.confirm(`Enviar ${acao} para ${selecionado.placa}?\n\n${comando}\n${eq.chip}`)) return;

    setEnviandoComando(acao);
    setUltimaAcaoSms(acao);
    setErro(null);
    setMsgOk(null);
    try {
      const r =
        acao === 'bloquear'
          ? await bloquearVeiculoMonitoramento(selecionado.id)
          : await desbloquearVeiculoMonitoramento(selecionado.id);
      setMsgOk(
        r.aviso ||
          (r.simulado
            ? 'Modo simulado.'
            : `Enviado. Ref: ${r.referencia || r.logId || '—'}`)
      );
      setAguardandoConfirmacao(true);
      await recarregarSelecionado();
    } catch (e) {
      setErro(e instanceof Error ? e.message : `Falha ao ${acao}`);
    } finally {
      setEnviandoComando(null);
    }
  }

  async function enviarLivre() {
    if (!selecionado || !podeSms || !comandoLivre.trim()) return;
    setEnviandoComando(null);
    setErro(null);
    try {
      const r = await enviarSmsLivreMonitoramento(selecionado.id, comandoLivre.trim());
      setMsgOk(`SMS livre enviado. Ref: ${r.referencia || '—'}`);
      setComandoLivre('');
      await recarregarSelecionado();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha no envio');
    }
  }

  function copiarLink() {
    if (!selecionado) return;
    const url =
      selecionado.linkMonitoramentoRastro ||
      selecionado.linkGoogleMaps ||
      '';
    if (!url) {
      setErro('Nenhum link disponível.');
      return;
    }
    void navigator.clipboard.writeText(url).then(() => setMsgOk('Link copiado.'));
  }

  const enderecoExibicao =
    selecionado?.posicao?.endereco ||
    selecionado?.posicao?.enderecoGeocodificado ||
    null;

  const mapaSrc =
    selecionado?.linkMonitoramentoRastro ||
    (selecionado?.posicao &&
      `https://www.google.com/maps?q=${selecionado.posicao.latitude},${selecionado.posicao.longitude}&z=15&output=embed`);

  return (
    <div className="flex h-full min-h-0 w-full">
      <aside className="w-80 shrink-0 border-r border-slate-200 bg-white flex flex-col">
        <div className="p-3 border-b border-slate-100 space-y-2">
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar placa, cliente…"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <div className="flex flex-wrap gap-1">
            {FILTROS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFiltro(f.id)}
                className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                  filtro === f.id ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <select
            value={ordenar}
            onChange={(e) => setOrdenar(e.target.value as OrdenarVeiculo)}
            className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5"
          >
            <option value="placa">Ordenar: placa</option>
            <option value="bloqueados_primeiro">Bloqueados primeiro</option>
            <option value="comunicacao_antiga">Sem comunicação há mais tempo</option>
          </select>
          <button
            type="button"
            onClick={() => void carregar(true)}
            disabled={carregando}
            className="w-full text-xs font-medium rounded-lg border border-slate-200 py-2 hover:bg-slate-50 disabled:opacity-50"
          >
            {carregando ? 'Atualizando…' : 'Atualizar posições'}
          </button>
          {cfg ? (
            <p className="text-[10px] text-slate-500">
              {veiculos.length} veículo(s)
              {!cfg.smsGatewayConfigurado ? ' · SMS simulado' : ' · ClickSend ativo'}
            </p>
          ) : null}
        </div>
        <ul className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {veiculos.map((v) => (
            <li key={v.id}>
              <button
                type="button"
                onClick={() => {
                  setSelecionadoId(v.id);
                  setMsgOk(null);
                  setErro(null);
                }}
                className={`w-full text-left px-3 py-3 hover:bg-purple-50 ${
                  v.id === selecionadoId ? 'bg-purple-50 border-l-4 border-purple-600' : ''
                }`}
              >
                <div className="flex items-center">
                  <IndicadorLista v={v} />
                  <span className="font-semibold text-sm text-purple-950">{v.placa}</span>
                </div>
                <div className="text-xs text-slate-600 truncate pl-3.5">{v.cliente || '—'}</div>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="flex-1 flex flex-col min-w-0 bg-slate-50">
        {!selecionado ? (
          <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
            Selecione um veículo.
          </div>
        ) : (
          <>
            <header className="shrink-0 bg-white border-b px-6 py-4 flex flex-wrap justify-between gap-2">
              <div>
                <h2 className="text-xl font-bold text-purple-950">{selecionado.placa}</h2>
                <p className="text-sm text-slate-600">
                  {selecionado.cliente || selecionado.nome}
                  {selecionado.statusVeiculo ? ` · ${selecionado.statusVeiculo}` : ''}
                </p>
                {selecionado.cliente ? (
                  <Link
                    href={`/financeiro?q=${encodeURIComponent(selecionado.cliente)}`}
                    className="text-xs text-purple-700 hover:underline"
                  >
                    Ver financeiro do cliente
                  </Link>
                ) : null}
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={acompanharAoVivo}
                  onChange={(e) => setAcompanharAoVivo(e.target.checked)}
                />
                Acompanhar ao vivo (30s)
              </label>
            </header>

            {cfg?.smsGatewayConfigurado && podeSms ? (
              <div className="mx-6 mt-2 text-xs text-sky-800 bg-sky-50 border border-sky-100 rounded-lg px-3 py-2">
                Envio real via ClickSend — consome créditos da conta.
              </div>
            ) : null}

            {aguardandoConfirmacao ? (
              <div className="mx-6 mt-2 text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                Aguardando confirmação do rastreador (consulta a cada 30s)…
              </div>
            ) : null}

            {erro ? (
              <div className="mx-6 mt-2 text-sm text-red-800 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {erro}
              </div>
            ) : null}
            {msgOk ? (
              <div className="mx-6 mt-2 text-sm text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                {msgOk}
              </div>
            ) : null}

            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2">
              <div className="p-4 space-y-4 overflow-y-auto bg-white border-r border-slate-200">
                <StatusVeiculoPanel status={selecionado.status} />

                <div>
                  <h3 className="text-sm font-semibold mb-1">Localização</h3>
                  {enderecoExibicao ? (
                    <p className="text-sm text-slate-700">{enderecoExibicao}</p>
                  ) : (
                    <p className="text-sm text-slate-500">Sem endereço (geocoding ao atualizar).</p>
                  )}
                  <div className="flex gap-2 mt-2">
                    {selecionado.linkGoogleMaps ? (
                      <a
                        href={selecionado.linkGoogleMaps}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-purple-700 font-medium hover:underline"
                      >
                        Google Maps
                      </a>
                    ) : null}
                    <button
                      type="button"
                      onClick={copiarLink}
                      className="text-xs text-slate-600 hover:text-slate-900"
                    >
                      Copiar link
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <h3 className="text-sm font-semibold">Comandos SMS</h3>
                  <BotoesComandoVeiculo
                    veiculo={selecionado}
                    enviando={enviandoComando}
                    podeSms={podeSms}
                    onBloquear={() => void handleComando('bloquear')}
                    onDesbloquear={() => void handleComando('desbloquear')}
                  />
                  {podeSms ? (
                    <div className="space-y-1">
                      <textarea
                        value={comandoLivre}
                        onChange={(e) => setComandoLivre(e.target.value)}
                        placeholder="Comando SMS livre (ex: WHERE#)"
                        rows={2}
                        className="w-full text-xs font-mono border border-slate-200 rounded-lg p-2"
                      />
                      <button
                        type="button"
                        onClick={() => void enviarLivre()}
                        className="text-xs font-semibold bg-slate-800 text-white px-3 py-1.5 rounded-lg"
                      >
                        Enviar comando livre
                      </button>
                    </div>
                  ) : null}
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-2">Histórico SMS</h3>
                  {historico.length === 0 ? (
                    <p className="text-xs text-slate-500">Nenhum comando registrado.</p>
                  ) : (
                    <ul className="space-y-1 max-h-32 overflow-y-auto text-xs">
                      {historico.map((h) => (
                        <li key={h.id} className="border-b border-slate-100 pb-1">
                          <span className="font-medium">{h.acao}</span> — {h.comando}{' '}
                          <span className="text-slate-500">
                            {new Date(h.createdAt).toLocaleString('pt-BR')} · {h.user.name}
                            {h.simulado ? ' (sim)' : ''}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setMostrarChips((m) => !m)}
                  className="text-xs text-purple-700 font-medium"
                >
                  {mostrarChips ? 'Ocultar' : 'Ver'} chips manuais (CSV)
                </button>
                {mostrarChips ? <ChipsPanel podeEditar={role.includes('ADMIN')} placaPadrao={selecionado.placa} /> : null}

                <button
                  type="button"
                  onClick={() => setMostrarProtocolos((m) => !m)}
                  className="text-xs text-purple-700 font-medium block mt-2"
                >
                  {mostrarProtocolos ? 'Ocultar' : 'Ver'} protocolos e comandos (JSON)
                </button>
                {mostrarProtocolos ? <ProtocolosPanel /> : null}
              </div>

              <div className="min-h-[280px] relative bg-slate-200">
                {mapaSrc ? (
                  <iframe title="Mapa" src={mapaSrc} className="absolute inset-0 w-full h-full border-0" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-500">
                    Mapa indisponível
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function ChipsPanel({ podeEditar, placaPadrao }: { podeEditar: boolean; placaPadrao: string }) {
  const [linhas, setLinhas] = useState<Awaited<ReturnType<typeof fetchChipsManual>> | null>(null);
  const [placa, setPlaca] = useState(placaPadrao);
  const [chip, setChip] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erroChip, setErroChip] = useState<string | null>(null);

  const recarregar = useCallback(() => {
    void fetchChipsManual().then(setLinhas).catch(() => setLinhas(null));
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  useEffect(() => {
    setPlaca(placaPadrao);
  }, [placaPadrao]);

  async function handleSalvarChip(e: React.FormEvent) {
    e.preventDefault();
    if (!podeEditar) return;
    setSalvando(true);
    setErroChip(null);
    try {
      await salvarChipManual({ placa: placa.trim(), chip: chip.trim(), imei: null, modelo: null, protocolo: null, observacao: null });
      setChip('');
      recarregar();
    } catch (err) {
      setErroChip(err instanceof Error ? err.message : 'Erro');
    } finally {
      setSalvando(false);
    }
  }

  if (!linhas) return <p className="text-xs text-slate-500">Carregando…</p>;

  return (
    <div className="text-xs border border-slate-200 rounded-lg p-2 space-y-2">
      <p className="text-slate-500 truncate">{linhas.arquivo}</p>
      {podeEditar ? (
        <form onSubmit={(e) => void handleSalvarChip(e)} className="flex flex-wrap gap-1 items-end">
          <label className="flex flex-col gap-0.5">
            <span className="text-slate-500">Placa</span>
            <input
              value={placa}
              onChange={(e) => setPlaca(e.target.value)}
              className="border border-slate-200 rounded px-1.5 py-0.5 font-mono w-24"
            />
          </label>
          <label className="flex flex-col gap-0.5 flex-1 min-w-[120px]">
            <span className="text-slate-500">Chip</span>
            <input
              value={chip}
              onChange={(e) => setChip(e.target.value)}
              placeholder="5511999999999"
              className="border border-slate-200 rounded px-1.5 py-0.5 font-mono w-full"
            />
          </label>
          <button
            type="submit"
            disabled={salvando || !placa.trim() || !chip.trim()}
            className="px-2 py-1 bg-purple-700 text-white rounded text-xs disabled:opacity-50"
          >
            {salvando ? '…' : 'Salvar no CSV'}
          </button>
        </form>
      ) : (
        <p className="text-slate-500">Edição do CSV: perfil ADMIN.</p>
      )}
      {erroChip ? <p className="text-red-600">{erroChip}</p> : null}
      <div className="max-h-32 overflow-y-auto">
        {linhas.linhas.length === 0 ? (
          <p className="text-slate-500">Arquivo vazio.</p>
        ) : (
          linhas.linhas.map((r) => (
            <p key={r.placa} className="font-mono">
              {r.placa}: {r.chip || '—'}
              {r.modelo ? ` (${r.modelo})` : ''}
            </p>
          ))
        )}
      </div>
    </div>
  );
}

function ProtocolosPanel() {
  const [protocolos, setProtocolos] = useState<unknown[] | null>(null);
  const [familias, setFamilias] = useState<unknown[] | null>(null);

  useEffect(() => {
    void Promise.all([fetchProtocolosModelos(), fetchFamiliasComandos()])
      .then(([p, f]) => {
        setProtocolos(p);
        setFamilias(f);
      })
      .catch(() => {
        setProtocolos([]);
        setFamilias([]);
      });
  }, []);

  if (protocolos === null) return <p className="text-xs text-slate-500">Carregando…</p>;

  return (
    <div className="text-xs border border-slate-200 rounded-lg p-2 max-h-48 overflow-auto space-y-2">
      <p className="text-slate-500">
        Referência local — atualize com{' '}
        <code className="bg-slate-100 px-1 rounded">npm run atualizar-comandos</code> no backend.
      </p>
      <details>
        <summary className="cursor-pointer font-medium text-slate-700">Protocolos / modelos</summary>
        <pre className="mt-1 whitespace-pre-wrap break-all text-[10px]">{JSON.stringify(protocolos, null, 2)}</pre>
      </details>
      <details>
        <summary className="cursor-pointer font-medium text-slate-700">Famílias de comandos</summary>
        <pre className="mt-1 whitespace-pre-wrap break-all text-[10px]">{JSON.stringify(familias, null, 2)}</pre>
      </details>
    </div>
  );
}
