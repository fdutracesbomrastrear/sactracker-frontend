'use client';

import { useRouter } from 'next/navigation';
import {
  CHAT_PRESETS,
  ChatPresetId,
  FontSizeOption,
} from '@/lib/panel-settings';
import { clearSession, getUser } from '@/lib/auth';
import { roleLabel, parseUserRole } from '@/lib/roles';
import { usePanelSettings } from '@/components/PanelSettingsProvider';

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
        <span className="text-sm font-medium text-slate-800 block">{label}</span>
        {description && <span className="text-xs text-slate-500">{description}</span>}
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
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-2 text-xs text-slate-600">
      <span>{label}</span>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-12 rounded border border-slate-200 cursor-pointer"
      />
    </label>
  );
}

export function PanelSettingsModal({ onClose }: Props) {
  const router = useRouter();
  const { settings, updateSettings, resetSettings } = usePanelSettings();
  const user = getUser();
  const role = parseUserRole(user?.role);

  function applyPreset(id: ChatPresetId) {
    updateSettings(CHAT_PRESETS[id]);
  }

  function handleLogout() {
    clearSession();
    router.push('/login');
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        aria-label="Fechar configurações"
        onClick={onClose}
      />
      <div className="relative z-[101] w-full max-w-lg max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-2xl flex flex-col">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-bold text-purple-950">Configurações</h2>
            <p className="text-xs text-slate-500">Preferências salvas neste navegador</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3">
              Aparência do chat
            </h3>
            <p className="text-xs text-slate-500 mb-2">Temas rápidos</p>
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
                  className="rounded-lg border border-slate-200 p-2 text-[10px] font-semibold text-slate-700 hover:border-purple-300 hover:bg-purple-50"
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
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
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
                label="Recebidas"
                value={settings.incomingBg}
                onChange={(v) => updateSettings({ incomingBg: v })}
              />
              <ColorField
                label="Fundo do chat"
                value={settings.chatBg}
                onChange={(v) => updateSettings({ chatBg: v })}
              />
            </div>
            <div className="mt-3">
              <p className="text-xs text-slate-500 mb-2">Tamanho do texto</p>
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
                        ? 'border-purple-700 bg-purple-50 text-purple-900'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">
              Comportamento
            </h3>
            <div className="divide-y divide-slate-100">
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
                description="Em breve — preferência já salva"
                checked={settings.soundEnabled}
                onChange={(v) => updateSettings({ soundEnabled: v })}
              />
            </div>
          </section>

          <section>
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">
              Conta
            </h3>
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-sm">
              <p className="font-semibold text-slate-800">{user?.name || '—'}</p>
              <p className="text-xs text-slate-500">{user?.email}</p>
              <p className="text-xs text-purple-700 mt-1">{roleLabel(role)}</p>
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
              className="w-full py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              Restaurar aparência padrão
            </button>
            <p className="text-[10px] text-slate-400 text-center mt-2">
              SacTracker · preferências locais
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
