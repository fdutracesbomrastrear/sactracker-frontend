'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      router.push('/inbox');
    }, 1000);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-purple-950 relative overflow-hidden">
      {/* Efeitos de fundo para dar um tom "premium" */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-50 animate-blob"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-amber-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-30 animate-blob animation-delay-2000"></div>

      <div className="relative w-full max-w-md rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/30 mb-4">
            <span className="text-2xl font-bold text-purple-950">ST</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">SacTracker</h1>
          <p className="mt-2 text-sm text-purple-200">
            Plataforma Omnichannel de Rastreamento
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="mb-2 block text-sm font-medium text-purple-100">
              E-mail
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl bg-purple-950/50 border border-purple-800/50 px-4 py-3 text-white placeholder-purple-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20 transition-all"
              placeholder="atendente@bomrastrear.com"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-purple-100">
              Senha
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl bg-purple-950/50 border border-purple-800/50 px-4 py-3 text-white placeholder-purple-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20 transition-all"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/30 transition-all hover:scale-[1.02] hover:shadow-blue-500/50 disabled:opacity-70 disabled:hover:scale-100"
          >
            {loading ? 'Entrando...' : 'Acessar Painel'}
          </button>
        </form>
      </div>
    </div>
  );
}
