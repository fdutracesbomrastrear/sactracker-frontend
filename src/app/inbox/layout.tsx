import { AuthGuard } from '@/components/AuthGuard';

export default function InboxLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
