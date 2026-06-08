'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchUsers, createUser, updateUser, UserItem } from '@/modules/admin/api/users';
import { getUser, isAuthenticated } from '@/modules/core/lib/auth';
import { 
  ModulePermission, 
  SubPermission,
  MODULE_PERMISSIONS, 
  SUB_PERMISSIONS,
  isSubPermission,
  parsePermissions 
} from '@/modules/core/lib/roles';

// Mapa de sub-permissões agrupadas por módulo pai
const SUB_PERMISSIONS_BY_MODULE: Record<ModulePermission, { id: SubPermission; label: string }[]> = {
  MONITORAMENTO: [
    { id: 'MONITORAMENTO_BLOQUEAR', label: 'Bloquear / Desbloquear veículo' },
    { id: 'MONITORAMENTO_SAUDE_FROTA', label: 'Saúde da Frota: Acessar diagnóstico de veículos' },
    { id: 'SKYEYER_SIMULAR', label: 'Skyeyer: Simular cenários de telemetria' },
    { id: 'SKYEYER_MONITORAR_REAL', label: 'Skyeyer: Monitorar telemetria de clientes reais' },
    { id: 'SKYEYER_PROTOCOLO_EMERGENCIA', label: 'Skyeyer: Acionar Protocolo de Emergência (Vermelho)' },
    { id: 'SKYEYER_ALERTA_RISCO', label: 'Skyeyer: Acionar Alerta de Risco (Laranja)' },
  ],
  FINANCEIRO: [
    { id: 'FINANCEIRO_VER_FATURAS_VENCIDAS', label: 'Ver faturas vencidas (em atraso)' },
    { id: 'FINANCEIRO_VER_FATURAS_A_VENCER', label: 'Ver faturas em aberto (a vencer)' },
    { id: 'FINANCEIRO_ENVIAR_COBRANCA', label: 'Enviar cobrança manual via WhatsApp' },
  ],
  INBOX: [],
  COBRANCA: [],
  ADMIN: [],
};

const MODULE_LABELS: Record<ModulePermission, string> = {
  ADMIN: '👑 Admin',
  INBOX: '💬 Inbox / Atendimento',
  FINANCEIRO: '💰 Financeiro',
  COBRANCA: '📋 Cobrança',
  MONITORAMENTO: '🗺️ Monitoramento',
};

export default function UsuariosPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    password: '', 
    permissions: ['INBOX'] as string[]
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<UserItem | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

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

  async function handleTogglePermission(user: UserItem, permission: string) {
    if (user.id === getUser()?.id && permission === 'ADMIN' && user.permissions.includes('ADMIN')) {
      alert('Você não pode remover sua própria permissão de ADMIN.');
      return;
    }
    
    const hasPerm = user.permissions.includes(permission);
    let newPerms = [...user.permissions];
    if (hasPerm) {
      newPerms = newPerms.filter(p => p !== permission);
      // Se remover um módulo, remove também as sub-permissões desse módulo
      if (permission in SUB_PERMISSIONS_BY_MODULE) {
        const subs = SUB_PERMISSIONS_BY_MODULE[permission as ModulePermission].map(s => s.id);
        newPerms = newPerms.filter(p => !subs.includes(p as SubPermission));
      }
    } else {
      newPerms.push(permission);
    }

    if (newPerms.filter(p => !isSubPermission(p)).length === 0) {
      newPerms = ['INBOX', ...newPerms.filter(isSubPermission)];
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
      await createUser({ ...formData, permissions: formData.permissions });
      setIsModalOpen(false);
      setFormData({ name: '', email: '', password: '', permissions: ['INBOX'] });
      loadUsers();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao criar');
    } finally {
      setFormLoading(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUserForPassword) return;
    setPasswordLoading(true);
    setPasswordError(null);
    try {
      await updateUser(selectedUserForPassword.id, { password: newPassword });
      setIsPasswordModalOpen(false);
      setSelectedUserForPassword(null);
      setNewPassword('');
      alert('Senha alterada com sucesso!');
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Erro ao alterar a senha');
    } finally {
      setPasswordLoading(false);
    }
  }

  const handleFormPermissionToggle = (perm: string) => {
    setFormData(prev => {
      let newPerms = [...prev.permissions];
      if (newPerms.includes(perm)) {
        newPerms = newPerms.filter(p => p !== perm);
        // Remove sub-permissões do módulo desmarcado
        if (perm in SUB_PERMISSIONS_BY_MODULE) {
          const subs = SUB_PERMISSIONS_BY_MODULE[perm as ModulePermission].map(s => s.id);
          newPerms = newPerms.filter(p => !subs.includes(p as SubPermission));
        }
      } else {
        newPerms.push(perm);
      }
      return { ...prev, permissions: newPerms };
    });
  };

  return (
    <div className="flex flex-col h-screen bg-subtle text-ink font-sans overflow-y-auto p-8">
      <div className="max-w-5xl mx-auto w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-ink">Gestão de Equipe</h1>
            <p className="text-ink-soft mt-1">Gerencie os acessos ao painel SacTracker</p>
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

        <div className="bg-surface rounded-2xl shadow-sm border border-line overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-ink-soft">Carregando usuários...</div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-subtle border-b border-line text-ink-soft font-medium">
                <tr>
                  <th className="px-6 py-4">Nome</th>
                  <th className="px-6 py-4">E-mail</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {users.map(u => (
                  <>
                    <tr key={u.id} className="hover:bg-subtle/50 transition">
                      <td className="px-6 py-4 font-medium text-ink">{u.name}</td>
                      <td className="px-6 py-4 text-ink-soft">{u.email}</td>
                      <td className="px-6 py-4">
                        <span className={`flex items-center gap-1.5 text-xs font-medium ${u.active ? 'text-emerald-600' : 'text-red-600'}`}>
                          <span className={`w-2 h-2 rounded-full ${u.active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                          {u.active ? 'Ativo' : 'Bloqueado'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-3">
                        <button
                          onClick={() => setEditingUserId(editingUserId === u.id ? null : u.id)}
                          className="text-purple-700 hover:text-ink font-medium text-xs"
                        >
                          {editingUserId === u.id ? 'Fechar' : 'Permissões'}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUserForPassword(u);
                            setIsPasswordModalOpen(true);
                          }}
                          className="text-amber-700 hover:text-amber-900 font-medium text-xs"
                        >
                          Senha
                        </button>
                        <button
                          onClick={() => handleToggleActive(u)}
                          className={`${u.active ? 'text-red-600 hover:text-red-800' : 'text-emerald-600 hover:text-emerald-800'} font-medium text-xs`}
                        >
                          {u.active ? 'Bloquear' : 'Desbloquear'}
                        </button>
                      </td>
                    </tr>

                    {/* Painel de permissões expansível */}
                    {editingUserId === u.id && (
                      <tr key={`${u.id}-perms`}>
                        <td colSpan={4} className="px-6 py-4 bg-purple-50 border-b border-purple-100">
                          <p className="text-xs font-bold text-purple-800 uppercase tracking-wide mb-3">
                            Permissões de {u.name}
                          </p>
                          <div className="space-y-4">
                            {MODULE_PERMISSIONS.map(mod => {
                              const hasMod = u.permissions.includes(mod);
                              const subPerms = SUB_PERMISSIONS_BY_MODULE[mod];
                              return (
                                <div key={mod} className="bg-surface rounded-xl border border-line p-4">
                                  {/* Módulo principal */}
                                  <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={hasMod}
                                      onChange={() => handleTogglePermission(u, mod)}
                                      disabled={mod === 'ADMIN' && u.id === getUser()?.id && hasMod}
                                      className="w-4 h-4 rounded border-line-strong text-purple-600 focus:ring-purple-500"
                                    />
                                    <span className={`font-semibold text-sm ${mod === 'ADMIN' ? 'text-amber-700' : 'text-ink'}`}>
                                      {MODULE_LABELS[mod]}
                                    </span>
                                    {hasMod && (
                                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${mod === 'ADMIN' ? 'bg-amber-100 text-amber-800' : 'bg-purple-100 text-purple-800'}`}>
                                        ATIVO
                                      </span>
                                    )}
                                  </label>

                                  {/* Sub-permissões (só mostra se módulo estiver ativo e não for ADMIN) */}
                                  {hasMod && !u.permissions.includes('ADMIN') && subPerms.length > 0 && (
                                    <div className="mt-3 ml-7 space-y-2 border-l-2 border-purple-100 pl-4">
                                      <p className="text-[10px] text-ink-soft uppercase font-bold tracking-wide">Permissões específicas</p>
                                      {subPerms.map(sub => (
                                        <label key={sub.id} className="flex items-center gap-2 cursor-pointer group">
                                          <input
                                            type="checkbox"
                                            checked={u.permissions.includes(sub.id)}
                                            onChange={() => handleTogglePermission(u, sub.id)}
                                            className="w-3.5 h-3.5 rounded border-line-strong text-purple-600 focus:ring-purple-500"
                                          />
                                          <span className="text-xs text-ink group-hover:text-ink">
                                            {sub.label}
                                          </span>
                                        </label>
                                      ))}
                                    </div>
                                  )}
                                  {hasMod && u.permissions.includes('ADMIN') && subPerms.length > 0 && (
                                    <p className="mt-2 ml-7 text-xs text-amber-600 italic">
                                      Admin tem acesso total — sub-permissões ignoradas.
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-ink-soft">
                      Nenhum usuário encontrado.
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
            <h2 className="text-xl font-bold text-ink mb-4">Novo Usuário</h2>
            <form onSubmit={handleCreateUser} className="space-y-4">
              {formError && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{formError}</p>}
              
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Nome Completo</label>
                <input
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-lg border-line-strong border px-3 py-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-ink mb-1">E-mail</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-lg border-line-strong border px-3 py-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Senha Provisória</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  className="w-full rounded-lg border-line-strong border px-3 py-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-2">Permissões de Acesso</label>
                <div className="space-y-3 bg-subtle p-3 rounded-lg border border-line">
                  {MODULE_PERMISSIONS.map(mod => {
                    const hasMod = formData.permissions.includes(mod);
                    const subPerms = SUB_PERMISSIONS_BY_MODULE[mod];
                    return (
                      <div key={mod} className="bg-surface rounded-lg border border-line p-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={hasMod}
                            onChange={() => handleFormPermissionToggle(mod)}
                            className="rounded border-line-strong text-purple-600 focus:ring-purple-500 w-4 h-4"
                          />
                          <span className={`text-sm font-medium ${mod === 'ADMIN' ? 'text-amber-700' : 'text-ink'}`}>
                            {MODULE_LABELS[mod]}
                          </span>
                        </label>
                        {hasMod && mod !== 'ADMIN' && subPerms.length > 0 && (
                          <div className="mt-2 ml-6 space-y-1.5 border-l-2 border-purple-100 pl-3">
                            <p className="text-[10px] text-ink-soft uppercase font-bold tracking-wide">Permissões específicas</p>
                            {subPerms.map(sub => (
                              <label key={sub.id} className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={formData.permissions.includes(sub.id)}
                                  onChange={() => handleFormPermissionToggle(sub.id)}
                                  className="rounded border-line-strong text-purple-600 focus:ring-purple-500 w-3.5 h-3.5"
                                />
                                <span className="text-xs text-ink-soft">{sub.label}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
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
                  {formLoading ? 'Salvando...' : 'Criar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {isPasswordModalOpen && selectedUserForPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-surface shadow-2xl p-6">
            <h2 className="text-xl font-bold text-ink mb-2">Alterar Senha</h2>
            <p className="text-ink-soft text-sm mb-4">
              Alterando a senha de <strong>{selectedUserForPassword.name}</strong>
            </p>
            <form onSubmit={handleChangePassword} className="space-y-4">
              {passwordError && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{passwordError}</p>}
              
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Nova Senha</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full rounded-lg border-line-strong border px-3 py-2 focus:ring-purple-500 focus:border-purple-500 text-ink"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-line">
                <button
                  type="button"
                  onClick={() => {
                    setIsPasswordModalOpen(false);
                    setSelectedUserForPassword(null);
                    setNewPassword('');
                    setPasswordError(null);
                  }}
                  className="flex-1 px-4 py-2 text-ink-soft bg-subtle hover:bg-subtle rounded-lg font-medium transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="flex-1 px-4 py-2 bg-purple-950 text-white rounded-lg hover:bg-purple-900 font-medium transition disabled:opacity-50"
                >
                  {passwordLoading ? 'Alterando...' : 'Confirmar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
