import { getToken, clearSession } from '@/modules/core/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL !== undefined ? process.env.NEXT_PUBLIC_API_URL : 'http://localhost:3001';

async function apiFetch(url: string, options: RequestInit = {}) {
  const token = getToken();
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string>),
    },
  });

  if (res.status === 401) {
    clearSession();
    if (typeof window !== 'undefined') window.location.href = '/login';
    throw new Error('Sessão expirada');
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Erro na requisição');
  }

  return res.json();
}

export type CobrancaStatus = {
  enabled: boolean;
  horario: string;
  registros: number;
};

export type CobrancaResultado = {
  enviados: number;
  pulados: number;
  semWhatsapp: number;
  erros: number;
  mensagem: string;
};

export type SimulacaoCobranca = {
  total: number;
  enviariam: number;
  pulados: number;
  detalhes: Record<string, number>;
  linhasEnviariam: string[];
};

export function fetchCobrancaStatus() {
  return apiFetch(`${API_URL}/api/cobranca/status`) as Promise<CobrancaStatus>;
}

export function dispararRotinaCobranca() {
  return apiFetch(`${API_URL}/api/cobranca/rotina`, { method: 'POST' }) as Promise<CobrancaResultado>;
}

export function dispararVencidosOntem() {
  return apiFetch(`${API_URL}/api/cobranca/vencidos-ontem`, {
    method: 'POST',
  }) as Promise<CobrancaResultado>;
}

export function dispararVencemEm2Dias() {
  return apiFetch(`${API_URL}/api/cobranca/vencem-em-2-dias`, {
    method: 'POST',
  }) as Promise<CobrancaResultado>;
}

export function dispararFaturaUnicaPendente() {
  return apiFetch(`${API_URL}/api/cobranca/fatura-unica-pendente`, {
    method: 'POST',
  }) as Promise<CobrancaResultado>;
}

export function dispararVencemHoje() {
  return apiFetch(`${API_URL}/api/cobranca/vencem-hoje`, {
    method: 'POST',
  }) as Promise<CobrancaResultado>;
}

export function simularVencidosOntem() {
  return apiFetch(`${API_URL}/api/cobranca/simular/vencidos-ontem`) as Promise<SimulacaoCobranca>;
}

export function simularVencemEm2Dias() {
  return apiFetch(`${API_URL}/api/cobranca/simular/vencem-em-2-dias`) as Promise<SimulacaoCobranca>;
}

export function simularVencemHoje() {
  return apiFetch(`${API_URL}/api/cobranca/simular/vencem-hoje`) as Promise<SimulacaoCobranca>;
}
