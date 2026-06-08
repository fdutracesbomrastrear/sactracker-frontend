import { AppShell } from '@/modules/core/components/AppShell';

export default function SaudeFrotaLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell allowedPermissions={['MONITORAMENTO']}>
      {children}
    </AppShell>
  );
}
