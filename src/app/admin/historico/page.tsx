'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { ChatMessage, fetchMessages, fetchTickets, TicketItem } from '@/modules/core/lib/api';
import { getToken, getUser } from '@/modules/core/lib/auth';
import { AppSidebar } from '@/modules/core/components/AppSidebar';
import { parsePermissions } from '@/modules/core/lib/roles';
import { ChatMessageContent } from '@/modules/inbox/components/ChatMessageContent';
import { usePanelSettings } from '@/modules/core/hooks/PanelSettingsProvider';
import { bubblePadding, fontSizeClass, messageGap } from '@/modules/core/lib/panel-settings';

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

export default function HistoricoPage() {
  const user = getUser();
  const permissions = parsePermissions(user?.permissions);
  const { settings } = usePanelSettings();

  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [activeTicket, setActiveTicket] = useState<TicketItem | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeTicketIdRef = useRef<string | null>(null);

  useEffect(() => {
    activeTicketIdRef.current = activeTicket?.id ?? null;
  }, [activeTicket]);

  const loadTickets = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchTickets('');
      setTickets(dedupeById(data));
      setActiveTicket((prev) => {
        if (prev && data.some((t) => t.id === prev.id)) {
          return data.find((t) => t.id === prev.id) ?? data[0] ?? null;
        }
        return data[0] ?? null;
      });
    } catch (err: any) {
      setError(err.message || 'Falha ao carregar tickets');
    } finally {
      setLoading(false);
    }
  }, []);

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
    if (!settings.autoScroll) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, settings.autoScroll]);

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
          lastMessage: payload.message.content || 'Anexo',
          lastMessageAt: payload.message.createdAt,
          unread:
            activeTicketIdRef.current === payload.ticket.id
              ? 0
              : base.unread + (payload.message.fromMe ? 0 : 1),
        };

        const newList = [updated, ...prev.filter((t) => t.id !== payload.ticket.id)];
        return newList.sort(
          (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
        );
      });

      if (activeTicketIdRef.current === payload.ticket.id) {
        setMessages((prev) => {
          const map = new Map(prev.map((m) => [m.id, m]));
          map.set(payload.message.id, payload.message);
          return Array.from(map.values()).sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        });
      }
    });

    return () => {
      socket.off('nova_mensagem');
      socket.disconnect();
    };
  }, []);

  const filteredTickets = tickets.filter(t => {
    const term = searchTerm.toLowerCase();
    return t.contact.name.toLowerCase().includes(term) || t.contact.phone.includes(term);
  });

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      <AppSidebar permissions={permissions} />

      {/* LISTA DE TICKETS */}
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col shrink-0 relative z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <div className="p-4 border-b border-slate-100 bg-white">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Histórico</h1>
            <span className="bg-purple-100 text-purple-700 text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full">
              Auditoria
            </span>
          </div>
          <input
            type="text"
            placeholder="Buscar por nome ou número..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
          />
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 relative">
          {loading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="w-12 h-12 bg-slate-200 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-4 bg-slate-200 rounded w-2/3" />
                    <div className="h-3 bg-slate-100 rounded w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="p-6 text-center text-red-500 text-sm">{error}</div>
          ) : filteredTickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 p-6 text-center">
              <svg className="w-12 h-12 mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-sm font-medium">Nenhum ticket encontrado</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {filteredTickets.map((ticket) => (
                <button
                  key={ticket.id}
                  onClick={() => {
                    setActiveTicket(ticket);
                  }}
                  className={`w-full p-4 flex gap-3 text-left transition-all hover:bg-slate-50 relative group ${
                    activeTicket?.id === ticket.id ? 'bg-purple-50/50' : ''
                  }`}
                >
                  {activeTicket?.id === ticket.id && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-600" />
                  )}
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center text-purple-700 font-bold text-lg shrink-0 shadow-sm border border-purple-200/50">
                    {ticket.contact.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0 overflow-hidden flex flex-col justify-center">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <h3 className="font-semibold text-slate-800 truncate text-[15px]">
                        {ticket.contact.name}
                      </h3>
                      <span className="text-[11px] font-medium text-slate-400 shrink-0 ml-2">
                        {formatTime(ticket.lastMessageAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                        ticket.status === 'CLOSED' ? 'bg-slate-200 text-slate-600' :
                        ticket.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>
                        {ticket.status === 'CLOSED' ? 'Finalizado' : ticket.status === 'PENDING' ? 'Aguardando' : 'Aberto'}
                      </span>
                      <p className="text-sm text-slate-500 truncate flex-1 leading-relaxed">
                        {ticket.lastMessage || 'Nova conversa'}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ÁREA PRINCIPAL DO CHAT */}
      <div className="flex-1 flex flex-col min-w-0 bg-white relative">
        {activeTicket ? (
          <>
            <div className="h-[72px] shrink-0 border-b border-slate-200 bg-white flex items-center px-6 justify-between shadow-sm z-10 relative">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center text-purple-700 font-bold shadow-sm border border-purple-200/50">
                  {activeTicket.contact.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="font-bold text-slate-800 text-[17px] leading-tight">
                    {activeTicket.contact.name}
                  </h2>
                  <p className="text-sm text-slate-500 font-medium">{activeTicket.contact.phone}</p>
                </div>
              </div>
            </div>

            <div
              className="flex-1 overflow-y-auto px-6 py-6"
              style={{ backgroundColor: settings.chatBg }}
            >
              <div className={`max-w-3xl mx-auto flex flex-col ${messageGap(settings.compactMode)}`}>
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-slate-400">
                    <p className="text-sm font-medium">Nenhuma mensagem neste ticket.</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isFromMe = msg.fromMe;
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isFromMe ? 'items-end' : 'items-start'} max-w-[85%] ${
                          isFromMe ? 'ml-auto' : 'mr-auto'
                        }`}
                      >
                        <div
                          className={`rounded-2xl shadow-sm border ${bubblePadding(
                            settings.compactMode
                          )}`}
                          style={{
                            background: isFromMe
                              ? `linear-gradient(135deg, ${settings.outgoingFrom}, ${settings.outgoingTo})`
                              : settings.incomingBg,
                            color: isFromMe ? settings.outgoingText : settings.incomingText,
                            borderColor: isFromMe ? 'transparent' : 'rgba(0,0,0,0.05)',
                            borderBottomRightRadius: isFromMe ? '4px' : '16px',
                            borderBottomLeftRadius: isFromMe ? '16px' : '4px',
                          }}
                        >
                          <div
                            className={`whitespace-pre-wrap break-words leading-relaxed ${fontSizeClass(
                              settings.fontSize
                            )}`}
                          >
                            <ChatMessageContent
                              messageId={msg.id}
                              content={msg.content}
                              mediaType={msg.mediaType}
                              fileName={msg.fileName}
                              fromMe={msg.fromMe}
                            />
                          </div>
                          <div
                            className="text-[10px] font-medium opacity-60 mt-1 flex justify-end"
                            style={{
                              color: isFromMe ? settings.outgoingText : settings.incomingText,
                            }}
                          >
                            {formatTime(msg.createdAt)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} className="h-4" />
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-200 text-center">
              <span className="text-sm text-slate-500 flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Modo Somente Leitura (Auditoria)
              </span>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 text-slate-400">
            <div className="w-24 h-24 mb-6 rounded-full bg-white shadow-sm flex items-center justify-center">
              <svg className="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
              </svg>
            </div>
            <p className="text-lg font-medium text-slate-600 mb-2">Histórico de Auditoria</p>
            <p className="text-sm text-slate-400 max-w-sm text-center">
              Selecione uma conversa na lateral para visualizar o histórico completo das mensagens.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
