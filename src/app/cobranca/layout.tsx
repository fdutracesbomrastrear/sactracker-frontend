import { AuthGuard } from '@/components/AuthGuard';

export default function CobrancaLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
