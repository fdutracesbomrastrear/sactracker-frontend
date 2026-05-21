import { apiFetch } from './api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export type StatusVeiculo = {
  ignicaoLigada: boolean | null;
  bloqueado: boolean | null;
  gpsAtivo: boolean | null;
  ultimaComunicacao: string | null;
  ultimaComunicacaoServidor: string | null;
  ultimaVelocidadeKmh: number | null;
  online: boolean | null;
  minutosDesdeComunicacao: number | null;
  gsmPercentual: number | null;
  satelites: number | null;
  alarme: string | null;
};

export type PosicaoVeiculo = {
  latitude: number;
  longitude: number;
  endereco: string | null;
  enderecoGeocodificado: string | null;
  atualizadoEm: string | null;
  velocidadeKmh: number | null;
};

export type ComandosRastreadorResumo = {
  modeloRastreador: string | null;
  protocolo: string | null;
  chip: string | null;
  chipOrigem: 'api' | 'manual' | null;
  imei: string | null;
  comandoBloquear: string | null;
  comandoDesbloquear: string | null;
  familiaComandos: string | null;
};

export type VeiculoMonitoramento = {
  id: string;
  veiculoId: string;
  placa: string;
  nome: string | null;
  cliente: string | null;
  statusVeiculo: string | null;
  rastreador: string | null;
  status: StatusVeiculo;
  posicao: PosicaoVeiculo | null;
  comandosRastreador: ComandosRastreadorResumo;
  linkGoogleMaps: string | null;
  linkMonitoramentoRastro: string | null;
};

export type FiltroVeiculo =
  | 'todos'
  | 'bloqueados'
  | 'sem_sinal'
  | 'sem_chip'
  | 'ignicao_ligada';

export type OrdenarVeiculo = 'placa' | 'comunicacao_antiga' | 'bloqueados_primeiro';

export type RastreamentoConfig = {
  endpointPosicao: string;
  smsGatewayConfigurado: boolean;
  chipsManualArquivo: string;
  chipsManualLinhas: number;
};

export type SmsHistoricoItem = {
  id: string;
  comando: string;
  acao: string;
  simulado: boolean;
  referencia: string | null;
  erro: string | null;
  createdAt: string;
  user: { name: string };
};

export type ChipManualRow = {
  placa: string;
  imei: string | null;
  chip: string;
  modelo: string | null;
  protocolo: string | null;
  observacao: string | null;
};

function buildQuery(params: Record<string, string | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) sp.set(k, v);
  }
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

export async function fetchRastreamentoConfig(): Promise<RastreamentoConfig> {
  const res = await apiFetch(`${API_URL}/api/rastreamento/config`);
  if (!res.ok) throw new Error('Falha ao carregar configuração de rastreamento');
  return res.json();
}

export async function fetchVeiculoMonitoramento(
  id: string,
  atualizar = true
): Promise<VeiculoMonitoramento> {
  const qs = atualizar ? '?atualizar=1' : '';
  const res = await apiFetch(`${API_URL}/api/rastreamento/veiculos/${encodeURIComponent(id)}${qs}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Falha ao atualizar veículo');
  return data;
}

export async function fetchVeiculoPorPlaca(
  placa: string,
  atualizar = true
): Promise<VeiculoMonitoramento> {
  const norm = placa.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const qs = atualizar ? '?atualizar=1' : '';
  const res = await apiFetch(
    `${API_URL}/api/rastreamento/veiculos/por-placa/${encodeURIComponent(norm)}${qs}`
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Veículo não encontrado');
  return data;
}

export async function fetchVeiculosMonitoramento(params?: {
  q?: string;
  cliente?: string;
  filtro?: FiltroVeiculo;
  ordenar?: OrdenarVeiculo;
  atualizar?: boolean;
}): Promise<{ total: number; veiculos: VeiculoMonitoramento[] }> {
  const qs = buildQuery({
    q: params?.q,
    cliente: params?.cliente,
    filtro: params?.filtro && params.filtro !== 'todos' ? params.filtro : undefined,
    ordenar: params?.ordenar,
    atualizar: params?.atualizar ? '1' : undefined,
  });
  const res = await apiFetch(`${API_URL}/api/rastreamento/veiculos${qs}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Falha ao carregar veículos');
  return data;
}

export async function fetchHistoricoSms(id: string): Promise<SmsHistoricoItem[]> {
  const res = await apiFetch(
    `${API_URL}/api/rastreamento/veiculos/${encodeURIComponent(id)}/historico-sms`
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Falha ao carregar histórico');
  return data.historico ?? [];
}

export async function fetchChipsManual(): Promise<{
  arquivo: string;
  linhas: ChipManualRow[];
}> {
  const res = await apiFetch(`${API_URL}/api/rastreamento/chips`);
  if (!res.ok) throw new Error('Falha ao carregar chips');
  return res.json();
}

export async function salvarChipManual(row: ChipManualRow): Promise<void> {
  const res = await apiFetch(`${API_URL}/api/rastreamento/chips`, {
    method: 'POST',
    body: JSON.stringify(row),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Falha ao salvar chip');
}

export async function fetchProtocolosModelos(): Promise<unknown[]> {
  const res = await apiFetch(`${API_URL}/api/rastreamento/protocolos`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error('Falha ao carregar protocolos');
  return data.protocolos ?? [];
}

export async function fetchFamiliasComandos(): Promise<unknown[]> {
  const res = await apiFetch(`${API_URL}/api/rastreamento/comandos`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error('Falha ao carregar comandos');
  return data.familias ?? [];
}

type ComandoResposta = {
  ok: boolean;
  acao: string;
  placa: string;
  comando: string;
  simulado?: boolean;
  referencia?: string;
  logId?: string;
  aviso?: string;
};

async function enviarComandoVeiculoMonitoramento(
  id: string,
  acao: 'bloquear' | 'desbloquear'
): Promise<ComandoResposta> {
  const res = await apiFetch(
    `${API_URL}/api/rastreamento/veiculos/${encodeURIComponent(id)}/${acao}`,
    { method: 'POST' }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      data.error || (acao === 'bloquear' ? 'Falha ao bloquear veículo' : 'Falha ao desbloquear veículo')
    );
  }
  return data;
}

export function bloquearVeiculoMonitoramento(id: string) {
  return enviarComandoVeiculoMonitoramento(id, 'bloquear');
}

export function desbloquearVeiculoMonitoramento(id: string) {
  return enviarComandoVeiculoMonitoramento(id, 'desbloquear');
}

export async function enviarSmsLivreMonitoramento(
  id: string,
  comando: string
): Promise<ComandoResposta> {
  const res = await apiFetch(
    `${API_URL}/api/rastreamento/veiculos/${encodeURIComponent(id)}/sms`,
    { method: 'POST', body: JSON.stringify({ comando }) }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Falha ao enviar SMS');
  return data;
}
