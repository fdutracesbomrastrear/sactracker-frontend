import { AuthGuard } from '@/components/AuthGuard';

export default function InboxLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRoles={['ATENDENTE', 'FINANCEIRO', 'ADMIN']}>
      {children}
    </AuthGuard>
  );
}
