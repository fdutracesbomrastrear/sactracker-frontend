'use client';

import { useEffect, useState } from 'react';
import { getToken } from '@/modules/core/lib/auth';
import { resolveAvatarApiUrl } from '@/modules/core/lib/profile';

type Props = {
  name: string;
  avatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const sizeClasses = {
  sm: 'w-9 h-9 text-xs',
  md: 'w-16 h-16 text-lg',
  lg: 'w-24 h-24 text-2xl',
};

export function ProfileAvatar({ name, avatarUrl, size = 'sm', className = '' }: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const initial = (name?.trim()?.charAt(0) || 'U').toUpperCase();
  const resolved = resolveAvatarApiUrl(avatarUrl);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    async function load() {
      if (!resolved) {
        setSrc(null);
        return;
      }

      const token = getToken();
      try {
        const res = await fetch(resolved, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) {
          if (!cancelled) setSrc(null);
          return;
        }
        const blob = await res.blob();
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) setSrc(objectUrl);
      } catch {
        if (!cancelled) setSrc(null);
      }
    }

    load();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [resolved]);

  const base = `rounded-full shrink-0 ring-1 ring-white/15 overflow-hidden flex items-center justify-center font-bold ${sizeClasses[size]} ${className}`;

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={`Foto de ${name}`} className={`${base} object-cover bg-subtle`} />
    );
  }

  return (
    <div className={`${base} bg-purple-700 text-white`}>
      {initial}
    </div>
  );
}
