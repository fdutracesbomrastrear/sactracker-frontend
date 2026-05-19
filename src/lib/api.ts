import { clearSession, getToken } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export type TicketItem = {
  id: string;
  status: string;
  mode: 'BOT' | 'HUMAN';
  contact: { id: string; name: string; phone: string };
  lastMessage: string;
  lastMessageAt: string;
  unread: number;
};

export type ChatMessage = {
  id: string;
  content: string;
  fromMe: boolean;
  createdAt: string;
};

export type LoginResponse = {
  token: string;
  user: { id: string; name: string; email: string };
};

function authHeaders(): HeadersInit {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function apiFetch(url: string, options: RequestInit = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      ...authHeaders(),
      ...(options.headers as Record<string, string>),
    },
  });

  if (res.status === 401) {
    clearSession();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new Error('Sessão expirada');
  }

  return res;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Credenciais inválidas');
  }

  return res.json();
}

export async function fetchMe() {
  const res = await apiFetch(`${API_URL}/api/auth/me`);
  if (!res.ok) throw new Error('Não autenticado');
  return res.json();
}

export async function fetchTickets(status?: string): Promise<TicketItem[]> {
  const query = status ? `?status=${status}` : '';
  const res = await apiFetch(`${API_URL}/api/tickets${query}`);
  if (!res.ok) throw new Error('Falha ao carregar tickets');
  return res.json();
}

export async function fetchMessages(ticketId: string): Promise<ChatMessage[]> {
  const res = await apiFetch(`${API_URL}/api/tickets/${ticketId}/messages`);
  if (!res.ok) throw new Error('Falha ao carregar mensagens');
  return res.json();
}

export async function sendMessage(ticketId: string, content: string) {
  const res = await apiFetch(`${API_URL}/api/tickets/${ticketId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error('Falha ao enviar mensagem');
  return res.json();
}

export async function updateTicketStatus(ticketId: string, status: string) {
  const res = await apiFetch(`${API_URL}/api/tickets/${ticketId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error('Falha ao atualizar ticket');
  return res.json();
}

export async function assumeTicket(ticketId: string) {
  const res = await apiFetch(`${API_URL}/api/tickets/${ticketId}/assume`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Falha ao assumir atendimento');
  return res.json();
}

export async function releaseTicketToBot(ticketId: string) {
  const res = await apiFetch(`${API_URL}/api/tickets/${ticketId}/release-bot`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Falha ao devolver ao bot');
  return res.json();
}
