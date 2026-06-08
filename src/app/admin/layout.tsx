import { AppShell } from '@/modules/core/components/AppShell';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell allowedPermissions={['ADMIN']}>
      {children}
    </AppShell>
  );
}
