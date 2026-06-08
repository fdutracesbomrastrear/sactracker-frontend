import { AppShell } from '@/modules/core/components/AppShell';

export default function InboxLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell allowedPermissions={['INBOX']}>
      {children}
    </AppShell>
  );
}
