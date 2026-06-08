import { apiFetch } from '@/modules/core/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export type CrmNoteItem = {
  id: string;
  body: string;
  followUpAt: string | null;
  createdAt: string;
  createdBy: { id: string; name: string };
};

export type CobrancaAgendamentoItem = {
  id: string;
  cpf: string;
  clienteId: string | null;
  contrato: string | null;
  motivo: string | null;
  retomarEm: string;
  status: string;
  createdAt: string;
  createdBy: { id: string; name: string };
};

export type PausaAtiva = {
  id: string;
  cpf: string;
  contrato: string | null;
  retomarEm: string;
  motivo: string | null;
  createdBy: { id: string; name: string };
};

export type TicketCrmData = {
  contact: { id: string; name: string; phone: string };
  notes: CrmNoteItem[];
  agendamentos: CobrancaAgendamentoItem[];
  pausaAtiva: PausaAtiva | null;
};

export async function fetchTicketCrm(ticketId: string): Promise<TicketCrmData> {
  const res = await apiFetch(`${API_URL}/api/crm/tickets/${ticketId}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Falha ao carregar CRM');
  }
  return res.json();
}

export async function createCrmNote(
  ticketId: string,
  body: string,
  followUpAt?: string
): Promise<CrmNoteItem> {
  const res = await apiFetch(`${API_URL}/api/crm/tickets/${ticketId}/notes`, {
    method: 'POST',
    body: JSON.stringify({ body, followUpAt }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Falha ao salvar anotação');
  }
  return res.json();
}

export async function createCobrancaAgendamento(
  ticketId: string,
  payload: { cpf: string; retomarEm: string; contrato?: string; motivo?: string }
): Promise<PausaAtiva> {
  const res = await apiFetch(`${API_URL}/api/crm/tickets/${ticketId}/agendamentos`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Falha ao agendar');
  }
  return res.json();
}

export async function cancelCobrancaAgendamento(id: string) {
  const res = await apiFetch(`${API_URL}/api/crm/agendamentos/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Falha ao cancelar');
  }
  return res.json();
}
