export const MODULE_PERMISSIONS = ['ADMIN', 'INBOX', 'FINANCEIRO', 'COBRANCA', 'MONITORAMENTO'] as const;
export type ModulePermission = (typeof MODULE_PERMISSIONS)[number];

export function isModulePermission(value: string): value is ModulePermission {
  return MODULE_PERMISSIONS.includes(value as ModulePermission);
}

export function parsePermissions(values: string[] | null | undefined): ModulePermission[] {
  if (!Array.isArray(values)) return ['INBOX'];
  const valid = values.filter(isModulePermission);
  return valid.length > 0 ? valid : ['INBOX'];
}

export function getHomePath(permissions: ModulePermission[]): string {
  if (permissions.includes('INBOX')) return '/inbox';
  if (permissions.includes('FINANCEIRO')) return '/financeiro';
  if (permissions.includes('COBRANCA')) return '/cobranca';
  if (permissions.includes('MONITORAMENTO')) return '/monitoramento';
  if (permissions.includes('ADMIN')) return '/admin/usuarios';
  return '/login';
}

export function canAccessInbox(permissions: ModulePermission[]): boolean {
  return permissions.includes('INBOX') || permissions.includes('ADMIN');
}

export function canAccessFinanceiro(permissions: ModulePermission[]): boolean {
  return permissions.includes('FINANCEIRO') || permissions.includes('ADMIN');
}

export function canAccessCobranca(permissions: ModulePermission[]): boolean {
  return permissions.includes('COBRANCA') || permissions.includes('ADMIN');
}

export function canAccessMonitoramento(permissions: ModulePermission[]): boolean {
  return permissions.includes('MONITORAMENTO') || permissions.includes('ADMIN');
}

export function canEnviarComandoSms(permissions: ModulePermission[]): boolean {
  return permissions.includes('FINANCEIRO') || permissions.includes('MONITORAMENTO') || permissions.includes('ADMIN');
}

export function roleLabel(permissions: ModulePermission[]): string {
  if (permissions.includes('ADMIN')) return 'Administrador';
  if (permissions.includes('FINANCEIRO')) return 'Financeiro';
  if (permissions.includes('COBRANCA')) return 'Cobrança';
  if (permissions.includes('MONITORAMENTO')) return 'Monitoramento';
  return 'Atendente';
}
