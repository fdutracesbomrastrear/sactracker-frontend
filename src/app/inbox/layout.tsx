import { AuthGuard } from '@/modules/core/components/AuthGuard';

export default function InboxLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedPermissions={['INBOX']}>
      {children}
    </AuthGuard>
  );
}
