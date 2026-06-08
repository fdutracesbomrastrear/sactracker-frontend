'use client';

import { PanelSettingsProvider } from '@/modules/core/hooks/PanelSettingsProvider';
import { ProfileProvider } from '@/modules/core/hooks/ProfileProvider';
import { ThemeProvider } from '@/modules/core/hooks/ThemeProvider';
import { WhatsAppQrOverlay } from '@/modules/core/components/WhatsAppQrOverlay';

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ProfileProvider>
        <PanelSettingsProvider>
          {children}
          <WhatsAppQrOverlay />
        </PanelSettingsProvider>
      </ProfileProvider>
    </ThemeProvider>
  );
}
