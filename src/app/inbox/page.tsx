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
} from '@/modules/core/lib/api';
import { clearSession, getToken, getUser } from '@/modules/core/lib/auth';
import { useRouter } from 'next/navigation';
import { FinanceiroPanel } from '@/modules/financeiro/components/FinanceiroPanel';
import { ChatMessageContent } from '@/modules/inbox/components/ChatMessageContent';
import { parsePermissions, roleLabel } from '@/modules/core/lib/roles';
import { TicketToolsPanel } from '@/modules/inbox/components/TicketToolsPanel';
import { usePanelSettings } from '@/modules/core/hooks/PanelSettingsProvider';
import { bubblePadding, fontSizeClass, messageGap } from '@/modules/core/lib/panel-settings';
import { playNotificationSound } from '@/modules/core/lib/sound';
import { NewChatModal } from '@/modules/inbox/components/NewChatModal';
import { fetchQuickResponses, QuickResponseItem } from '@/modules/admin/api/quick-responses';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || '';

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
  const permissions = parsePermissions(user?.permissions);
  const { settings, openSettings } = usePanelSettings();
  const [filter, setFilter] = useState<'OPEN' | 'PENDING'>('OPEN');
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [activeTicket, setActiveTicket] = useState<TicketItem | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [toolsTab, setToolsTab] = useState<'crm' | 'agcob'>('crm');
  const [toolsMenuOpen, setToolsMenuOpen] = useState(false);
  const [documentoConsulta, setDocumentoConsulta] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeTicketIdRef = useRef<string | null>(null);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [quickResponses, setQuickResponses] = useState<QuickResponseItem[]>([]);
  const [showQuickResponses, setShowQuickResponses] = useState(false);
  const [quickResponseFilter, setQuickResponseFilter] = useState('');

  const filterRef = useRef(filter);
  const settingsRef = useRef(settings);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    activeTicketIdRef.current = activeTicket?.id ?? null;
  }, [activeTicket]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    filterRef.current = filter;
  }, [filter]);

  const loadTickets = useCallback(async () => {
    try {
      setError(null);
      const [data, qrData] = await Promise.all([
        fetchTickets(filter),
        fetchQuickResponses().catch(() => [])
      ]);
      setTickets(dedupeById(data));
      setQuickResponses(qrData);
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
    setToolsOpen(false);
    setToolsMenuOpen(false);
    setDocumentoConsulta('');
  }, [activeTicket?.id]);

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
      if (!payload.message.fromMe) {
        if (settingsRef.current.soundEnabled) {
          playNotificationSound();
        }
        
        // Push notification se a aba não estiver visível
        if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
          new Notification(`Nova mensagem de ${payload.contact.name}`, {
            body: payload.message.content,
            icon: '/favicon.ico'
          });
        }
      }

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
      setShowQuickResponses(false);
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);
    
    if (val.startsWith('/')) {
      const term = val.slice(1).toLowerCase();
      setQuickResponseFilter(term);
      setShowQuickResponses(true);
    } else {
      setShowQuickResponses(false);
    }
  };

  const handleSelectQuickResponse = (text: string) => {
    setInput(text);
    setShowQuickResponses(false);
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

  const filteredTickets = tickets.filter((t) => {
    if (!searchQuery) return true;
    const term = searchQuery.toLowerCase();
    const phone = t.contact.phone.replace(/\D/g, '');
    const termNum = term.replace(/\D/g, '');
    
    return (
      t.contact.name.toLowerCase().includes(term) || 
      (termNum.length > 2 && phone.includes(termNum))
    );
  });

  return (
    <>
      <div className="flex flex-1 overflow-hidden bg-app font-sans min-w-0">

      <div className="w-80 bg-surface border-r border-line flex flex-col z-10 shrink-0">
        <div className="p-5 border-b border-line">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink">Atendimentos</h2>
            <button
              onClick={() => setIsNewChatOpen(true)}
              className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center hover:bg-purple-100 dark:bg-purple-500/15 dark:text-purple-300 dark:hover:bg-purple-500/25 transition-colors"
              title="Nova Conversa"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
          {error && (
            <p className="mt-2 text-xs text-red-600 bg-red-50 dark:bg-red-500/10 dark:text-red-400 p-2 rounded-lg">{error}</p>
          )}
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setFilter('OPEN')}
                    className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${
                filter === 'OPEN'
                  ? 'bg-purple-700 text-white'
                  : 'text-ink-soft hover:bg-subtle'
              }`}
            >
              Abertos
            </button>
            <button
              type="button"
              onClick={() => setFilter('PENDING')}
                    className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${
                filter === 'PENDING'
                  ? 'bg-purple-700 text-white'
                  : 'text-ink-soft hover:bg-subtle'
              }`}
            >
              Pendentes
            </button>
          </div>
          <div className="mt-4">
            <div className="relative">
              <svg className="absolute left-3 top-2.5 h-4 w-4 text-ink-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Buscar conversa..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-app border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400/60 focus:border-transparent transition-all"
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && (
            <p className="p-4 text-sm text-ink-faint text-center">Carregando...</p>
          )}
          {!loading && tickets.length === 0 && (
            <p className="p-4 text-sm text-ink-faint text-center">
              Nenhum atendimento. Envie uma mensagem pelo WhatsApp para testar.
            </p>
          )}
          {!loading && tickets.length > 0 && filteredTickets.length === 0 && (
            <p className="p-4 text-sm text-ink-faint text-center">
              Nenhuma conversa encontrada para a busca.
            </p>
          )}
          {filteredTickets.map((ticket) => {
            const isActive = activeTicket?.id === ticket.id;
            return (
              <button
                type="button"
                key={ticket.id}
                onClick={() => setActiveTicket(ticket)}
                className={`w-full text-left p-4 border-b border-line transition-colors ${
                  isActive
                    ? 'bg-subtle border-l-[3px] border-l-purple-600'
                    : 'bg-transparent border-l-[3px] border-l-transparent hover:bg-subtle'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span
                    className={`font-semibold truncate pr-2 ${
                      isActive ? 'text-ink' : 'text-ink'
                    }`}
                  >
                    {ticket.contact.name}
                  </span>
                  <span className="text-xs shrink-0 text-ink-faint">
                    {formatTime(ticket.lastMessageAt)}
                  </span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <p className="text-sm text-ink-soft truncate pr-2">{ticket.lastMessage}</p>
                  {ticket.unread > 0 && (
                    <span className="bg-amber-400 text-ink text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                      {ticket.unread}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div
        className="relative flex-1 flex flex-col min-w-0 overflow-hidden bg-[radial-gradient(circle_at_1px_1px,rgba(88,28,135,0.06)_1px,transparent_0)] bg-[length:24px_24px]"
        style={{ backgroundColor: settings.chatBg }}
      >
        {!activeTicket ? (
          <div className="flex-1 flex items-center justify-center text-ink-faint">
            Selecione um atendimento ou aguarde novas mensagens
          </div>
        ) : (
          <>
            <div className="relative z-10 h-16 border-b border-line bg-surface flex items-center justify-between px-6 shrink-0">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-500/20 rounded-full flex items-center justify-center font-semibold text-purple-700 dark:text-purple-300 text-base shrink-0">
                  {activeTicket.contact.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <h3 className="font-semibold text-ink text-base truncate">
                      {activeTicket.contact.name}
                    </h3>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${
                        activeTicket.mode === 'HUMAN'
                          ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-300 dark:border-purple-500/30'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30'
                      }`}
                    >
                      {activeTicket.mode === 'HUMAN' ? 'Você' : 'Bot Gina'}
                    </span>
                  </div>
                  <p className="text-xs text-ink-soft tabular-nums truncate">{activeTicket.contact.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 justify-end shrink-0">
                {activeTicket.mode === 'BOT' ? (
                  <button
                    type="button"
                    onClick={() => void handleAssume()}
                    className="px-3.5 h-9 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-500 transition-colors"
                  >
                    Assumir
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleReleaseBot()}
                    className="px-3.5 h-9 bg-surface text-emerald-700 dark:text-emerald-400 text-sm font-medium rounded-lg border border-emerald-200 dark:border-emerald-500/30 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"
                  >
                    Devolver ao bot
                  </button>
                )}
                <button
                  type="button"
                  onClick={openSettings}
                  className="px-3 h-9 bg-surface text-ink-soft text-sm font-medium rounded-lg border border-line hover:bg-subtle transition-colors"
                  title="Configurações"
                >
                  ⚙
                </button>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setToolsMenuOpen((v) => !v)}
                    className="px-3 h-9 bg-surface text-purple-700 dark:text-purple-300 text-sm font-bold rounded-lg border border-purple-200 dark:border-purple-500/30 hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-colors"
                    title="CRM e agendamentos"
                  >
                    +
                  </button>
                  {toolsMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 w-44 rounded-xl border border-line bg-surface shadow-lg py-1 z-[60]">
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm text-ink hover:bg-subtle"
                        onClick={() => {
                          setToolsTab('crm');
                          setToolsOpen(true);
                          setToolsMenuOpen(false);
                        }}
                      >
                        CRM
                      </button>
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm text-ink hover:bg-subtle"
                        onClick={() => {
                          setToolsTab('agcob');
                          setToolsOpen(true);
                          setToolsMenuOpen(false);
                        }}
                      >
                        Ag. Cob.
                      </button>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleResolve}
                  className="px-3.5 h-9 bg-purple-700 text-white text-sm font-medium rounded-lg hover:bg-purple-600 transition-colors"
                >
                  Resolver
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-3.5 h-9 text-ink-soft text-sm font-medium rounded-lg hover:bg-subtle hover:text-ink transition-colors"
                  title="Sair"
                >
                  Sair
                </button>
              </div>
            </div>

            <div
              className={`relative z-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 ${messageGap(settings.compactMode)}`}
            >
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex w-full ${msg.fromMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[min(100%,32rem)] rounded-2xl ${bubblePadding(settings.compactMode)} ${fontSizeClass(settings.fontSize)} ${
                      msg.fromMe ? 'rounded-br-md' : 'rounded-bl-md border border-line'
                    }`}
                    style={
                      msg.fromMe
                        ? {
                            background: `linear-gradient(to bottom right, ${settings.outgoingFrom}, ${settings.outgoingTo})`,
                            color: settings.outgoingText,
                          }
                        : {
                            backgroundColor: settings.incomingBg,
                            color: settings.incomingText,
                          }
                    }
                  >
                    <ChatMessageContent
                      messageId={msg.id}
                      content={msg.content}
                      mediaType={msg.mediaType}
                      fileName={msg.fileName}
                      fromMe={msg.fromMe}
                    />
                    <span
                      className={`text-[10px] mt-2 block tabular-nums opacity-80 text-right`}
                      style={msg.fromMe ? undefined : { textAlign: 'left' }}
                    >
                      {formatTime(msg.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="relative z-0 p-4 bg-surface border-t border-line shrink-0">
              {selectedFile && (
                <div className="mb-3 flex items-center gap-3 text-sm text-ink bg-subtle border border-line rounded-xl px-3 py-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface text-base border border-line">📎</span>
                  <span className="truncate flex-1 font-medium">{selectedFile.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 px-2 py-1 rounded-md hover:bg-red-50 dark:hover:bg-red-500/10 shrink-0"
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
              
              {/* Quick Responses Popover */}
              {showQuickResponses && (
                <div className="absolute bottom-full left-0 mb-2 w-full max-w-md bg-surface rounded-xl shadow-lg border border-line z-50 overflow-hidden">
                  <div className="bg-subtle px-3 py-2 border-b border-line text-xs font-bold text-purple-700 dark:text-purple-300 uppercase">
                    Respostas Rápidas
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {quickResponses
                      .filter(qr => qr.shortcut.toLowerCase().includes(quickResponseFilter))
                      .map((qr) => (
                        <button
                          key={qr.id}
                          type="button"
                          onClick={() => handleSelectQuickResponse(qr.text)}
                          className="w-full text-left px-4 py-3 border-b border-line hover:bg-subtle transition-colors focus:bg-subtle focus:outline-none"
                        >
                          <div className="font-bold text-purple-700 dark:text-purple-300 mb-0.5 text-sm">/{qr.shortcut}</div>
                          <div className="text-sm text-ink-soft truncate">{qr.text}</div>
                        </button>
                      ))}
                    {quickResponses.filter(qr => qr.shortcut.toLowerCase().includes(quickResponseFilter)).length === 0 && (
                      <div className="px-4 py-3 text-sm text-ink-faint italic">
                        Nenhum atalho encontrado.
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-end gap-2 rounded-xl bg-app border border-line p-1.5 pl-2 relative">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={sending}
                  title="Anexar arquivo"
                  className="mb-0.5 p-2.5 text-ink-faint hover:text-purple-700 dark:hover:text-purple-300 hover:bg-surface rounded-lg transition-colors disabled:opacity-50"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </button>
                <input
                  type="text"
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && settings.enterToSend && !e.shiftKey) {
                      e.preventDefault();
                      void handleSend();
                    }
                  }}
                  placeholder={selectedFile ? 'Legenda opcional...' : 'Digite sua mensagem ou / para atalhos'}
                  className="flex-1 min-h-[44px] py-2.5 bg-transparent border-none focus:outline-none text-ink caret-purple-600 placeholder:text-ink-faint text-[15px]"
                  disabled={sending}
                />
                <button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={sending || (!input.trim() && !selectedFile)}
                  className="mb-0.5 shrink-0 px-5 py-2.5 bg-purple-700 text-white text-sm font-semibold rounded-lg hover:bg-purple-600 disabled:opacity-45 transition-colors"
                >
                  {sending ? 'Enviando…' : 'Enviar'}
                </button>
              </div>
              <p className="text-[10px] text-ink-faint mt-2 px-2 text-center">
                Imagens, PDF, documentos, áudio e vídeo · até 16 MB
              </p>
            </div>
          </>
        )}
        {toolsOpen && activeTicket && (
          <TicketToolsPanel
            ticketId={activeTicket.id}
            contactName={activeTicket.contact.name}
            documentoSugerido={documentoConsulta}
            initialTab={toolsTab}
            onClose={() => setToolsOpen(false)}
          />
        )}
      </div>

      <div className="w-80 border-l border-line bg-surface flex flex-col shrink-0 min-h-0">
        <FinanceiroPanel
          compact
          telefoneAtivo={activeTicket?.contact.phone}
          ticketId={activeTicket?.id}
          onDocumentoConsultado={setDocumentoConsulta}
          onEnviarNoChat={activeTicket ? handleEnviarBoletoNoChat : undefined}
          onMensagensEnviadas={
            activeTicket ? () => void loadMessages(activeTicket.id) : undefined
          }
        />
      </div>
      </div>

      <NewChatModal
        isOpen={isNewChatOpen}
        onClose={() => setIsNewChatOpen(false)}
        onTicketCreated={(ticket) => {
          setTickets((prev) => [ticket, ...prev.filter((t) => t.id !== ticket.id)]);
          setActiveTicket(ticket);
          setFilter(ticket.status === 'PENDING' ? 'PENDING' : 'OPEN');
        }}
      />
    </>
  );
}

