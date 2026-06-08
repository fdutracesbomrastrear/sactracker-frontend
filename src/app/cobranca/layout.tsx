import { AppShell } from '@/modules/core/components/AppShell';

export default function CobrancaLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell allowedPermissions={['COBRANCA']}>
      {children}
    </AppShell>
  );
}
