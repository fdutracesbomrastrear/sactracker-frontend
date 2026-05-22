import { AuthGuard } from '@/modules/core/components/AuthGuard';

export default function HistoricoLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedPermissions={['ADMIN']}>
      {children}
    </AuthGuard>
  );
}
