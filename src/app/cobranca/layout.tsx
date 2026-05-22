import { AuthGuard } from '@/modules/core/components/AuthGuard';

export default function CobrancaLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedPermissions={['COBRANCA']}>
      {children}
    </AuthGuard>
  );
}
