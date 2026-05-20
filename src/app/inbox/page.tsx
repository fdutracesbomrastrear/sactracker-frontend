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
import { FinanceiroPanel } from '@/components/FinanceiroPanel';
import { ChatMessageContent } from '@/components/ChatMessageContent';
import { AppSidebar } from '@/components/AppSidebar';
import { parseUserRole } from '@/lib/roles';
import { TicketToolsPanel } from '@/components/TicketToolsPanel';
import { usePanelSettings } from '@/components/PanelSettingsProvider';
import { bubblePadding, fontSizeClass, messageGap } from '@/lib/panel-settings';

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
  const userRole = parseUserRole(user?.role);
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
      <AppSidebar role={userRole} />

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
                    className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${
                filter === 'OPEN'
                  ? 'bg-purple-950 text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              Abertos
            </button>
            <button
              type="button"
              onClick={() => setFilter('PENDING')}
                    className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${
                filter === 'PENDING'
                  ? 'bg-purple-950 text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-100'
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
                className={`w-full text-left p-4 border-b border-slate-100/80 transition-colors ${
                  isActive
                    ? 'bg-violet-50/90 border-l-[3px] border-l-purple-700'
                    : 'bg-white border-l-[3px] border-l-transparent hover:bg-slate-50/80'
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

      <div
        className="relative flex-1 flex flex-col min-w-0 overflow-hidden bg-[radial-gradient(circle_at_1px_1px,rgba(88,28,135,0.06)_1px,transparent_0)] bg-[length:24px_24px]"
        style={{ backgroundColor: settings.chatBg }}
      >
        {!activeTicket ? (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            Selecione um atendimento ou aguarde novas mensagens
          </div>
        ) : (
          <>
            <div className="relative z-10 h-[4.5rem] border-b border-slate-200/80 bg-white/90 backdrop-blur-md flex items-center justify-between px-6 shrink-0 shadow-sm">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-11 h-11 bg-gradient-to-br from-violet-100 to-purple-200 ring-2 ring-white shadow-md rounded-full flex items-center justify-center font-bold text-purple-800 text-base shrink-0">
                  {activeTicket.contact.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-900 text-base truncate max-w-[200px] sm:max-w-xs">
                      {activeTicket.contact.name}
                    </h3>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                        activeTicket.mode === 'HUMAN'
                          ? 'bg-violet-100 text-violet-700 ring-1 ring-violet-200/60'
                          : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60'
                      }`}
                    >
                      {activeTicket.mode === 'HUMAN' ? 'Você' : 'Bot Gina'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 tabular-nums">{activeTicket.contact.phone}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 justify-end shrink-0">
                {activeTicket.mode === 'BOT' ? (
                  <button
                    type="button"
                    onClick={() => void handleAssume()}
                    className="px-3.5 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg shadow-sm shadow-emerald-900/20 hover:bg-emerald-500 transition-colors"
                  >
                    Assumir
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleReleaseBot()}
                    className="px-3.5 py-2 bg-white text-emerald-800 text-sm font-medium rounded-lg ring-1 ring-emerald-200 hover:bg-emerald-50 transition-colors"
                  >
                    Devolver ao bot
                  </button>
                )}
                <button
                  type="button"
                  onClick={openSettings}
                  className="px-3 py-2 bg-white text-slate-600 text-sm font-medium rounded-lg ring-1 ring-slate-200 hover:bg-slate-50 transition-colors"
                  title="Configurações"
                >
                  ⚙
                </button>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setToolsMenuOpen((v) => !v)}
                    className="px-3 py-2 bg-white text-purple-900 text-sm font-bold rounded-lg ring-1 ring-purple-200 hover:bg-purple-50 transition-colors"
                    title="CRM e agendamentos"
                  >
                    +
                  </button>
                  {toolsMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 w-44 rounded-xl border border-slate-200 bg-white shadow-lg py-1 z-[60]">
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
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
                        className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
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
                  className="px-3.5 py-2 bg-purple-950 text-white text-sm font-medium rounded-lg shadow-sm shadow-purple-950/25 hover:bg-purple-900 transition-colors"
                >
                  Resolver
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-3.5 py-2 text-slate-500 text-sm font-medium rounded-lg hover:bg-slate-100 hover:text-slate-700 transition-colors"
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
                    className={`max-w-[min(100%,32rem)] shadow-md rounded-2xl ${bubblePadding(settings.compactMode)} ${fontSizeClass(settings.fontSize)} ${
                      msg.fromMe ? 'rounded-br-md' : 'rounded-bl-md ring-1 ring-slate-200/90 shadow-slate-200/50'
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

            <div className="relative z-0 p-4 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shrink-0 shadow-[0_-4px_24px_rgba(15,23,42,0.06)]">
              {selectedFile && (
                <div className="mb-3 flex items-center gap-3 text-sm text-slate-700 bg-violet-50/80 ring-1 ring-violet-100 rounded-xl px-3 py-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-base shadow-sm">📎</span>
                  <span className="truncate flex-1 font-medium">{selectedFile.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="text-xs font-medium text-red-600 hover:text-red-700 px-2 py-1 rounded-md hover:bg-red-50 shrink-0"
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
              <div className="flex items-end gap-2 rounded-2xl bg-slate-50 ring-1 ring-slate-200/80 p-1.5 pl-2 shadow-inner">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={sending}
                  title="Anexar arquivo"
                  className="mb-0.5 p-2.5 text-slate-400 hover:text-purple-700 hover:bg-white rounded-xl transition-colors disabled:opacity-50"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </button>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && settings.enterToSend && !e.shiftKey) {
                      e.preventDefault();
                      void handleSend();
                    }
                  }}
                  placeholder={selectedFile ? 'Legenda opcional...' : 'Digite sua mensagem...'}
                  className="flex-1 min-h-[44px] py-2.5 bg-transparent border-none focus:outline-none text-slate-900 caret-purple-700 placeholder:text-slate-400 text-[15px]"
                  disabled={sending}
                />
                <button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={sending || (!input.trim() && !selectedFile)}
                  className="mb-0.5 shrink-0 px-5 py-2.5 bg-gradient-to-b from-amber-400 to-amber-500 text-purple-950 text-sm font-semibold rounded-xl shadow-sm shadow-amber-900/15 hover:from-amber-300 hover:to-amber-400 disabled:opacity-45 disabled:shadow-none transition-all"
                >
                  {sending ? 'Enviando…' : 'Enviar'}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-2 px-2 text-center">
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

      <div className="w-80 border-l border-slate-200 bg-white flex flex-col shrink-0 min-h-0">
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
  );
}

