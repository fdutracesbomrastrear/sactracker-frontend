import { AuthGuard } from '@/modules/core/components/AuthGuard';

export default function FinanceiroLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedPermissions={['FINANCEIRO']}>
      {children}
    </AuthGuard>
  );
}
