import { clearSession, getToken } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL !== undefined ? process.env.NEXT_PUBLIC_API_URL : 'http://localhost:3001';

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
  mediaType?: string | null;
  mediaPath?: string | null;
  fileName?: string | null;
  mimetype?: string | null;
};

import { ModulePermission } from './roles';

export type LoginResponse = {
  token: string;
  user: { id: string; name: string; email: string; permissions: ModulePermission[] };
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

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const base = API_URL || '';
  const url = path.startsWith('http') ? path : `${base}${path}`;
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

// Helper genérico que já faz .json() e trata erros
export async function apiFetchJSON<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await apiFetch(path, options);
  if (!res.ok) {
    let msg = `Erro ${res.status}`;
    try { const d = await res.json(); msg = d.error || d.message || msg; } catch {}
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
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

export async function sendMessageMedia(
  ticketId: string,
  file: File,
  caption?: string
): Promise<ChatMessage> {
  const token = getToken();
  const form = new FormData();
  form.append('file', file);
  if (caption?.trim()) form.append('caption', caption.trim());

  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/messages/media`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });

  if (res.status === 401) {
    clearSession();
    if (typeof window !== 'undefined') window.location.href = '/login';
    throw new Error('Sessão expirada');
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Falha ao enviar anexo');
  }

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
