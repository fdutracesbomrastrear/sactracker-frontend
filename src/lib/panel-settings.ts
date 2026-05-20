export type FontSizeOption = 'sm' | 'md' | 'lg';

export type PanelSettings = {
  outgoingFrom: string;
  outgoingTo: string;
  outgoingText: string;
  incomingBg: string;
  incomingText: string;
  chatBg: string;
  fontSize: FontSizeOption;
  compactMode: boolean;
  enterToSend: boolean;
  autoScroll: boolean;
  soundEnabled: boolean;
  showSidebarLabels: boolean;
};

export const DEFAULT_PANEL_SETTINGS: PanelSettings = {
  outgoingFrom: '#7c3aed',
  outgoingTo: '#5b21b6',
  outgoingText: '#ffffff',
  incomingBg: '#ffffff',
  incomingText: '#1e293b',
  chatBg: '#e8edf4',
  fontSize: 'md',
  compactMode: false,
  enterToSend: true,
  autoScroll: true,
  soundEnabled: false,
  showSidebarLabels: false,
};

export type ChatPresetId = 'purple' | 'blue' | 'teal' | 'slate';

export const CHAT_PRESETS: Record<
  ChatPresetId,
  Pick<
    PanelSettings,
    'outgoingFrom' | 'outgoingTo' | 'outgoingText' | 'incomingBg' | 'incomingText' | 'chatBg'
  >
> = {
  purple: {
    outgoingFrom: '#7c3aed',
    outgoingTo: '#5b21b6',
    outgoingText: '#ffffff',
    incomingBg: '#ffffff',
    incomingText: '#1e293b',
    chatBg: '#e8edf4',
  },
  blue: {
    outgoingFrom: '#2563eb',
    outgoingTo: '#1d4ed8',
    outgoingText: '#ffffff',
    incomingBg: '#ffffff',
    incomingText: '#0f172a',
    chatBg: '#eff6ff',
  },
  teal: {
    outgoingFrom: '#0d9488',
    outgoingTo: '#0f766e',
    outgoingText: '#ffffff',
    incomingBg: '#ffffff',
    incomingText: '#134e4a',
    chatBg: '#f0fdfa',
  },
  slate: {
    outgoingFrom: '#475569',
    outgoingTo: '#334155',
    outgoingText: '#ffffff',
    incomingBg: '#f8fafc',
    incomingText: '#0f172a',
    chatBg: '#f1f5f9',
  },
};

const STORAGE_KEY = 'sactracker_panel_settings_v1';

export function loadPanelSettings(): PanelSettings {
  if (typeof window === 'undefined') return DEFAULT_PANEL_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PANEL_SETTINGS;
    return { ...DEFAULT_PANEL_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PANEL_SETTINGS;
  }
}

export function savePanelSettings(settings: PanelSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function fontSizeClass(size: FontSizeOption): string {
  if (size === 'sm') return 'text-[13px]';
  if (size === 'lg') return 'text-[17px]';
  return 'text-[15px]';
}

export function bubblePadding(compact: boolean): string {
  return compact ? 'px-3 py-2' : 'px-4 py-3';
}

export function messageGap(compact: boolean): string {
  return compact ? 'space-y-2' : 'space-y-3';
}
