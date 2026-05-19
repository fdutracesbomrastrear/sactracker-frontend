import { getToken, clearSession } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
