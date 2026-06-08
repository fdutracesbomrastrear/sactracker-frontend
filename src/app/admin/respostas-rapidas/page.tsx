'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchQuickResponses, createQuickResponse, updateQuickResponse, deleteQuickResponse, QuickResponseItem } from '@/modules/admin/api/quick-responses';
import { getUser, isAuthenticated } from '@/modules/core/lib/auth';
import { parsePermissions } from '@/modules/core/lib/roles';

export default function RespostasRapidasPage() {
  const router = useRouter();
  const [responses, setResponses] = useState<QuickResponseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ shortcut: '', text: '' });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
      return;
    }
    const currentUser = getUser();
    const perms = parsePermissions(currentUser?.permissions);
    if (!perms.includes('ADMIN')) {
      router.replace('/');
      return;
    }
    loadResponses();
  }, [router]);

  async function loadResponses() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchQuickResponses();
      setResponses(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar respostas rápidas');
    } finally {
      setLoading(false);
    }
  }

  function handleOpenCreate() {
    setEditingId(null);
    setFormData({ shortcut: '', text: '' });
    setFormError(null);
    setIsModalOpen(true);
  }

  function handleOpenEdit(item: QuickResponseItem) {
    setEditingId(item.id);
    setFormData({ shortcut: item.shortcut, text: item.text });
    setFormError(null);
    setIsModalOpen(true);
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir esta resposta rápida?')) return;
    try {
      await deleteQuickResponse(id);
      loadResponses();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao excluir');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);
    try {
      if (editingId) {
        await updateQuickResponse(editingId, formData);
      } else {
        await createQuickResponse(formData);
      }
      setIsModalOpen(false);
      loadResponses();
    } catch (err: any) {
      setFormError(err.response?.data?.error || err.message || 'Erro ao salvar');
    } finally {
      setFormLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-screen bg-subtle text-ink font-sans overflow-y-auto p-8">
      <div className="max-w-5xl mx-auto w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-ink">Respostas Rápidas</h1>
            <p className="text-ink-soft mt-1">Crie atalhos (ex: /pix) para agilizar o atendimento</p>
          </div>
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-purple-950 text-white rounded-xl shadow hover:bg-purple-900 transition font-medium"
          >
            + Nova Resposta
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl">
            {error}
          </div>
        )}

        <div className="bg-surface rounded-2xl shadow-sm border border-line overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-ink-soft">Carregando respostas rápidas...</div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-subtle border-b border-line text-ink-soft font-medium">
                <tr>
                  <th className="px-6 py-4 w-1/4">Atalho</th>
                  <th className="px-6 py-4 w-2/4">Texto</th>
                  <th className="px-6 py-4 text-right w-1/4">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {responses.map(r => (
                  <tr key={r.id} className="hover:bg-subtle/50 transition">
                    <td className="px-6 py-4 font-bold text-purple-700 bg-purple-50/30">/{r.shortcut}</td>
                    <td className="px-6 py-4 text-ink-soft whitespace-pre-wrap">{r.text}</td>
                    <td className="px-6 py-4 text-right space-x-3">
                      <button
                        onClick={() => handleOpenEdit(r)}
                        className="text-indigo-600 hover:text-indigo-800 font-medium text-xs"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="text-red-600 hover:text-red-800 font-medium text-xs"
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
                {responses.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-ink-soft">
                      Nenhuma resposta rápida cadastrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-surface shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-ink mb-4">
              {editingId ? 'Editar Resposta' : 'Nova Resposta'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {formError && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{formError}</p>}
              
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Atalho (sem a barra /)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-ink-faint font-bold">/</span>
                  <input
                    required
                    placeholder="pix"
                    value={formData.shortcut}
                    onChange={e => setFormData({ ...formData, shortcut: e.target.value.replace(/\//g, '').replace(/\s/g, '') })}
                    className="w-full pl-7 rounded-lg border-line-strong border px-3 py-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <p className="text-[10px] text-ink-faint mt-1">Ex: pix, bomdia, saudacao</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Mensagem Completa</label>
                <textarea
                  required
                  rows={6}
                  value={formData.text}
                  onChange={e => setFormData({ ...formData, text: e.target.value })}
                  className="w-full rounded-lg border-line-strong border px-3 py-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Olá! Segue nossa chave PIX..."
                />
              </div>

              <div className="flex gap-3 pt-4 mt-6 border-t border-line">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 text-ink-soft bg-subtle hover:bg-subtle rounded-lg font-medium transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 px-4 py-2 bg-purple-950 text-white rounded-lg hover:bg-purple-900 font-medium transition disabled:opacity-50"
                >
                  {formLoading ? 'Salvando...' : 'Salvar Resposta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
