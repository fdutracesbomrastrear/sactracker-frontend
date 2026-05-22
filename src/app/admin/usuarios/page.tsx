'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchUsers, createUser, updateUser, UserItem } from '@/modules/admin/api/users';
import { getUser, isAuthenticated } from '@/modules/core/lib/auth';
import { ModulePermission, MODULE_PERMISSIONS, parsePermissions } from '@/modules/core/lib/roles';

export default function UsuariosPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    password: '', 
    permissions: ['INBOX'] as ModulePermission[] 
  });
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
    loadUsers();
  }, [router]);

  async function loadUsers() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUsers();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleActive(user: UserItem) {
    if (user.id === getUser()?.id) {
      alert('Você não pode bloquear a si mesmo!');
      return;
    }
    if (!confirm(`Tem certeza que deseja ${user.active ? 'BLOQUEAR' : 'DESBLOQUEAR'} o usuário ${user.name}?`)) return;
    
    try {
      await updateUser(user.id, { active: !user.active });
      loadUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao atualizar');
    }
  }

  async function handleTogglePermission(user: UserItem, permission: ModulePermission) {
    if (user.id === getUser()?.id && permission === 'ADMIN' && user.permissions.includes('ADMIN')) {
      alert('Você não pode remover sua própria permissão de ADMIN.');
      return;
    }
    
    const hasPerm = user.permissions.includes(permission);
    let newPerms = [...user.permissions];
    if (hasPerm) {
      newPerms = newPerms.filter(p => p !== permission);
    } else {
      newPerms.push(permission);
    }

    if (newPerms.length === 0) {
        newPerms = ['INBOX']; // Default minimal
    }

    try {
      await updateUser(user.id, { permissions: newPerms });
      loadUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao atualizar');
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);
    try {
      await createUser(formData);
      setIsModalOpen(false);
      setFormData({ name: '', email: '', password: '', permissions: ['INBOX'] });
      loadUsers();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao criar');
    } finally {
      setFormLoading(false);
    }
  }

  const handleCheckboxChange = (perm: ModulePermission) => {
    setFormData(prev => {
      let newPerms = [...prev.permissions];
      if (newPerms.includes(perm)) {
        newPerms = newPerms.filter(p => p !== perm);
      } else {
        newPerms.push(perm);
      }
      return { ...prev, permissions: newPerms };
    });
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900 font-sans overflow-y-auto p-8">
      <div className="max-w-5xl mx-auto w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Gestão de Equipe</h1>
            <p className="text-slate-500 mt-1">Gerencie os acessos ao painel SacTracker</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-purple-950 text-white rounded-xl shadow hover:bg-purple-900 transition font-medium"
          >
            + Novo Usuário
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl">
            {error}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Carregando usuários...</div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[800px]">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                <tr>
                  <th className="px-6 py-4">Nome</th>
                  <th className="px-6 py-4">E-mail</th>
                  <th className="px-6 py-4">Permissões (Módulos)</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-4 font-medium text-slate-700">{u.name}</td>
                    <td className="px-6 py-4 text-slate-600">{u.email}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2 max-w-sm">
                        {MODULE_PERMISSIONS.map(perm => {
                            const hasPerm = u.permissions.includes(perm);
                            return (
                                <button
                                    key={perm}
                                    onClick={() => handleTogglePermission(u, perm)}
                                    title={`Clique para ${hasPerm ? 'remover' : 'adicionar'} acesso ao módulo ${perm}`}
                                    className={`px-2 py-1 text-[10px] rounded-full font-bold border transition-colors ${
                                        hasPerm 
                                        ? perm === 'ADMIN' ? 'bg-amber-100 text-amber-800 border-amber-200' 
                                          : 'bg-purple-100 text-purple-800 border-purple-200'
                                        : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200 hover:text-slate-600'
                                    }`}
                                >
                                    {perm}
                                </button>
                            );
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`flex items-center gap-1.5 text-xs font-medium ${u.active ? 'text-emerald-600' : 'text-red-600'}`}>
                        <span className={`w-2 h-2 rounded-full ${u.active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        {u.active ? 'Ativo' : 'Bloqueado'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-3">
                      <button
                        onClick={() => handleToggleActive(u)}
                        className={`${u.active ? 'text-red-600 hover:text-red-800' : 'text-emerald-600 hover:text-emerald-800'} font-medium text-xs`}
                      >
                        {u.active ? 'Bloquear' : 'Desbloquear'}
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                      Nenhum usuário encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Novo Usuário</h2>
            <form onSubmit={handleCreateUser} className="space-y-4">
              {formError && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{formError}</p>}
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                <input
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-lg border-slate-300 border px-3 py-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-lg border-slate-300 border px-3 py-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Senha Provisória</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  className="w-full rounded-lg border-slate-300 border px-3 py-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Permissões de Acesso</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  {MODULE_PERMISSIONS.map(perm => (
                      <label key={perm} className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 p-1 rounded transition">
                          <input 
                              type="checkbox" 
                              checked={formData.permissions.includes(perm)}
                              onChange={() => handleCheckboxChange(perm)}
                              className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-4 h-4"
                          />
                          <span className={`text-sm font-medium ${perm === 'ADMIN' ? 'text-amber-700' : 'text-slate-700'}`}>
                              {perm}
                          </span>
                      </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4 mt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 px-4 py-2 bg-purple-950 text-white rounded-lg hover:bg-purple-900 font-medium transition disabled:opacity-50"
                >
                  {formLoading ? 'Salvando...' : 'Criar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
