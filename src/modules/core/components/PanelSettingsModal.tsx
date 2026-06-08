'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  CHAT_PRESETS,
  ChatPresetId,
  FontSizeOption,
} from '@/modules/core/lib/panel-settings';
import { clearSession, getUser } from '@/modules/core/lib/auth';
import { roleLabel, parsePermissions } from '@/modules/core/lib/roles';
import { usePanelSettings, SystemTheme } from '@/modules/core/hooks/PanelSettingsProvider';
import { useProfile } from '@/modules/core/hooks/ProfileProvider';
import { ProfileAvatar } from '@/modules/core/components/ui/ProfileAvatar';

type Props = {
  onClose: () => void;
};

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label className="flex items-start justify-between gap-3 cursor-pointer py-2">
      <span>
        <span className="text-sm font-medium text-ink block">{label}</span>
        {description && <span className="text-xs text-ink-soft">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full shrink-0 transition-colors ${
          checked ? 'bg-purple-700' : 'bg-slate-300'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-surface rounded-full shadow transition-transform ${
            checked ? 'translate-x-5' : ''
          }`}
        />
      </button>
    </label>
  );
}

function ColorField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex flex-col items-center justify-center gap-1.5 text-[11px] font-bold text-ink-soft">
      <span>{label}</span>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="h-8 w-12 rounded border border-line cursor-pointer disabled:opacity-50"
      />
    </label>
  );
}

export function PanelSettingsModal({ onClose }: Props) {
  const router = useRouter();
  const { settings, updateSettings, resetSettings, systemTheme, updateSystemTheme } = usePanelSettings();
  const user = getUser();
  const { avatarUrl, isUploading, statusMessage, uploadAvatar, removeAvatar } = useProfile();
  const role = parsePermissions(user?.permissions);
  const isAdmin = user?.permissions?.includes('ADMIN') || false;

  const [localTheme, setLocalTheme] = useState<SystemTheme>({
    panel: { ...systemTheme.panel },
    mobile: { ...systemTheme.mobile },
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  function applyPreset(id: ChatPresetId) {
    updateSettings(CHAT_PRESETS[id]);
  }

  function handleLogout() {
    clearSession();
    router.push('/login');
  }

  function updateLocalTheme(target: 'panel' | 'mobile', key: 'primary' | 'secondary' | 'tertiary', value: string) {
    setLocalTheme((prev) => ({
      ...prev,
      [target]: {
        ...prev[target],
        [key]: value,
      },
    }));
  }

  async function handleSaveSystemTheme() {
    setIsSaving(true);
    setSaveStatus(null);
    try {
      await updateSystemTheme(localTheme);
      setSaveStatus('Tema salvo com sucesso!');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      console.error(err);
      setSaveStatus('Erro ao salvar tema');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        aria-label="Fechar configurações"
        onClick={onClose}
      />
      <div className="relative z-[101] w-full max-w-lg max-h-[90vh] overflow-hidden rounded-2xl bg-surface shadow-2xl flex flex-col">
        <div className="px-5 py-4 border-b border-line flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-bold text-ink">Configurações</h2>
            <p className="text-xs text-ink-soft">Preferências do usuário e do sistema</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-ink-faint hover:bg-subtle hover:text-ink"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {/* Seletor de Tema do Sistema (Administradores) */}
          {isAdmin && (
            <section className="border-b border-line pb-5">
              <h3 className="text-xs font-bold uppercase tracking-wide text-ink-soft mb-3">
                Tema de Cores do Sistema
              </h3>
              
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-ink mb-2">Painel Web (Atendentes)</p>
                  <div className="grid grid-cols-3 gap-2 rounded-xl border border-line bg-subtle/80 p-3">
                    <ColorField
                      label="Primária"
                      value={localTheme.panel.primary}
                      onChange={(v) => updateLocalTheme('panel', 'primary', v)}
                    />
                    <ColorField
                      label="Secundária"
                      value={localTheme.panel.secondary}
                      onChange={(v) => updateLocalTheme('panel', 'secondary', v)}
                    />
                    <ColorField
                      label="Terciária"
                      value={localTheme.panel.tertiary}
                      onChange={(v) => updateLocalTheme('panel', 'tertiary', v)}
                    />
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-ink mb-2">App Mobile (Rastreamento)</p>
                  <div className="grid grid-cols-3 gap-2 rounded-xl border border-line bg-subtle/80 p-3">
                    <ColorField
                      label="Primária"
                      value={localTheme.mobile.primary}
                      onChange={(v) => updateLocalTheme('mobile', 'primary', v)}
                    />
                    <ColorField
                      label="Secundária"
                      value={localTheme.mobile.secondary}
                      onChange={(v) => updateLocalTheme('mobile', 'secondary', v)}
                    />
                    <ColorField
                      label="Terciária"
                      value={localTheme.mobile.tertiary}
                      onChange={(v) => updateLocalTheme('mobile', 'tertiary', v)}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSaveSystemTheme}
                    disabled={isSaving}
                    className="flex-1 py-2.5 bg-purple-700 hover:bg-purple-800 disabled:bg-purple-400 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-purple-900/10"
                  >
                    {isSaving ? 'Salvando...' : 'Salvar Cores no Sistema'}
                  </button>
                </div>
                {saveStatus && (
                  <p className={`text-xs font-semibold text-center ${saveStatus.includes('Erro') ? 'text-red-600' : 'text-emerald-600'}`}>
                    {saveStatus}
                  </p>
                )}
              </div>
            </section>
          )}

          {/* Aparência do chat local */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wide text-ink-soft mb-3">
              Aparência Individual do Chat
            </h3>
            <p className="text-xs text-ink-soft mb-2">Temas rápidos</p>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {(
                [
                  ['purple', 'Roxo'],
                  ['blue', 'Azul'],
                  ['teal', 'Verde'],
                  ['slate', 'Cinza'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => applyPreset(id)}
                  className="rounded-lg border border-line p-2 text-[10px] font-semibold text-ink hover:border-purple-300 hover:bg-purple-50"
                >
                  <span
                    className="block h-6 rounded-md mb-1"
                    style={{
                      background: `linear-gradient(135deg, ${CHAT_PRESETS[id].outgoingFrom}, ${CHAT_PRESETS[id].outgoingTo})`,
                    }}
                  />
                  {label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-line bg-subtle/80 p-3">
              <ColorField
                label="Enviadas (início)"
                value={settings.outgoingFrom}
                onChange={(v) => updateSettings({ outgoingFrom: v })}
              />
              <ColorField
                label="Enviadas (fim)"
                value={settings.outgoingTo}
                onChange={(v) => updateSettings({ outgoingTo: v })}
              />
              <ColorField
                label="Texto enviadas"
                value={settings.outgoingText}
                onChange={(v) => updateSettings({ outgoingText: v })}
              />
              <ColorField
                label="Fundo do chat"
                value={settings.chatBg}
                onChange={(v) => updateSettings({ chatBg: v })}
              />
              <ColorField
                label="Recebidas (fundo)"
                value={settings.incomingBg}
                onChange={(v) => updateSettings({ incomingBg: v })}
              />
              <ColorField
                label="Recebidas (texto)"
                value={settings.incomingText}
                onChange={(v) => updateSettings({ incomingText: v })}
              />
            </div>
            <div className="mt-3">
              <p className="text-xs text-ink-soft mb-2">Tamanho do texto</p>
              <div className="flex gap-2">
                {(
                  [
                    ['sm', 'P'],
                    ['md', 'M'],
                    ['lg', 'G'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => updateSettings({ fontSize: id as FontSizeOption })}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border ${
                      settings.fontSize === id
                        ? 'border-purple-700 bg-purple-50 text-ink'
                        : 'border-line text-ink-soft hover:bg-subtle'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-bold uppercase tracking-wide text-ink-soft mb-2">
              Comportamento
            </h3>
            <div className="divide-y divide-line">
              <Toggle
                label="Enter envia mensagem"
                description="Desligado: use o botão Enviar"
                checked={settings.enterToSend}
                onChange={(v) => updateSettings({ enterToSend: v })}
              />
              <Toggle
                label="Rolagem automática"
                description="Ir para a última mensagem ao receber"
                checked={settings.autoScroll}
                onChange={(v) => updateSettings({ autoScroll: v })}
              />
              <Toggle
                label="Modo compacto"
                description="Menos espaço entre mensagens"
                checked={settings.compactMode}
                onChange={(v) => updateSettings({ compactMode: v })}
              />
              <Toggle
                label="Som de notificação"
                description="Tocar aviso sonoro ao receber novas mensagens"
                checked={settings.soundEnabled}
                onChange={(v) => updateSettings({ soundEnabled: v })}
              />
            </div>
          </section>

          <section>
            <h3 className="text-xs font-bold uppercase tracking-wide text-ink-soft mb-2">
              Conta
            </h3>
            <div className="rounded-xl border border-line bg-subtle/80 p-4 text-sm space-y-3">
              <div className="flex items-center gap-4">
                <ProfileAvatar
                  name={user?.name || 'Usuário'}
                  avatarUrl={avatarUrl}
                  size="lg"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink truncate">{user?.name || '—'}</p>
                  <p className="text-xs text-ink-soft truncate">{user?.email}</p>
                  <p className="text-xs text-purple-700 mt-1">{roleLabel(role)}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <label className="inline-flex">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    disabled={isUploading}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (!file) return;
                      try {
                        await uploadAvatar(file);
                      } catch {
                        /* statusMessage já preenchida no provider */
                      }
                    }}
                  />
                  <span className="cursor-pointer rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:bg-subtle">
                    {isUploading ? 'Enviando...' : 'Alterar foto'}
                  </span>
                </label>
                {avatarUrl && (
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => removeAvatar().catch(() => undefined)}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    Remover foto
                  </button>
                )}
              </div>

              {statusMessage && (
                <p className={`text-xs ${statusMessage.includes('Falha') || statusMessage.includes('Erro') ? 'text-red-600' : 'text-emerald-600'}`}>
                  {statusMessage}
                </p>
              )}

              <p className="text-[10px] text-ink-faint">
                A mesma foto aparece no app mobile e no painel web.
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="mt-3 w-full py-2 text-sm font-medium text-red-700 border border-red-200 rounded-lg hover:bg-red-50"
            >
              Sair da conta
            </button>
          </section>

          <section>
            <button
              type="button"
              onClick={() => {
                resetSettings();
              }}
              className="w-full py-2 text-sm text-ink-soft border border-line rounded-lg hover:bg-subtle"
            >
              Restaurar aparência padrão
            </button>
            <p className="text-[10px] text-ink-faint text-center mt-2">
              SacTracker · preferências locais
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
