'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/modules/core/lib/api';
import { getUser, isAuthenticated, setSession } from '@/modules/core/lib/auth';
import { getHomePath, parsePermissions } from '@/modules/core/lib/roles';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated()) {
      router.replace(getHomePath(parsePermissions(getUser()?.permissions)));
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { token, user } = await login(email, password);
      setSession(token, user);
      router.push(getHomePath(parsePermissions(user.permissions)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao entrar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 font-sans relative overflow-hidden">
      {/* Sutil gradiente de profundidade de fundo para aspecto corporativo */}
      <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-purple-950/20 to-transparent pointer-events-none" />
      
      <div className="relative w-full max-w-[440px] rounded-3xl border border-slate-900 bg-slate-900/30 p-10 backdrop-blur-2xl shadow-[0_8px_30px_rgb(0,0,0,0.4)] flex flex-col">
        {/* Branding */}
        <div className="mb-8 text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center shadow-md border border-slate-800 bg-white mb-4 transition-transform hover:scale-105 duration-300">
            <img src="/logo.png" alt="SacTracker" className="w-12 h-12 object-contain" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">SacTracker</h1>
          <p className="mt-2 text-xs text-ink-faint font-medium">
            Plataforma Omnichannel de Rastreamento & Atendimento
          </p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleLogin} className="space-y-5">
          {error && (
            <div className="text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              ⚠️ {error}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-bold text-ink-faint uppercase tracking-wider">
              E-mail corporativo
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="auth-input w-full rounded-xl bg-zinc-900/70 border border-zinc-700 px-4 py-3 text-white text-sm placeholder-zinc-500 caret-purple-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/10 transition-all font-medium [color-scheme:dark]"
              placeholder="seuemail@bomrastrear.com.br"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-bold text-ink-faint uppercase tracking-wider">
                Senha de acesso
              </label>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="auth-input w-full rounded-xl bg-zinc-900/70 border border-zinc-700 px-4 py-3 text-white text-sm placeholder-zinc-500 caret-purple-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/10 transition-all font-medium [color-scheme:dark]"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-purple-900 hover:bg-purple-800 px-4 py-3 text-sm font-bold text-white shadow-md shadow-purple-900/20 transition-all duration-200 hover:-translate-y-[1px] active:translate-y-[1px] disabled:opacity-70 disabled:hover:translate-y-0"
          >
            {loading ? 'Validando credenciais...' : 'Acessar painel'}
          </button>
        </form>

        {/* Informações Extras de Suporte */}
        <div className="mt-8 pt-6 border-t border-slate-900/60 text-center space-y-2">
          <p className="text-[10px] text-ink-soft leading-relaxed font-semibold">
            Atendimento: <span className="text-ink-faint">atendente@bomrastrear.com</span>
            <br />
            Financeiro: <span className="text-ink-faint">financeiro@bomrastrear.com</span>
          </p>
          <p className="text-[9px] text-ink-soft">
            Ambiente Seguro · SacTracker v1.2
          </p>
        </div>
      </div>
    </div>
  );
}

