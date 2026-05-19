import { AuthGuard } from '@/components/AuthGuard';

export default function FinanceiroLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
