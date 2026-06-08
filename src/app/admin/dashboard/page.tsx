'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/modules/core/lib/api';
import { 
  AreaChart, 
  Area,
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { 
  Bot, 
  UserCircle, 
  Handshake, 
  Megaphone,
  Activity,
  ArrowUpRight,
  TrendingUp
} from 'lucide-react';

interface DashboardStats {
  cards: {
    botAssumedToday: number;
    humanAssumedToday: { name: string; count: number }[];
    totalHumanAssumedToday: number;
    financialAgreementsToday: number;
    campaignsSentToday: number;
  };
  charts: {
    pieData: { name: string; value: number }[];
    lineData: any[];
  }
}

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#f43f5e', '#06b6d4'];

function formatKey(key: string) {
  const mapping: Record<string, string> = {
    botAssumedToday: 'Automação (Gina)',
    botAssumed: 'Automação (Gina)',
    totalHumanAssumedToday: 'Atend. Humano',
    humanAssumed: 'Atend. Humano',
    financialAgreementsToday: 'Acordos',
    agreements: 'Acordos',
    campaignsSentToday: 'Campanhas',
    campaigns: 'Campanhas',
    totalActiveTickets: 'Tickets Ativos'
  };
  return mapping[key] || key;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="backdrop-blur-md bg-slate-900/90 border border-slate-700/50 p-4 rounded-2xl shadow-2xl text-xs space-y-2">
        <p className="font-bold text-ink-faint border-b border-slate-800 pb-1.5 mb-1.5">{label}</p>
        <div className="space-y-1.5">
          {payload.map((p: any, i: number) => (
            <div key={i} className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.stroke || p.fill }} />
                <span className="text-ink-faint font-medium">{formatKey(p.name)}</span>
              </div>
              <span className="font-bold text-slate-100 text-right">{p.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await apiFetch('/api/dashboard/stats');
        const data = await res.json();
        setStats(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !stats) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <div className="animate-spin text-purple-500">
          <Activity size={36} />
        </div>
        <span className="text-ink-faint text-sm font-medium">Carregando painel visual...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm font-medium">
          ⚠️ Erro ao carregar dashboard: {error}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  // Obter chaves dinâmicas do lineData (excluindo 'date') para desenhar os gradientes e áreas
  const lineKeys = Object.keys(stats.charts.lineData[0] || {}).filter(k => k !== 'date');

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500 bg-slate-950 min-h-screen text-slate-100">
      
      {/* Cabeçalho */}
      <div className="flex items-center justify-between border-b border-slate-900 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-purple-500/10 text-purple-400 text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider flex items-center gap-1.5 border border-purple-500/20">
              <TrendingUp size={12} /> Live Analytics
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-50 tracking-tight mt-1.5">Dashboard Operacional</h1>
          <p className="text-ink-faint text-sm mt-1">Métricas de atendimento, finanças e campanhas dos últimos 7 dias.</p>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Card Bot */}
        <div className="relative group overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-900/40 p-6 backdrop-blur-xl transition-all duration-350 hover:-translate-y-1 hover:border-emerald-500/30 hover:bg-slate-900/70 hover:shadow-2xl hover:shadow-emerald-500/5">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors"></div>
          <div className="flex justify-between items-start">
            <div className="p-3.5 bg-emerald-500/10 rounded-2xl text-emerald-400 group-hover:scale-110 transition-transform border border-emerald-500/10">
              <Bot size={22} />
            </div>
            <div className="flex flex-col items-end">
              <span className="text-3xl font-black text-slate-50 tracking-tight">{stats.cards.botAssumedToday}</span>
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded mt-1 flex items-center gap-0.5">
                Gina Ativa <ArrowUpRight size={10} />
              </span>
            </div>
          </div>
          <div className="mt-6">
            <h3 className="text-slate-200 font-bold text-sm">Automação Inteligente</h3>
            <p className="text-xs text-ink-soft mt-1 leading-relaxed">Mensagens respondidas de forma autônoma pela Gina hoje.</p>
          </div>
        </div>

        {/* Card Humanos */}
        <div className="relative group overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-900/40 p-6 backdrop-blur-xl transition-all duration-350 hover:-translate-y-1 hover:border-blue-500/30 hover:bg-slate-900/70 hover:shadow-2xl hover:shadow-blue-500/5">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors"></div>
          <div className="flex justify-between items-start">
            <div className="p-3.5 bg-blue-500/10 rounded-2xl text-blue-400 group-hover:scale-110 transition-transform border border-blue-500/10">
              <UserCircle size={22} />
            </div>
            <div className="flex flex-col items-end">
              <span className="text-3xl font-black text-slate-50 tracking-tight">{stats.cards.totalHumanAssumedToday}</span>
              <span className="text-[10px] text-blue-400 font-bold bg-blue-500/10 px-1.5 py-0.5 rounded mt-1 flex items-center gap-0.5">
                Operadores <ArrowUpRight size={10} />
              </span>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <h3 className="text-slate-200 font-bold text-sm">Atendimento Humano</h3>
            <div className="text-[11px] text-ink-faint space-y-1.5 max-h-16 overflow-y-auto pr-1">
              {stats.cards.humanAssumedToday.length === 0 && <p className="text-ink-soft italic">Nenhum operador online</p>}
              {stats.cards.humanAssumedToday.map((h, i) => (
                <div key={i} className="flex justify-between items-center bg-slate-950/40 px-2 py-1 rounded-lg border border-slate-900/60">
                  <span className="truncate max-w-[100px]">{h.name}</span>
                  <span className="text-blue-400 font-bold">{h.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Card Financeiro */}
        <div className="relative group overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-900/40 p-6 backdrop-blur-xl transition-all duration-350 hover:-translate-y-1 hover:border-amber-500/30 hover:bg-slate-900/70 hover:shadow-2xl hover:shadow-amber-500/5">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-colors"></div>
          <div className="flex justify-between items-start">
            <div className="p-3.5 bg-amber-500/10 rounded-2xl text-amber-400 group-hover:scale-110 transition-transform border border-amber-500/10">
              <Handshake size={22} />
            </div>
            <div className="flex flex-col items-end">
              <span className="text-3xl font-black text-slate-50 tracking-tight">{stats.cards.financialAgreementsToday}</span>
              <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded mt-1 flex items-center gap-0.5">
                Negociações <ArrowUpRight size={10} />
              </span>
            </div>
          </div>
          <div className="mt-6">
            <h3 className="text-slate-200 font-bold text-sm">Acordos & Cobrança</h3>
            <p className="text-xs text-ink-soft mt-1 leading-relaxed">Promessas de pagamento ou carnês gerados no dia.</p>
          </div>
        </div>

        {/* Card Campanhas */}
        <div className="relative group overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-900/40 p-6 backdrop-blur-xl transition-all duration-350 hover:-translate-y-1 hover:border-purple-500/30 hover:bg-slate-900/70 hover:shadow-2xl hover:shadow-purple-500/5">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-colors"></div>
          <div className="flex justify-between items-start">
            <div className="p-3.5 bg-purple-500/10 rounded-2xl text-purple-400 group-hover:scale-110 transition-transform border border-purple-500/10">
              <Megaphone size={22} />
            </div>
            <div className="flex flex-col items-end">
              <span className="text-3xl font-black text-slate-50 tracking-tight">{stats.cards.campaignsSentToday}</span>
              <span className="text-[10px] text-purple-400 font-bold bg-purple-500/10 px-1.5 py-0.5 rounded mt-1 flex items-center gap-0.5">
                Envios <ArrowUpRight size={10} />
              </span>
            </div>
          </div>
          <div className="mt-6">
            <h3 className="text-slate-200 font-bold text-sm">Disparos de Campanha</h3>
            <p className="text-xs text-ink-soft mt-1 leading-relaxed">Mensagens em massa enviadas ativamente hoje.</p>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Gráfico de Pizza - Divisão de Trabalho */}
        <div className="bg-slate-900/30 border border-slate-800/80 p-6 rounded-3xl backdrop-blur-xl flex flex-col">
          <h3 className="text-base font-bold text-slate-200 mb-5 flex items-center gap-2">
            <span className="w-2 h-4 bg-purple-500 rounded-sm"></span>
            Divisão de Atendimentos
          </h3>
          <div className="h-64 flex-1 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.charts.pieData}
                  cx="50%"
                  cy="45%"
                  innerRadius={58}
                  outerRadius={85}
                  paddingAngle={6}
                  dataKey="value"
                  label={({ name, percent }) => `${formatKey(name || '')} ${((percent || 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                  style={{ outline: 'none' }}
                >
                  {stats.charts.pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="#0f172a" strokeWidth={3} />
                  ))}
                </Pie>
                <RechartsTooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="bottom" 
                  height={36} 
                  formatter={(value) => <span className="text-[11px] text-ink-faint font-semibold">{formatKey(value)}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Linha/Área - Evolução Semanal */}
        <div className="bg-slate-900/30 border border-slate-800/80 p-6 rounded-3xl backdrop-blur-xl col-span-1 lg:col-span-2 flex flex-col">
          <h3 className="text-base font-bold text-slate-200 mb-5 flex items-center gap-2">
            <span className="w-2 h-4 bg-blue-500 rounded-sm"></span>
            Evolução dos Últimos 7 Dias
          </h3>
          <div className="h-64 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.charts.lineData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  {lineKeys.map((key, index) => (
                    <linearGradient key={`grad-${key}`} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.35}/>
                      <stop offset="95%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0}/>
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} opacity={0.6} />
                <XAxis 
                  dataKey="date" 
                  stroke="#64748b" 
                  tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }} 
                  axisLine={false} 
                  tickLine={false}
                  dy={10}
                />
                <YAxis 
                  stroke="#64748b" 
                  tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }} 
                  axisLine={false} 
                  tickLine={false}
                  dx={-10}
                />
                <RechartsTooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="top" 
                  align="right"
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ top: -10, paddingBottom: 15 }}
                  formatter={(value) => <span className="text-[11px] text-ink-faint font-semibold">{formatKey(value)}</span>}
                />
                {lineKeys.map((key, index) => (
                  <Area
                    key={key} 
                    type="monotone" 
                    dataKey={key} 
                    stroke={COLORS[index % COLORS.length]} 
                    fill={`url(#grad-${key})`}
                    strokeWidth={3}
                    dot={{ r: 3, strokeWidth: 1.5, fill: '#090d16', stroke: COLORS[index % COLORS.length] }}
                    activeDot={{ r: 5, strokeWidth: 0, fill: COLORS[index % COLORS.length] }}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </div>
  );
}

