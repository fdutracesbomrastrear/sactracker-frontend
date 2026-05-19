const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export type TicketItem = {
  id: string;
  status: string;
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

export async function fetchTickets(status?: string): Promise<TicketItem[]> {
  const query = status ? `?status=${status}` : '';
  const res = await fetch(`${API_URL}/api/tickets${query}`);
  if (!res.ok) throw new Error('Falha ao carregar tickets');
  return res.json();
}

export async function fetchMessages(ticketId: string): Promise<ChatMessage[]> {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/messages`);
  if (!res.ok) throw new Error('Falha ao carregar mensagens');
  return res.json();
}

export async function sendMessage(ticketId: string, content: string) {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error('Falha ao enviar mensagem');
  return res.json();
}

export async function updateTicketStatus(ticketId: string, status: string) {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error('Falha ao atualizar ticket');
  return res.json();
}
