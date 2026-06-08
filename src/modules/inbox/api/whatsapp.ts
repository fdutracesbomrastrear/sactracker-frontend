import { apiFetch } from '@/modules/core/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export type WhatsAppStatus = {
  connected: boolean;
  state: 'open' | 'close' | 'connecting' | 'unknown';
  instance?: string;
  error?: string;
};

export type WhatsAppQrResponse = {
  connected: boolean;
  state?: string;
  pairingCode?: string | null;
  imageDataUrl?: string | null;
  hasCode?: boolean;
  message?: string | null;
  error?: string;
};

export async function fetchWhatsAppStatus(): Promise<WhatsAppStatus> {
  const res = await apiFetch(`${API_URL}/api/whatsapp/status`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return {
      connected: false,
      state: 'unknown',
      error: data.error || 'Falha ao verificar WhatsApp',
    };
  }
  return res.json();
}

export async function fetchWhatsAppQr(refresh = false): Promise<WhatsAppQrResponse> {
  const q = refresh ? '?refresh=1' : '';
  const res = await apiFetch(`${API_URL}/api/whatsapp/qrcode${q}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Falha ao carregar QR Code');
  }
  return res.json();
}

export async function reconnectWhatsApp(): Promise<WhatsAppQrResponse> {
  const res = await apiFetch(`${API_URL}/api/whatsapp/reconnect`, {
    method: 'POST',
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Falha ao reconectar');
  }
  return res.json();
}
