'use client';

import { PanelSettingsProvider } from '@/components/PanelSettingsProvider';

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return <PanelSettingsProvider>{children}</PanelSettingsProvider>;
}
