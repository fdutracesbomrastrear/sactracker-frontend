'use client';

import { useState, useEffect, useRef } from 'react';
import { apiFetch, apiFetchJSON } from '@/modules/core/lib/api';

type Contact = {
  id: string;
  name: string;
  phone: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onTicketCreated: (ticket: any) => void;
};

export function NewChatModal({ isOpen, onClose, onTicketCreated }: Props) {
  const [search, setSearch] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'search' | 'create'>('search');

  // Form states
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSearch('');
      setContacts([]);
      setMode('search');
      setNewName('');
      setNewPhone('');
      setError('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (mode === 'search') {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        fetchContacts(search);
      }, 400);
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, mode]);

  const fetchContacts = async (q: string) => {
    setLoading(true);
    try {
      const data = await apiFetchJSON<Contact[]>(`/api/contacts?q=${encodeURIComponent(q)}`);
      setContacts(data);
    } catch (e) {
      console.error(e);
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      const data = await apiFetchJSON<Contact>('/api/contacts', {
        method: 'POST',
        body: JSON.stringify({ name: newName, phone: newPhone }),
      });
      handleStartChat(data.id);
    } catch (e: any) {
      setError(e.message || 'Erro ao criar contato');
      setCreating(false);
    }
  };

  const handleStartChat = async (contactId: string) => {
    setCreating(true);
    try {
      const data = await apiFetchJSON<any>('/api/tickets/new', {
        method: 'POST',
        body: JSON.stringify({ contactId }),
      });
      onTicketCreated(data);
      onClose();
    } catch (e: any) {
      setError(e.message || 'Erro ao iniciar conversa');
    } finally {
      setCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-surface rounded-2xl shadow-xl w-full max-w-md flex flex-col max-h-[85vh] overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-line">
          <h2 className="text-lg font-bold text-ink">
            {mode === 'search' ? 'Nova Conversa' : 'Novo Contato'}
          </h2>
          <button
            onClick={onClose}
            className="text-ink-faint hover:text-ink-soft transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mx-5 mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">
            {error}
          </div>
        )}

        {mode === 'search' ? (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="p-5 pb-2">
              <input
                type="text"
                placeholder="Buscar por nome ou número..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-4 py-2.5 bg-subtle border border-line rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                autoFocus
              />
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {loading ? (
                <div className="text-center text-sm text-ink-faint py-6">Buscando...</div>
              ) : contacts.length === 0 ? (
                <div className="text-center text-sm text-ink-faint py-6">
                  {search ? 'Nenhum contato encontrado' : 'Digite para buscar'}
                </div>
              ) : (
                contacts.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleStartChat(c.id)}
                    disabled={creating}
                    className="w-full text-left p-3 hover:bg-subtle rounded-xl transition-colors flex items-center gap-3 group"
                  >
                    <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-ink text-sm group-hover:text-purple-700 transition-colors">{c.name}</div>
                      <div className="text-xs text-ink-soft">{c.phone}</div>
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="p-5 border-t border-line bg-subtle/50">
              <button
                onClick={() => setMode('create')}
                className="w-full py-2.5 text-sm font-medium text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-xl transition-colors"
              >
                + Adicionar Contato Manualmente
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreateContact} className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">Nome Completo</label>
              <input
                required
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-4 py-2 bg-subtle border border-line rounded-xl text-sm focus:ring-2 focus:ring-purple-500"
                placeholder="Ex: João Silva"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">WhatsApp (DDD + Número)</label>
              <input
                required
                type="text"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="w-full px-4 py-2 bg-subtle border border-line rounded-xl text-sm focus:ring-2 focus:ring-purple-500"
                placeholder="Ex: 11999998888"
              />
              <p className="text-xs text-ink-faint mt-1.5">Apenas números, inclua DDD. O sistema ajustará o 55.</p>
            </div>
            
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setMode('search')}
                className="flex-1 px-4 py-2.5 text-ink-soft bg-subtle hover:bg-subtle rounded-xl text-sm font-medium transition-colors"
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={creating}
                className="flex-1 px-4 py-2.5 text-white bg-purple-600 hover:bg-purple-700 rounded-xl text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
              >
                {creating ? 'Salvando...' : 'Salvar e Iniciar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
