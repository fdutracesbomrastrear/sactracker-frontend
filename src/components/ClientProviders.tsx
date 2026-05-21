'use client';

import { PanelSettingsProvider } from '@/components/PanelSettingsProvider';
import { WhatsAppQrOverlay } from '@/components/WhatsAppQrOverlay';

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <PanelSettingsProvider>
      {children}
      <WhatsAppQrOverlay />
    </PanelSettingsProvider>
  );
}
