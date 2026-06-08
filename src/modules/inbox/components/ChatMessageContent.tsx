'use client';

import { useEffect, useMemo, useState } from 'react';
import { getToken } from '@/modules/core/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

const URL_REGEX = /(https?:\/\/[^\s]+)/g;

type Props = {
  messageId: string;
  content: string;
  mediaType?: string | null;
  fileName?: string | null;
  fromMe: boolean;
};

function renderFormattedLine(line: string, fromMe: boolean) {
  const normalizedLine = line.replace(/\*\*+/g, '*');
  const linkClass = fromMe
    ? 'underline decoration-white/40 underline-offset-2 hover:decoration-white break-all'
    : 'underline decoration-current/40 underline-offset-2 hover:decoration-current break-all';

  const parts = normalizedLine.split(URL_REGEX);
  return parts.flatMap((part, i) => {
    if (part.startsWith('http://') || part.startsWith('https://')) {
      const label =
        part.length > 48 ? `${part.slice(0, 40)}…${part.slice(-8)}` : part;
      return [
        <a
          key={`url-${i}`}
          href={part}
          target="_blank"
          rel="noreferrer"
          className={linkClass}
        >
          {label}
        </a>,
      ];
    }

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
  const hasMedia = Boolean(mediaType);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    setToken(getToken());
  }, []);

  const mediaUrl = hasMedia && token ? `${API_URL}/api/tickets/messages/${messageId}/file?token=${token}` : null;

  const lines = useMemo(
    () => content.split('\n').filter((l, i, arr) => l.trim() || i < arr.length - 1),
    [content]
  );

  return (
    <div className="space-y-2.5 min-w-0">
      {hasMedia && mediaUrl && mediaType === 'image' && (
        <a href={mediaUrl} target="_blank" rel="noreferrer" className="block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mediaUrl}
            alt={fileName || 'Imagem'}
            className="rounded-xl max-h-56 w-full object-cover ring-1 ring-black/5"
          />
        </a>
      )}

      {hasMedia && mediaUrl && mediaType === 'audio' && (
        <div className="pt-1">
          <audio src={mediaUrl} controls className="max-w-full h-10" />
        </div>
      )}

      {hasMedia && mediaUrl && mediaType === 'video' && (
        <video src={mediaUrl} controls className="rounded-xl max-h-56 w-full object-cover ring-1 ring-black/5" />
      )}

      {hasMedia && mediaUrl && mediaType === 'document' && (
        <a
          href={mediaUrl}
          target="_blank"
          rel="noreferrer"
          className={`flex items-center gap-2.5 w-full text-left rounded-xl px-3 py-2.5 transition-colors ${
            fromMe
              ? 'bg-white/15 hover:bg-white/20'
              : 'bg-subtle hover:bg-subtle ring-1 ring-line/80'
          }`}
        >
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg ${
              fromMe ? 'bg-white/20' : 'bg-violet-100'
            }`}
          >
            📎
          </span>
          <span className={`text-sm font-medium truncate ${fromMe ? 'text-white' : 'text-ink'}`}>
            {fileName}
          </span>
        </a>
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
                  : 'bg-subtle text-ink ring-1 ring-line'
              }`}
            >
              {line.trim()}
            </div>
          );
        }

        return (
          <p
            key={`line-${idx}`}
            className="text-[14px] leading-relaxed break-words"
          >
            {renderFormattedLine(line, fromMe)}
          </p>
        );
      })}
    </div>
  );
}
