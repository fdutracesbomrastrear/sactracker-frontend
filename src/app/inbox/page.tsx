'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  assumeTicket,
  ChatMessage,
  fetchMessages,
  fetchTickets,
  releaseTicketToBot,
  sendMessage,
  sendMessageMedia,
  TicketItem,
  updateTicketStatus,
} from '@/lib/api';
import { clearSession, getToken, getUser } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FinanceiroPanel } from '@/components/FinanceiroPanel';
import { ChatMessageContent } from '@/components/ChatMessageContent';

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
      ticket: { id: string; status: string; mode?: 'BOT' | 'HUMAN' };
      message: ChatMessage;
      contact: { id: string; name: string; phone: string };
    }) => {
      const currentFilter = filterRef.current;

      setTickets((prev) => {
        const exists = prev.find((t) => t.id === payload.ticket.id);
        const base = exists ?? {
          id: payload.ticket.id,
          status: payload.ticket.status,
          mode: 'BOT' as const,
          contact: payload.contact,
          lastMessage: '',
          lastMessageAt: new Date().toISOString(),
          unread: 0,
        };

        const updated: TicketItem = {
          ...base,
          status: payload.ticket.status,
          mode: payload.ticket.mode ?? base.mode,
          contact: payload.contact,
          lastMessage: payload.message.content,
          lastMessageAt: payload.message.createdAt,
          unread: payload.message.fromMe ? 0 : (base.unread || 0) + 1,
        };

        let next: TicketItem[];

        if (exists) {
          next = prev.map((t) =>
            t.id === payload.ticket.id ? updated : t
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

      setActiveTicket((prev) => {
        if (prev?.id !== payload.ticket.id) return prev;
        return {
          ...prev,
          status: payload.ticket.status,
          mode: payload.ticket.mode ?? prev.mode,
        };
      });

      if (activeTicketIdRef.current === payload.ticket.id) {
        setMessages((prev) => appendMessage(prev, payload.message));
      }
    });

    const heartbeat = window.setInterval(() => {
      socket.emit('atendente:heartbeat');
    }, 60_000);
    socket.emit('atendente:heartbeat');

    return () => {
      window.clearInterval(heartbeat);
      socket.off('nova_mensagem');
      socket.disconnect();
    };
  }, []);

  const applySentMessage = (saved: ChatMessage) => {
    const humanMode = { mode: 'HUMAN' as const };
    setMessages((prev) => appendMessage(prev, saved));
    setActiveTicket((prev) => (prev ? { ...prev, ...humanMode } : prev));
    setTickets((prev) =>
      prev.map((t) =>
        t.id === activeTicket?.id
          ? {
              ...t,
              ...humanMode,
              lastMessage: saved.content,
              lastMessageAt: saved.createdAt,
              unread: 0,
            }
          : t
      )
    );
  };

  const handleSend = async () => {
    if (!activeTicket || sending) return;
    const texto = input.trim();
    if (!texto && !selectedFile) return;

    setSending(true);
    setError(null);
    try {
      let saved: ChatMessage;
      if (selectedFile) {
        saved = await sendMessageMedia(activeTicket.id, selectedFile, texto || undefined);
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        saved = await sendMessage(activeTicket.id, texto);
      }
      applySentMessage(saved);
      setInput('');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erro ao enviar. Verifique se o WhatsApp está conectado.'
      );
    } finally {
      setSending(false);
    }
  };

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  const handleLogout = () => {
    clearSession();
    router.replace('/login');
  };

  const handleEnviarBoletoNoChat = async (texto: string) => {
    if (!activeTicket) return;
    setSending(true);
    setError(null);
    try {
      const msg = await sendMessage(activeTicket.id, texto);
      setMessages((prev) => appendMessage(prev, msg));
    } catch {
      setError('Erro ao enviar boleto no chat.');
    } finally {
      setSending(false);
    }
  };

  const handleAssume = async () => {
    if (!activeTicket) return;
    try {
      const ticket = await assumeTicket(activeTicket.id);
      const mode = (ticket.mode as 'BOT' | 'HUMAN') || 'HUMAN';
      setActiveTicket((prev) => (prev ? { ...prev, mode } : prev));
      setTickets((prev) =>
        prev.map((t) => (t.id === activeTicket.id ? { ...t, mode } : t))
      );
    } catch {
      setError('Erro ao assumir atendimento.');
    }
  };

  const handleReleaseBot = async () => {
    if (!activeTicket) return;
    try {
      const ticket = await releaseTicketToBot(activeTicket.id);
      const mode = (ticket.mode as 'BOT' | 'HUMAN') || 'BOT';
      setActiveTicket((prev) => (prev ? { ...prev, mode } : prev));
      setTickets((prev) =>
        prev.map((t) => (t.id === activeTicket.id ? { ...t, mode } : t))
      );
    } catch {
      setError('Erro ao devolver conversa ao bot.');
    }
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
      <div className="w-20 bg-purple-950 flex flex-col items-center py-6 shadow-2xl z-20 shrink-0 px-2">
        <div className="h-12 w-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-lg mb-4">
          <span className="font-bold text-xl text-purple-950">ST</span>
        </div>
        <Link
          href="/inbox"
          className="w-full aspect-square flex items-center justify-center text-amber-400 bg-white/10 rounded-xl mb-2"
          title="Atendimentos"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </Link>
        <Link
          href="/financeiro"
          className="w-full aspect-square flex items-center justify-center text-purple-300 hover:text-white hover:bg-white/5 rounded-xl mb-2"
          title="Financeiro"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </Link>
        <Link
          href="/cobranca"
          className="w-full aspect-square flex items-center justify-center text-purple-300 hover:text-white hover:bg-white/5 rounded-xl"
          title="Cobrança ativa"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </Link>
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

      <div className="flex-1 flex flex-col min-w-0 bg-[#e8edf4] bg-[radial-gradient(circle_at_1px_1px,rgba(88,28,135,0.06)_1px,transparent_0)] bg-[length:24px_24px]">
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
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-800 text-lg">
                      {activeTicket.contact.name}
                    </h3>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        activeTicket.mode === 'HUMAN'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {activeTicket.mode === 'HUMAN' ? 'Você' : 'Bot Gina'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{activeTicket.contact.phone}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 justify-end">
                {activeTicket.mode === 'BOT' ? (
                  <button
                    type="button"
                    onClick={() => void handleAssume()}
                    className="px-4 py-2.5 bg-emerald-600 text-white font-semibold text-sm rounded-xl hover:bg-emerald-500"
                  >
                    Assumir atendimento
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleReleaseBot()}
                    className="px-4 py-2.5 bg-white border border-emerald-300 text-emerald-800 font-semibold text-sm rounded-xl hover:bg-emerald-50"
                  >
                    Devolver ao bot
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-4 py-2.5 bg-white border border-slate-200 text-slate-600 font-semibold text-sm rounded-xl hover:bg-slate-50"
                >
                  Sair
                </button>
                <button
                  type="button"
                  onClick={handleResolve}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold text-sm rounded-xl"
                >
                  Resolver Ticket
                </button>
              </div>
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
                    <ChatMessageContent
                      messageId={msg.id}
                      content={msg.content}
                      mediaType={msg.mediaType}
                      fileName={msg.fileName}
                      fromMe={msg.fromMe}
                    />
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
              {selectedFile && (
                <div className="mb-2 flex items-center gap-2 text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                  <span className="truncate flex-1">📎 {selectedFile.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="text-red-500 hover:text-red-700 text-xs font-semibold shrink-0"
                  >
                    Remover
                  </button>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                onChange={handleFilePick}
              />
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-2 pr-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={sending}
                  title="Anexar arquivo"
                  className="p-2.5 text-slate-500 hover:text-purple-700 hover:bg-white rounded-xl disabled:opacity-50"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </button>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && void handleSend()}
                  placeholder={selectedFile ? 'Legenda opcional...' : 'Digite sua mensagem...'}
                  className="flex-1 bg-transparent border-none focus:outline-none text-slate-700 px-2"
                  disabled={sending}
                />
                <button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={sending || (!input.trim() && !selectedFile)}
                  className="px-6 py-3 bg-amber-400 hover:bg-amber-500 text-purple-950 font-bold rounded-xl disabled:opacity-50"
                >
                  {sending ? '...' : 'Enviar'}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5 px-1">
                Imagens, PDF, documentos, áudio e vídeo (até 16 MB)
              </p>
            </div>
          </>
        )}
      </div>

      <div className="w-80 border-l border-slate-200 bg-white flex flex-col shrink-0 min-h-0">
        <FinanceiroPanel
          compact
          telefoneAtivo={activeTicket?.contact.phone}
          ticketId={activeTicket?.id}
          onEnviarNoChat={activeTicket ? handleEnviarBoletoNoChat : undefined}
          onMensagensEnviadas={
            activeTicket ? () => void loadMessages(activeTicket.id) : undefined
          }
        />
      </div>
    </div>
  );
}

