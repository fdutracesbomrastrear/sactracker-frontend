'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { getToken, getUser } from '@/modules/core/lib/auth';
import { parsePermissions } from '@/modules/core/lib/roles';
import {
  fetchWhatsAppQr,
  fetchWhatsAppStatus,
  reconnectWhatsApp,
  WhatsAppQrResponse,
} from '@/modules/inbox/api/whatsapp';

export function WhatsAppQrOverlay() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [state, setState] = useState<string>('unknown');
  const [qr, setQr] = useState<WhatsAppQrResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [falhasConsecutivas, setFalhasConsecutivas] = useState(0);

  const user = getUser();
  const isAdmin = user ? parsePermissions(user.permissions).includes('ADMIN') : false;
  const autenticado = Boolean(getToken()) && !pathname.startsWith('/login') && isAdmin;

  const carregarQr = useCallback(async (refresh = false) => {
    setLoading(true);
    setErro(null);
    try {
      const data = await fetchWhatsAppQr(refresh);
      if (data.connected) {
        setVisible(false);
        setQr(null);
        return;
      }
      setQr(data);
      if (data.state) setState(data.state);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar QR');
    } finally {
      setLoading(false);
    }
  }, []);

  const verificar = useCallback(async () => {
    if (!autenticado) return;
    try {
      const status = await fetchWhatsAppStatus();
      setState(status.state);
      setFalhasConsecutivas(0); // reset ao ter sucesso
      if (status.connected) {
        setVisible(false);
        setQr(null);
        return;
      }
      // Só mostra overlay se genuinamente desconectado (state != open)
      if (status.state !== 'open') {
        setVisible(true);
      }
    } catch {
      // Erro de rede: incrementa contador, só exibe overlay após 3 falhas consecutivas
      setFalhasConsecutivas((prev) => {
        const novas = prev + 1;
        if (novas >= 3) setVisible(true);
        return novas;
      });
    }
  }, [autenticado]);

  useEffect(() => {
    void verificar();
    if (!autenticado) return;
    const id = window.setInterval(() => void verificar(), 8000);
    return () => window.clearInterval(id);
  }, [verificar, autenticado]);

  useEffect(() => {
    if (!visible) return;
    void carregarQr(false);
    const id = window.setInterval(() => void carregarQr(true), 20000);
    return () => window.clearInterval(id);
  }, [visible, carregarQr]);

  if (!autenticado || !visible) return null;

  async function handleReconnect() {
    setLoading(true);
    setErro(null);
    try {
      const data = await reconnectWhatsApp();
      if (data.connected) {
        setVisible(false);
        return;
      }
      setQr(data);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-surface shadow-2xl border border-line overflow-hidden">
        <div className="bg-gradient-to-r from-purple-950 to-purple-800 px-5 py-4 text-white">
          <h2 className="text-lg font-bold">WhatsApp desconectado</h2>
          <p className="text-xs text-purple-200 mt-1">
            Escaneie o QR Code para voltar a enviar e receber mensagens
          </p>
        </div>

        <div className="p-5 text-center space-y-4">
          {state === 'connecting' && (
            <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
              Conectando… aguarde ou escaneie o código abaixo.
            </p>
          )}

          {erro && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-2">
              {erro}
            </p>
          )}

          {loading && !qr?.imageDataUrl && (
            <p className="text-sm text-ink-soft">Gerando QR Code…</p>
          )}

          {qr?.imageDataUrl && (
            <div className="inline-block p-3 bg-surface rounded-xl ring-1 ring-line shadow-inner">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qr.imageDataUrl}
                alt="QR Code WhatsApp"
                className="w-64 h-64 mx-auto"
              />
            </div>
          )}

          {qr?.pairingCode && (
            <div className="rounded-xl bg-subtle border border-line p-3">
              <p className="text-xs text-ink-soft mb-1">Código de pareamento</p>
              <p className="text-2xl font-bold tracking-[0.3em] text-ink">
                {qr.pairingCode}
              </p>
              <p className="text-[11px] text-ink-soft mt-2">
                WhatsApp → Aparelhos conectados → Conectar com número
              </p>
            </div>
          )}

          {!qr?.imageDataUrl && !loading && qr?.message && (
            <p className="text-sm text-ink-soft">{qr.message}</p>
          )}

          <ol className="text-left text-xs text-ink-soft space-y-1.5 bg-subtle rounded-xl p-3">
            <li>1. Abra o WhatsApp no celular</li>
            <li>2. Menu → Aparelhos conectados → Conectar aparelho</li>
            <li>3. Escaneie o QR acima</li>
          </ol>

          <div className="flex flex-wrap gap-2 justify-center">
            <button
              type="button"
              disabled={loading}
              onClick={() => void carregarQr(true)}
              className="px-4 py-2 text-sm font-semibold bg-purple-950 text-white rounded-lg disabled:opacity-50"
            >
              Atualizar QR
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => void verificar()}
              className="px-4 py-2 text-sm font-medium border border-line rounded-lg hover:bg-subtle disabled:opacity-50"
            >
              Já conectei
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => void handleReconnect()}
              className="px-4 py-2 text-sm font-medium text-red-700 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50"
            >
              Resetar conexão
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
