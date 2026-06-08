'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  DEFAULT_PANEL_SETTINGS,
  loadPanelSettings,
  PanelSettings,
  savePanelSettings,
} from '@/modules/core/lib/panel-settings';
import { PanelSettingsModal } from '@/modules/core/components/PanelSettingsModal';
import { apiFetch } from '@/modules/core/lib/api';

export type ColorTheme = {
  primary: string;
  secondary: string;
  tertiary: string;
};

export type SystemTheme = {
  panel: ColorTheme;
  mobile: ColorTheme;
};

export const DEFAULT_SYSTEM_THEME: SystemTheme = {
  panel: {
    primary: '#71218f',
    secondary: '#c2aa0e',
    tertiary: '#1a0ec2',
  },
  mobile: {
    primary: '#71218f',
    secondary: '#c2aa0e',
    tertiary: '#1a0ec2',
  },
};

type PanelSettingsContextValue = {
  settings: PanelSettings;
  updateSettings: (patch: Partial<PanelSettings>) => void;
  resetSettings: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  systemTheme: SystemTheme;
  updateSystemTheme: (theme: SystemTheme) => Promise<void>;
};

const PanelSettingsContext = createContext<PanelSettingsContextValue | null>(null);

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const cleanHex = hex.replace('#', '');
  let r = parseInt(cleanHex.slice(0, 2), 16) / 255;
  let g = parseInt(cleanHex.slice(2, 4), 16) / 255;
  let b = parseInt(cleanHex.slice(4, 6), 16) / 255;
  let max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    let d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function applyThemeColorsToDom(colors: ColorTheme) {
  if (typeof window === 'undefined') return;
  const root = document.documentElement;

  // Primary
  try {
    const { h, s } = hexToHsl(colors.primary);
    root.style.setProperty('--color-purple-50', `hsl(${h}, ${s}%, 97%)`);
    root.style.setProperty('--color-purple-100', `hsl(${h}, ${s}%, 93%)`);
    root.style.setProperty('--color-purple-200', `hsl(${h}, ${s}%, 85%)`);
    root.style.setProperty('--color-purple-300', `hsl(${h}, ${s}%, 72%)`);
    root.style.setProperty('--color-purple-400', `hsl(${h}, ${s}%, 60%)`);
    root.style.setProperty('--color-purple-500', `hsl(${h}, ${s}%, 48%)`);
    root.style.setProperty('--color-purple-600', colors.primary);
    root.style.setProperty('--color-purple-700', `hsl(${h}, ${s}%, 28%)`);
    root.style.setProperty('--color-purple-800', `hsl(${h}, ${s}%, 18%)`);
    root.style.setProperty('--color-purple-900', `hsl(${h}, ${s}%, 10%)`);
    root.style.setProperty('--color-purple-950', `hsl(${h}, ${s}%, 5%)`);
  } catch (e) {
    console.error('Error applying primary colors:', e);
  }

  // Secondary
  try {
    const { h, s } = hexToHsl(colors.secondary);
    root.style.setProperty('--color-amber-50', `hsl(${h}, ${s}%, 97%)`);
    root.style.setProperty('--color-amber-100', `hsl(${h}, ${s}%, 93%)`);
    root.style.setProperty('--color-amber-200', `hsl(${h}, ${s}%, 85%)`);
    root.style.setProperty('--color-amber-300', `hsl(${h}, ${s}%, 72%)`);
    root.style.setProperty('--color-amber-400', colors.secondary);
    root.style.setProperty('--color-amber-500', `hsl(${h}, ${s}%, 48%)`);
    root.style.setProperty('--color-amber-600', `hsl(${h}, ${s}%, 38%)`);
    root.style.setProperty('--color-amber-700', `hsl(${h}, ${s}%, 28%)`);
    root.style.setProperty('--color-amber-800', `hsl(${h}, ${s}%, 18%)`);
    root.style.setProperty('--color-amber-900', `hsl(${h}, ${s}%, 10%)`);
    root.style.setProperty('--color-amber-950', `hsl(${h}, ${s}%, 5%)`);
  } catch (e) {
    console.error('Error applying secondary colors:', e);
  }

  // Tertiary
  try {
    const { h, s } = hexToHsl(colors.tertiary);
    root.style.setProperty('--color-slate-50', `hsl(${h}, ${s}%, 97%)`);
    root.style.setProperty('--color-slate-100', `hsl(${h}, ${s}%, 93%)`);
    root.style.setProperty('--color-slate-200', `hsl(${h}, ${s}%, 85%)`);
    root.style.setProperty('--color-slate-300', `hsl(${h}, ${s}%, 72%)`);
    root.style.setProperty('--color-slate-400', `hsl(${h}, ${s}%, 60%)`);
    root.style.setProperty('--color-slate-500', colors.tertiary);
    root.style.setProperty('--color-slate-600', `hsl(${h}, ${s}%, 38%)`);
    root.style.setProperty('--color-slate-700', `hsl(${h}, ${s}%, 28%)`);
    root.style.setProperty('--color-slate-800', `hsl(${h}, ${s}%, 18%)`);
    root.style.setProperty('--color-slate-900', `hsl(${h}, ${s}%, 10%)`);
    root.style.setProperty('--color-slate-950', `hsl(${h}, ${s}%, 5%)`);
  } catch (e) {
    console.error('Error applying tertiary colors:', e);
  }
}

export function PanelSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<PanelSettings>(DEFAULT_PANEL_SETTINGS);
  const [systemTheme, setSystemTheme] = useState<SystemTheme>(DEFAULT_SYSTEM_THEME);
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Load local settings and system theme
  useEffect(() => {
    setSettings(loadPanelSettings());
    setHydrated(true);

    async function loadSystemTheme() {
      try {
        const res = await apiFetch('/api/v1/theme');
        if (res.ok) {
          const theme: SystemTheme = await res.json();
          setSystemTheme(theme);
          applyThemeColorsToDom(theme.panel);
        }
      } catch (err) {
        console.error('Error loading system theme:', err);
      }
    }
    loadSystemTheme();
  }, []);

  const persist = useCallback((next: PanelSettings) => {
    setSettings(next);
    savePanelSettings(next);
  }, []);

  const updateSettings = useCallback(
    (patch: Partial<PanelSettings>) => {
      setSettings((prev) => {
        const next = { ...prev, ...patch };
        savePanelSettings(next);
        return next;
      });
    },
    []
  );

  const resetSettings = useCallback(() => {
    persist(DEFAULT_PANEL_SETTINGS);
  }, [persist]);

  const updateSystemTheme = useCallback(async (newTheme: SystemTheme) => {
    try {
      const res = await apiFetch('/api/v1/theme', {
        method: 'POST',
        body: JSON.stringify(newTheme),
      });
      if (!res.ok) throw new Error('Falha ao salvar tema no servidor');
      const savedTheme: SystemTheme = await res.json();
      setSystemTheme(savedTheme);
      applyThemeColorsToDom(savedTheme.panel);
    } catch (err) {
      console.error(err);
      throw err;
    }
  }, []);

  const value = useMemo(
    () => ({
      settings: hydrated ? settings : DEFAULT_PANEL_SETTINGS,
      updateSettings,
      resetSettings,
      openSettings: () => setOpen(true),
      closeSettings: () => setOpen(false),
      systemTheme,
      updateSystemTheme,
    }),
    [settings, hydrated, updateSettings, resetSettings, systemTheme, updateSystemTheme]
  );

  return (
    <PanelSettingsContext.Provider value={value}>
      {children}
      {open && <PanelSettingsModal onClose={() => setOpen(false)} />}
    </PanelSettingsContext.Provider>
  );
}

export function usePanelSettings() {
  const ctx = useContext(PanelSettingsContext);
  if (!ctx) {
    throw new Error('usePanelSettings deve ser usado dentro de PanelSettingsProvider');
  }
  return ctx;
}
