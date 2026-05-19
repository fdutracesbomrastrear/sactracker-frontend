'use client';

import { useEffect, useMemo, useState } from 'react';
import { getToken } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const URL_REGEX = /(https?:\/\/[^\s]+)/g;

type Props = {
  messageId: string;
  content: string;
  mediaType?: string | null;
  fileName?: string | null;
  fromMe: boolean;
};

function renderFormattedLine(line: string, fromMe: boolean) {
  const linkClass = fromMe
    ? 'underline decoration-white/40 underline-offset-2 hover:decoration-white break-all'
    : 'text-violet-600 underline decoration-violet-200 underline-offset-2 hover:text-violet-800 break-all';

  const parts = line.split(URL_REGEX);
  return parts.map((part, i) => {
    if (URL_REGEX.test(part)) {
      URL_REGEX.lastIndex = 0;
      const label =
        part.length > 48 ? `${part.slice(0, 40)}…${part.slice(-8)}` : part;
      return (
        <a
          key={`${i}-${part.slice(0, 12)}`}
          href={part}
          target="_blank"
          rel="noreferrer"
          className={linkClass}
        >
          {label}
        </a>
      );
    }

    URL_REGEX.lastIndex = 0;
    const boldParts = part.split(/(\*[^*]+\*)/g);
    return boldParts.map((seg, j) => {
      if (seg.startsWith('*') && seg.endsWith('*')) {
        return (
          <strong key={`${i}-${j}`} className="font-semibold">
            {seg.slice(1, -1)}
          </strong>
        );
      }
      return <span key={`${i}-${j}`}>{seg}</span>;
    });
  });
}

function isLikelyPixCode(text: string): boolean {
  const t = text.trim();
  return t.length > 80 && !t.includes(' ') && /^[0-9A-Za-z]+$/i.test(t);
}

export function ChatMessageContent({
  messageId,
  content,
  mediaType,
  fileName,
  fromMe,
}: Props) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const hasMedia = Boolean(mediaType && fileName);

  const lines = useMemo(
    () => content.split('\n').filter((l, i, arr) => l.trim() || i < arr.length - 1),
    [content]
  );

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

  const downloadAttachment = (e: React.MouseEvent) => {
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
  };

  return (
    <div className="space-y-2.5 min-w-0">
      {mediaType === 'image' && blobUrl && (
        <a href={blobUrl} target="_blank" rel="noreferrer" className="block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={blobUrl}
            alt={fileName || 'Imagem'}
            className="rounded-xl max-h-56 w-full object-cover ring-1 ring-black/5"
          />
        </a>
      )}

      {hasMedia && mediaType !== 'image' && (
        <button
          type="button"
          onClick={downloadAttachment}
          className={`flex items-center gap-2.5 w-full text-left rounded-xl px-3 py-2.5 transition-colors ${
            fromMe
              ? 'bg-white/15 hover:bg-white/20'
              : 'bg-slate-50 hover:bg-slate-100 ring-1 ring-slate-200/80'
          }`}
        >
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg ${
              fromMe ? 'bg-white/20' : 'bg-violet-100'
            }`}
          >
            📎
          </span>
          <span className={`text-sm font-medium truncate ${fromMe ? 'text-white' : 'text-slate-700'}`}>
            {fileName}
          </span>
        </button>
      )}

      {lines.map((line, idx) => {
        if (!line.trim()) return <br key={`br-${idx}`} />;

        if (isLikelyPixCode(line)) {
          return (
            <div
              key={`pix-${idx}`}
              className={`rounded-xl px-3 py-2.5 font-mono text-[11px] leading-relaxed break-all ${
                fromMe
                  ? 'bg-white/12 text-white/95 ring-1 ring-white/20'
                  : 'bg-slate-50 text-slate-700 ring-1 ring-slate-200'
              }`}
            >
              {line.trim()}
            </div>
          );
        }

        return (
          <p
            key={`line-${idx}`}
            className={`text-[14px] leading-relaxed break-words ${
              fromMe ? 'text-white/95' : 'text-slate-700'
            }`}
          >
            {renderFormattedLine(line, fromMe)}
          </p>
        );
      })}
    </div>
  );
}
