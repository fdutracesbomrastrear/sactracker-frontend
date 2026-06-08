import { AppShell } from '@/modules/core/components/AppShell';

export default function FinanceiroLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell allowedPermissions={['FINANCEIRO']}>
      {children}
    </AppShell>
  );
}
