'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getHomePath, parseUserRole, UserRole } from '@/lib/roles';
import { getUser, isAuthenticated } from '@/lib/auth';

type Props = {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  className?: string;
};

export function AuthGuard({ children, allowedRoles, className }: Props) {
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

    const user = getUser();
    const role = parseUserRole(user?.role);

    if (allowedRoles && !allowedRoles.includes(role)) {
      router.replace(getHomePath(role));
      return;
    }

    setReady(true);
  }, [router, allowedRoles]);

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
