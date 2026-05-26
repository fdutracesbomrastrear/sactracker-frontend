'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getHomePath, parsePermissions } from '@/modules/core/lib/roles';
import { getUser, isAuthenticated } from '@/modules/core/lib/auth';

type Props = {
  children: React.ReactNode;
  allowedPermissions?: string[];
  className?: string;
};

export function AuthGuard({ children, allowedPermissions, className }: Props) {
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
    const permissions = parsePermissions(user?.permissions);

    if (permissions.includes('ADMIN')) {
      setReady(true);
      return;
    }

    if (allowedPermissions && allowedPermissions.length > 0) {
      const hasAccess = allowedPermissions.some(perm => permissions.includes(perm));
      if (!hasAccess) {
        router.replace(getHomePath(permissions));
        return;
      }
    }

    setReady(true);
  }, [router, allowedPermissions]);

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
