'use client';

import Link from 'next/link';
import { FinanceiroPanel } from '@/components/FinanceiroPanel';
import { clearSession, getUser } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export default function FinanceiroPage() {
  const router = useRouter();
  const user = getUser();

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      <header className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href="/inbox"
            className="text-sm font-semibold text-blue-600 hover:underline"
          >
            ← Inbox
          </Link>
          <h1 className="text-lg font-bold text-purple-950">Financeiro — Boletos</h1>
        </div>
        <div className="flex items-center gap-3">
          {user && (
            <span className="text-xs text-slate-500">{user.name}</span>
          )}
          <button
            type="button"
            onClick={() => {
              clearSession();
              router.push('/login');
            }}
            className="text-xs text-slate-600 hover:text-slate-900"
          >
            Sair
          </button>
        </div>
      </header>
      <main className="flex-1 min-h-0 flex">
        <FinanceiroPanel />
      </main>
    </div>
  );
}
