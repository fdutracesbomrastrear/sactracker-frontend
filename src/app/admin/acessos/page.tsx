'use client';

import { Suspense, useEffect, useState } from 'react';
import { PageHeader } from '@/modules/core/components/ui/PageHeader';
import { apiFetchJSON } from '@/modules/core/lib/api';

type AuditLog = {
  id: string;
  action: string;
  reason: string | null;
  ipAddress: string | null;
  deviceType: string | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
  user: { name: string; email: string } | null;
};

function parseDevice(type: string | null) {
  if (!type) return { label: 'Web', isApp: false, icon: '🌐' };
  const lower = type.toLowerCase();
  if (lower.includes('android') || lower.includes('app') || lower.includes('okhttp')) {
    return { label: 'App Mobile', isApp: true, icon: '📱' };
  }
  if (lower.includes('chrome')) return { label: 'Chrome (Web)', isApp: false, icon: '🌐' };
  if (lower.includes('firefox')) return { label: 'Firefox (Web)', isApp: false, icon: '🌐' };
  if (lower.includes('safari') && !lower.includes('chrome')) return { label: 'Safari (Web)', isApp: false, icon: '🌐' };
  return { label: 'Navegador Web', isApp: false, icon: '🌐' };
}

function parseAction(action: string) {
  switch (action) {
    case 'LOGIN':
      return { label: 'Login', color: 'bg-emerald-50 text-emerald-700 border border-emerald-200/50' };
    case 'LOCATION_PING':
      return { label: 'Localização (GPS)', color: 'bg-sky-50 text-sky-700 border border-sky-200/50' };
    case 'HIDE_TICKET':
      return { label: 'Ocultou Ticket', color: 'bg-amber-50 text-amber-700 border border-amber-200/50' };
    case 'ARCHIVE_CHAT':
      return { label: 'Arquivou Chat', color: 'bg-indigo-50 text-indigo-700 border border-indigo-200/50' };
    default:
      return { label: action, color: 'bg-subtle text-ink border border-line/50' };
  }
}

function AcessosConteudo() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [deviceFilter, setDeviceFilter] = useState<'ALL' | 'APP' | 'WEB'>('ALL');
  const [actionFilter, setActionFilter] = useState<'ALL' | 'LOGIN' | 'LOCATION' | 'OTHER'>('ALL');

  async function loadLogs() {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetchJSON<AuditLog[]>('/api/v1/audit');
      setLogs(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar os logs de acessos');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLogs();
  }, []);

  // Filter logs logic
  const filteredLogs = logs.filter((log) => {
    // 1. Search Query (User name, email, IP or Reason)
    const matchesSearch =
      (log.user?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.user?.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.ipAddress || '').includes(searchQuery) ||
      (log.reason || '').toLowerCase().includes(searchQuery.toLowerCase());

    // 2. Device Filter
    const device = parseDevice(log.deviceType);
    const matchesDevice =
      deviceFilter === 'ALL' ||
      (deviceFilter === 'APP' && device.isApp) ||
      (deviceFilter === 'WEB' && !device.isApp);

    // 3. Action Filter
    const matchesAction =
      actionFilter === 'ALL' ||
      (actionFilter === 'LOGIN' && log.action === 'LOGIN') ||
      (actionFilter === 'LOCATION' && log.action === 'LOCATION_PING') ||
      (actionFilter === 'OTHER' && log.action !== 'LOGIN' && log.action !== 'LOCATION_PING');

    return matchesSearch && matchesDevice && matchesAction;
  });

  // Calculate quick stats
  const totalLogs = filteredLogs.length;
  const appAccessCount = filteredLogs.filter(l => parseDevice(l.deviceType).isApp).length;
  const webAccessCount = totalLogs - appAccessCount;
  const criticalActionsCount = filteredLogs.filter(l => l.action !== 'LOGIN' && l.action !== 'LOCATION_PING').length;

  return (
    <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden bg-subtle/50">
      <PageHeader
        title="Acessos e Logs"
        subtitle="Histórico de auditoria, logins e rastreamento de operadores"
        className="shrink-0"
      />

      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Quick Stats overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-surface p-4 rounded-2xl border border-line/60 shadow-sm flex flex-col justify-between hover:border-purple-200 transition-all duration-200">
            <span className="text-[10px] font-black tracking-wider text-ink-faint uppercase">Acessos Recentes</span>
            <span className="text-2xl font-black text-ink mt-1">{totalLogs}</span>
            <span className="text-xs text-ink-soft mt-2">Registros exibidos</span>
          </div>
          <div className="bg-surface p-4 rounded-2xl border border-line/60 shadow-sm flex flex-col justify-between hover:border-sky-200 transition-all duration-200">
            <span className="text-[10px] font-black tracking-wider text-ink-faint uppercase">Acessos pelo App</span>
            <span className="text-2xl font-black text-sky-700 mt-1">{appAccessCount}</span>
            <span className="text-xs text-ink-soft mt-2">Conexões mobile</span>
          </div>
          <div className="bg-surface p-4 rounded-2xl border border-line/60 shadow-sm flex flex-col justify-between hover:border-emerald-200 transition-all duration-200">
            <span className="text-[10px] font-black tracking-wider text-ink-faint uppercase">Acessos pela Web</span>
            <span className="text-2xl font-black text-emerald-700 mt-1">{webAccessCount}</span>
            <span className="text-xs text-ink-soft mt-2">Navegadores desktop</span>
          </div>
          <div className="bg-surface p-4 rounded-2xl border border-line/60 shadow-sm flex flex-col justify-between hover:border-amber-200 transition-all duration-200">
            <span className="text-[10px] font-black tracking-wider text-ink-faint uppercase">Ações de Gestão</span>
            <span className="text-2xl font-black text-amber-700 mt-1">{criticalActionsCount}</span>
            <span className="text-xs text-ink-soft mt-2">Alterações operacionais</span>
          </div>
        </div>

        {/* Filter Controls Card */}
        <div className="bg-surface p-4 rounded-2xl border border-line/60 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="w-full md:w-1/3 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por usuário, IP ou motivo..."
                className="w-full rounded-xl bg-subtle border border-line px-4 py-2.5 text-sm placeholder-slate-400 focus:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-600/10 transition-all text-ink"
              />
            </div>
            
            <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end">
              {/* Device Filter Buttons */}
              <div className="flex bg-subtle p-1 rounded-xl border border-line/50">
                {(
                  [
                    ['ALL', 'Todos'],
                    ['WEB', 'Web'],
                    ['APP', 'App'],
                  ] as const
                ).map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setDeviceFilter(val)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      deviceFilter === val
                        ? 'bg-surface text-ink shadow-sm'
                        : 'text-ink-soft hover:text-ink'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Action Filter Buttons */}
              <div className="flex bg-subtle p-1 rounded-xl border border-line/50">
                {(
                  [
                    ['ALL', 'Ações'],
                    ['LOGIN', 'Logins'],
                    ['LOCATION', 'GPS'],
                    ['OTHER', 'Gestão'],
                  ] as const
                ).map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setActionFilter(val)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      actionFilter === val
                        ? 'bg-surface text-ink shadow-sm'
                        : 'text-ink-soft hover:text-ink'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={loadLogs}
                className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold shadow hover:bg-purple-700 transition-all flex items-center gap-1.5"
              >
                🔄 Atualizar
              </button>
            </div>
          </div>
        </div>

        {/* Logs Table Area */}
        {loading ? (
          <div className="p-8 text-center bg-surface border border-line/60 rounded-2xl shadow-sm">
            <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-ink-soft font-medium text-sm">Carregando logs de auditoria...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center bg-surface border border-line/60 rounded-2xl shadow-sm">
            <p className="text-red-500 font-semibold">{error}</p>
            <button
              onClick={loadLogs}
              className="mt-3 px-4 py-2 bg-subtle text-ink border border-line rounded-xl text-xs font-bold hover:bg-subtle"
            >
              Tentar Novamente
            </button>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center bg-surface border border-line/60 rounded-2xl shadow-sm">
            <p className="text-ink-soft font-medium">Nenhum log encontrado para os filtros selecionados.</p>
            <p className="text-xs text-ink-faint mt-1">Experimente limpar a busca ou mudar os seletores.</p>
          </div>
        ) : (
          <div className="bg-surface border border-line/60 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-subtle border-b border-line text-[10px] font-black uppercase text-ink-faint tracking-wider">
                    <th className="py-4 px-6">Data/Hora</th>
                    <th className="py-4 px-6">Operador</th>
                    <th className="py-4 px-6">Ação</th>
                    <th className="py-4 px-6">Dispositivo / Cliente</th>
                    <th className="py-4 px-6">Endereço IP</th>
                    <th className="py-4 px-6">Local / Coordenadas</th>
                    <th className="py-4 px-6">Detalhes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-xs text-ink">
                  {filteredLogs.map((log) => {
                    const dev = parseDevice(log.deviceType);
                    const act = parseAction(log.action);
                    
                    return (
                      <tr key={log.id} className="hover:bg-subtle/50 transition-colors">
                        {/* Timestamp */}
                        <td className="py-4 px-6 whitespace-nowrap text-ink-soft font-mono">
                          {new Date(log.createdAt).toLocaleString('pt-BR')}
                        </td>

                        {/* Attendant info */}
                        <td className="py-4 px-6">
                          {log.user ? (
                            <div className="flex items-center gap-2.5">
                              <span className="w-8 h-8 rounded-full bg-purple-500/10 text-purple-700 font-bold flex items-center justify-center border border-purple-500/15 shrink-0 uppercase">
                                {log.user.name.charAt(0)}
                              </span>
                              <div>
                                <p className="font-bold text-ink">{log.user.name}</p>
                                <p className="text-[10px] text-ink-faint font-mono">{log.user.email}</p>
                              </div>
                            </div>
                          ) : (
                            <span className="text-ink-faint italic font-medium">— Público / Webhook</span>
                          )}
                        </td>

                        {/* Action Badge */}
                        <td className="py-4 px-6">
                          <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-bold ${act.color}`}>
                            {act.label}
                          </span>
                        </td>

                        {/* Device / Browser */}
                        <td className="py-4 px-6 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1">
                            <span>{dev.icon}</span>
                            <span className="font-semibold text-ink">{dev.label}</span>
                          </span>
                        </td>

                        {/* IP Address */}
                        <td className="py-4 px-6 font-mono text-ink-soft whitespace-nowrap">
                          {log.ipAddress ? log.ipAddress.replace('::ffff:', '') : '—'}
                        </td>

                        {/* Location GPS coordinates */}
                        <td className="py-4 px-6 whitespace-nowrap">
                          {log.latitude && log.longitude ? (
                            <a
                              href={`https://maps.google.com/?q=${log.latitude},${log.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-sky-50 border border-sky-200/50 hover:bg-sky-100 text-sky-700 font-bold rounded-lg transition-all"
                            >
                              📍 {log.latitude.toFixed(5)}, {log.longitude.toFixed(5)}
                            </a>
                          ) : (
                            <span className="text-ink-faint italic">Sem GPS</span>
                          )}
                        </td>

                        {/* Reason / Details */}
                        <td className="py-4 px-6 max-w-xs truncate text-ink-soft font-medium" title={log.reason || ''}>
                          {log.reason || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function AcessosPage() {
  return (
    <Suspense fallback={<div className="p-8 text-ink-soft text-sm">Carregando auditoria...</div>}>
      <AcessosConteudo />
    </Suspense>
  );
}
