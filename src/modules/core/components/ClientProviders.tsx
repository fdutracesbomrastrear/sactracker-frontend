'use client';

import { PanelSettingsProvider } from '@/modules/core/hooks/PanelSettingsProvider';
import { WhatsAppQrOverlay } from '@/modules/core/components/WhatsAppQrOverlay';

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <PanelSettingsProvider>
      {children}
      <WhatsAppQrOverlay />
    </PanelSettingsProvider>
  );
}
