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

type PanelSettingsContextValue = {
  settings: PanelSettings;
  updateSettings: (patch: Partial<PanelSettings>) => void;
  resetSettings: () => void;
  openSettings: () => void;
  closeSettings: () => void;
};

const PanelSettingsContext = createContext<PanelSettingsContextValue | null>(null);

export function PanelSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<PanelSettings>(DEFAULT_PANEL_SETTINGS);
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSettings(loadPanelSettings());
    setHydrated(true);
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

  const value = useMemo(
    () => ({
      settings: hydrated ? settings : DEFAULT_PANEL_SETTINGS,
      updateSettings,
      resetSettings,
      openSettings: () => setOpen(true),
      closeSettings: () => setOpen(false),
    }),
    [settings, hydrated, updateSettings, resetSettings]
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
