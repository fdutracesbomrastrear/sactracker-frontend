'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  ChatMessage,
  fetchMessages,
  fetchTickets,
  sendMessage,
  TicketItem,
  updateTicketStatus,
} from '@/lib/api';
import { clearSession, getToken, getUser } from '@/lib/auth';
import { useRouter } from 'next/navigation';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

function formatTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of items) {
    map.set(item.id, item);
  }
  return Array.from(map.values());
}

function appendMessage(prev: ChatMessage[], message: ChatMessage): ChatMessage[] {
  if (prev.some((m) => m.id === message.id)) return prev;
  return [...prev, message];
}

export default function InboxPage() {
  const router = useRouter();
  const user = getUser();
  const [filter, setFilter] = useState<'OPEN' | 'PENDING'>('OPEN');
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [activeTicket, setActiveTicket] = useState<TicketItem | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeTicketIdRef = useRef<string | null>(null);
  const filterRef = useRef(filter);

  useEffect(() => {
    activeTicketIdRef.current = activeTicket?.id ?? null;
  }, [activeTicket]);

  useEffect(() => {
    filterRef.current = filter;
  }, [filter]);

  const loadTickets = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchTickets(filter);
      setTickets(dedupeById(data));
      setActiveTicket((prev) => {
        if (prev && data.some((t) => t.id === prev.id)) {
          return data.find((t) => t.id === prev.id) ?? data[0] ?? null;
        }
        return data[0] ?? null;
      });
    } catch {
      setError('Não foi possível carregar os atendimentos. O backend está rodando?');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const loadMessages = useCallback(async (ticketId: string) => {
    try {
      const data = await fetchMessages(ticketId);
      setMessages(dedupeById(data));
    } catch {
      setMessages([]);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    if (activeTicket) loadMessages(activeTicket.id);
  }, [activeTicket, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const socket: Socket = io(WS_URL, {
      transports: ['websocket', 'polling'],
      auth: { token },
    });

    socket.on('nova_mensagem', (payload: {
      ticket: { id: string; status: string };
      message: ChatMessage;
      contact: { id: string; name: string; phone: string };
    }) => {
      const currentFilter = filterRef.current;

      setTickets((prev) => {
        const updated: TicketItem = {
          id: payload.ticket.id,
          status: payload.ticket.status,
          contact: payload.contact,
          lastMessage: payload.message.content,
          lastMessageAt: payload.message.createdAt,
          unread: payload.message.fromMe ? 0 : 1,
        };

        const exists = prev.find((t) => t.id === payload.ticket.id);
        let next: TicketItem[];

        if (exists) {
          next = prev.map((t) =>
            t.id === payload.ticket.id ? { ...t, ...updated } : t
          );
        } else if (payload.ticket.status === currentFilter) {
          next = [updated, ...prev];
        } else {
          return prev;
        }

        return dedupeById(next).sort(
          (a, b) =>
            new Date(b.lastMessageAt).getTime() -
            new Date(a.lastMessageAt).getTime()
        );
      });

      if (activeTicketIdRef.current === payload.ticket.id) {
        setMessages((prev) => appendMessage(prev, payload.message));
      }
    });

    return () => {
      socket.off('nova_mensagem');
      socket.disconnect();
    };
  }, []);

  const handleSend = async () => {
    if (!activeTicket || !input.trim() || sending) return;
    setSending(true);
    try {
      const saved = await sendMessage(activeTicket.id, input.trim());
      setMessages((prev) => appendMessage(prev, saved));
      setInput('');
      setTickets((prev) =>
        prev.map((t) =>
          t.id === activeTicket.id
            ? {
                ...t,
                lastMessage: saved.content,
                lastMessageAt: saved.createdAt,
                unread: 0,
              }
            : t
        )
      );
    } catch {
      setError('Erro ao enviar mensagem. Verifique se o WhatsApp está conectado.');
    } finally {
      setSending(false);
    }
  };

  const handleLogout = () => {
    clearSession();
    router.replace('/login');
  };

  const handleResolve = async () => {
    if (!activeTicket) return;
    try {
      await updateTicketStatus(activeTicket.id, 'CLOSED');
      setTickets((prev) => prev.filter((t) => t.id !== activeTicket.id));
      setActiveTicket(null);
      setMessages([]);
      loadTickets();
    } catch {
      setError('Erro ao resolver ticket.');
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans">
      <div className="w-20 bg-purple-950 flex flex-col items-center py-6 shadow-2xl z-20 shrink-0">
        <div className="h-12 w-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-lg mb-8">
          <span className="font-bold text-xl text-purple-950">ST</span>
        </div>
      </div>

      <div className="w-80 bg-white border-r border-slate-200 flex flex-col z-10 shrink-0">
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-xl font-bold text-purple-950">Atendimentos</h2>
          {error && (
            <p className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>
          )}
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setFilter('OPEN')}
              className={`px-4 py-1.5 text-sm font-semibold rounded-full ${
                filter === 'OPEN'
                  ? 'bg-blue-50 text-blue-600 border border-blue-100'
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              Abertos
            </button>
            <button
              type="button"
              onClick={() => setFilter('PENDING')}
              className={`px-4 py-1.5 text-sm font-medium rounded-full ${
                filter === 'PENDING'
                  ? 'bg-blue-50 text-blue-600 border border-blue-100'
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              Pendentes
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && (
            <p className="p-4 text-sm text-slate-400 text-center">Carregando...</p>
          )}
          {!loading && tickets.length === 0 && (
            <p className="p-4 text-sm text-slate-400 text-center">
              Nenhum atendimento. Envie uma mensagem pelo WhatsApp para testar.
            </p>
          )}
          {tickets.map((ticket) => {
            const isActive = activeTicket?.id === ticket.id;
            return (
              <button
                type="button"
                key={ticket.id}
                onClick={() => setActiveTicket(ticket)}
                className={`w-full text-left p-4 border-b border-slate-50 ${
                  isActive
                    ? 'bg-blue-50/50 border-l-4 border-l-blue-600'
                    : 'bg-white border-l-4 border-l-transparent hover:bg-slate-50'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span
                    className={`font-semibold truncate pr-2 ${
                      isActive ? 'text-blue-900' : 'text-slate-700'
                    }`}
                  >
                    {ticket.contact.name}
                  </span>
                  <span
                    className={`text-xs shrink-0 ${
                      isActive ? 'text-blue-600' : 'text-slate-400'
                    }`}
                  >
                    {formatTime(ticket.lastMessageAt)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-slate-500 truncate pr-2">{ticket.lastMessage}</p>
                  {ticket.unread > 0 && (
                    <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {ticket.unread}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-[#F8FAFC] min-w-0">
        {!activeTicket ? (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            Selecione um atendimento ou aguarde novas mensagens
          </div>
        ) : (
          <>
            <div className="h-20 border-b border-slate-200 bg-white flex items-center justify-between px-6 shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-purple-100 border border-blue-200 rounded-full flex items-center justify-center font-bold text-blue-700 text-lg">
                  {activeTicket.contact.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">
                    {activeTicket.contact.name}
                  </h3>
                  <p className="text-xs text-slate-500">{activeTicket.contact.phone}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleResolve}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold text-sm rounded-xl"
              >
                Resolver Ticket
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex max-w-[75%] ${msg.fromMe ? 'ml-auto justify-end' : ''}`}
                >
                  <div
                    className={`p-4 rounded-2xl shadow-sm ${
                      msg.fromMe
                        ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-tr-sm'
                        : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm'
                    }`}
                  >
                    <p className="text-[15px] leading-relaxed">{msg.content}</p>
                    <span
                      className={`text-[11px] mt-2 block ${
                        msg.fromMe ? 'text-blue-200 text-right' : 'text-slate-400'
                      }`}
                    >
                      {formatTime(msg.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-white border-t border-slate-200 shrink-0">
              <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-2 pr-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Digite sua mensagem..."
                  className="flex-1 bg-transparent border-none focus:outline-none text-slate-700 px-2"
                  disabled={sending}
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={sending || !input.trim()}
                  className="px-6 py-3 bg-amber-400 hover:bg-amber-500 text-purple-950 font-bold rounded-xl disabled:opacity-50"
                >
                  {sending ? '...' : 'Enviar'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="w-80 border-l border-slate-200 bg-white flex flex-col shrink-0 overflow-y-auto">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-sm font-bold uppercase tracking-wider text-purple-900">
            Telemetria
          </h3>
          <p className="text-xs text-slate-500 mt-1">Integração em breve (Fase 3)</p>
        </div>
      </div>
    </div>
  );
}
