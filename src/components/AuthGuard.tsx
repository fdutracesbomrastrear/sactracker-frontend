'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';

type Props = {
  children: React.ReactNode;
  className?: string;
};

/**
 * Redireciona para /login se não autenticado.
 * A checagem roda uma única vez por montagem (ref), mesmo com re-renders do router.
 */
export function AuthGuard({ children, className }: Props) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const didCheck = useRef(false);

  useEffect(() => {
    if (didCheck.current) return;
    didCheck.current = true;

    if (!isAuthenticated()) {
      router.replace('/login');
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <div
        className={
          className ??
          'flex h-screen items-center justify-center bg-slate-50 text-slate-500'
        }
      >
        Carregando...
      </div>
    );
  }

  return <>{children}</>;
}
