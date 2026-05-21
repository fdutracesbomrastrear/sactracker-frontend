export const USER_ROLES = ['ATENDENTE', 'FINANCEIRO', 'ADMIN'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export function isUserRole(value: string): value is UserRole {
  return USER_ROLES.includes(value as UserRole);
}

export function parseUserRole(value: string | undefined | null): UserRole {
  if (value && isUserRole(value)) return value;
  return 'ATENDENTE';
}

export function getHomePath(role: UserRole): string {
  return '/inbox';
}

export function canAccessInbox(role: UserRole): boolean {
  return role === 'ATENDENTE' || role === 'FINANCEIRO' || role === 'ADMIN';
}

export function canAccessFinanceiro(role: UserRole): boolean {
  return true;
}

export function canAccessCobranca(role: UserRole): boolean {
  return true;
}

export function canAccessMonitoramento(role: UserRole): boolean {
  return role === 'ATENDENTE' || role === 'FINANCEIRO' || role === 'ADMIN';
}

export function canEnviarComandoSms(role: UserRole): boolean {
  return role === 'FINANCEIRO' || role === 'ADMIN';
}

export function roleLabel(role: UserRole): string {
  if (role === 'FINANCEIRO') return 'Financeiro';
  if (role === 'ADMIN') return 'Administrador';
  return 'Atendente';
}
