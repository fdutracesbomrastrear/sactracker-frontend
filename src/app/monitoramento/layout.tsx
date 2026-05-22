import { AuthGuard } from '@/modules/core/components/AuthGuard';

export default function MonitoramentoLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedPermissions={['MONITORAMENTO']}>
      {children}
    </AuthGuard>
  );
}
