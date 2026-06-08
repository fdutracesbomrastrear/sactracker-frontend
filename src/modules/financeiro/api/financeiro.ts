import { getToken, clearSession } from '@/modules/core/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export type FaturaItem = {
  id: string;
  parcela: string | null;
  valor: string | null;
  valorCalculado: string;
  dataVencimento: string;
  dataFormatada: string;
  diasAtraso: number;
  status: string;
  statusTexto: string;
  formaPagamento: string | null;
  linkBoleto: string | null;
  pixCopiaCola: string | null;
};

export type ClienteFinanceiroGrupo = {
  pessoa: {
    id: string;
    nome: string;
    documento: string | null;
    telefone: string | null;
    celular: string | null;
  };
  temBoletosAtrasados: boolean;
  faturas: FaturaItem[];
};

export type ClientesFinanceiroResposta = {
  total: number;
  take: number;
  skip: number;
  clientes: ClienteFinanceiroGrupo[];
};

async function apiFetch(url: string) {
  const token = getToken();
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (res.status === 401) {
    clearSession();
    if (typeof window !== 'undefined') window.location.href = '/login';
    throw new Error('Sessão expirada');
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Erro na consulta financeira');
  }

  return res.json();
}

export async function fetchFinanceiroFaturas(params: {
  q?: string;
  status?: string;
  take?: number;
  skip?: number;
}): Promise<ClientesFinanceiroResposta> {
  const q = new URLSearchParams();
  if (params.q) q.set('q', params.q);
  if (params.status) q.set('status', params.status);
  if (params.take != null) q.set('take', String(params.take));
  if (params.skip != null) q.set('skip', String(params.skip));
  const qs = q.toString();
  return apiFetch(`${API_URL}/api/financeiro/faturas${qs ? `?${qs}` : ''}`);
}

export async function fetchFinanceiroPorDocumento(
  documento: string
): Promise<ClienteFinanceiroGrupo> {
  const doc = documento.replace(/\D/g, '');
  return apiFetch(`${API_URL}/api/financeiro/consulta/${doc}`);
}

export type EnviarWhatsappTipo = 'boleto' | 'pix';

export async function enviarFaturaWhatsapp(params: {
  telefone: string;
  tipo: EnviarWhatsappTipo;
  fatura: FaturaItem;
  nomeCliente: string;
  ticketId?: string;
}): Promise<{ ok: boolean; mensagens: number }> {
  const token = getToken();
  const res = await fetch(`${API_URL}/api/financeiro/enviar-whatsapp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(params),
  });

  if (res.status === 401) {
    clearSession();
    if (typeof window !== 'undefined') window.location.href = '/login';
    throw new Error('Sessão expirada');
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Erro ao enviar WhatsApp');
  }

  return res.json();
}

export function resolverTelefoneCliente(
  grupo: ClienteFinanceiroGrupo,
  telefoneAtivo?: string
): string | null {
  const candidato = telefoneAtivo || grupo.pessoa.celular || grupo.pessoa.telefone;
  if (!candidato) return null;
  const digits = candidato.replace(/\D/g, '');
  return digits.length >= 10 ? candidato : null;
}

export function formatarTextoBoleto(fatura: FaturaItem, nomeCliente: string) {
  const linhas = [
    `Segue sua fatura:`,
    `Vencimento: ${fatura.dataFormatada}`,
    `Valor: R$ ${fatura.valorCalculado}`,
    `Status: ${fatura.statusTexto}`,
  ];
  if (fatura.linkBoleto) linhas.push(`Boleto: ${fatura.linkBoleto}`);
  if (fatura.pixCopiaCola) linhas.push(`PIX: ${fatura.pixCopiaCola}`);
  return linhas.join('\n');
}

export async function refreshFinanceiro(): Promise<{ success: boolean }> {
  const token = getToken();
  const res = await fetch(`${API_URL}/api/financeiro/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (res.status === 401) {
    clearSession();
    if (typeof window !== 'undefined') window.location.href = '/login';
    throw new Error('Sessão expirada');
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Erro ao atualizar dados');
  }

  return res.json();
}
