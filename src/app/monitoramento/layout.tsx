import { AppShell } from '@/modules/core/components/AppShell';

export default function MonitoramentoLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell allowedPermissions={['MONITORAMENTO']}>
      {children}
    </AppShell>
  );
}
