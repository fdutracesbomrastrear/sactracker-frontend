'use client';

import { useEffect, useState } from 'react';
import { getToken } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type Props = {
  messageId: string;
  content: string;
  mediaType?: string | null;
  fileName?: string | null;
  fromMe: boolean;
};

export function ChatMessageContent({
  messageId,
  content,
  mediaType,
  fileName,
  fromMe,
}: Props) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const hasMedia = Boolean(mediaType && fileName);

  useEffect(() => {
    if (!hasMedia || mediaType !== 'image') {
      setBlobUrl(null);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;

    const token = getToken();
    fetch(`${API_URL}/api/tickets/messages/${messageId}/file`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => {
        if (!res.ok) throw new Error('Falha ao carregar imagem');
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      })
      .catch(() => setBlobUrl(null));

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [hasMedia, mediaType, messageId]);

  const linkClass = fromMe
    ? 'text-blue-100 underline hover:text-white'
    : 'text-blue-600 underline hover:text-blue-800';

  return (
    <div className="space-y-2">
      {mediaType === 'image' && blobUrl && (
        <a
          href={blobUrl}
          target="_blank"
          rel="noreferrer"
          className="block max-w-xs"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={blobUrl}
            alt={fileName || 'Imagem'}
            className="rounded-lg max-h-64 object-contain bg-black/10"
          />
        </a>
      )}

      {hasMedia && mediaType !== 'image' && (
        <a
          href={`${API_URL}/api/tickets/messages/${messageId}/file`}
          target="_blank"
          rel="noreferrer"
          className={`inline-flex items-center gap-2 text-sm font-medium ${linkClass}`}
          onClick={(e) => {
            e.preventDefault();
            const token = getToken();
            fetch(`${API_URL}/api/tickets/messages/${messageId}/file`, {
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            })
              .then((r) => r.blob())
              .then((blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName || 'arquivo';
                a.click();
                URL.revokeObjectURL(url);
              });
          }}
        >
          📎 {fileName}
        </a>
      )}

      {content && (
        <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{content}</p>
      )}
    </div>
  );
}
