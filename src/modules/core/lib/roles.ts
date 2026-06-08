// Permissões de módulo (acesso à aba/seção)
export const MODULE_PERMISSIONS = ['ADMIN', 'INBOX', 'FINANCEIRO', 'COBRANCA', 'MONITORAMENTO'] as const;
export type ModulePermission = (typeof MODULE_PERMISSIONS)[number];

// Sub-permissões granulares dentro de cada módulo
export const SUB_PERMISSIONS = [
  'MONITORAMENTO_BLOQUEAR',
  'FINANCEIRO_VER_FATURAS_VENCIDAS',
  'FINANCEIRO_VER_FATURAS_A_VENCER',
  'FINANCEIRO_ENVIAR_COBRANCA',
  'SKYEYER_SIMULAR',
  'SKYEYER_MONITORAR_REAL',
  'SKYEYER_PROTOCOLO_EMERGENCIA',
  'SKYEYER_ALERTA_RISCO',
  'MONITORAMENTO_SAUDE_FROTA',
] as const;
export type SubPermission = (typeof SUB_PERMISSIONS)[number];

export function isModulePermission(value: string): value is ModulePermission {
  return MODULE_PERMISSIONS.includes(value as ModulePermission);
}

export function isSubPermission(value: string): value is SubPermission {
  return SUB_PERMISSIONS.includes(value as SubPermission);
}

export function parsePermissions(values: string[] | null | undefined): string[] {
  if (!Array.isArray(values)) return ['INBOX'];
  const valid = values.filter(v => isModulePermission(v) || isSubPermission(v));
  return valid.length > 0 ? valid : ['INBOX'];
}

export function parseModulePermissions(values: string[] | null | undefined): ModulePermission[] {
  if (!Array.isArray(values)) return ['INBOX'];
  const valid = values.filter(isModulePermission) as ModulePermission[];
  return valid.length > 0 ? valid : ['INBOX'];
}

// ─── Verificadores de acesso a módulo ───────────────────────────────────────

function isAdmin(permissions: string[]): boolean {
  return permissions.includes('ADMIN');
}

export function canAccessInbox(permissions: string[]): boolean {
  return isAdmin(permissions) || permissions.includes('INBOX');
}

export function canAccessFinanceiro(permissions: string[]): boolean {
  return isAdmin(permissions) || permissions.includes('FINANCEIRO');
}

export function canAccessCobranca(permissions: string[]): boolean {
  return isAdmin(permissions) || permissions.includes('COBRANCA');
}

export function canAccessMonitoramento(permissions: string[]): boolean {
  return isAdmin(permissions) || permissions.includes('MONITORAMENTO');
}

// ─── Verificadores de sub-permissão ─────────────────────────────────────────

/** Pode bloquear/desbloquear veículo */
export function canBloquearVeiculo(permissions: string[]): boolean {
  if (isAdmin(permissions)) return true;
  return permissions.includes('MONITORAMENTO_BLOQUEAR');
}

/** Pode ver faturas vencidas */
export function canVerFaturasVencidas(permissions: string[]): boolean {
  if (isAdmin(permissions)) return true;
  return permissions.includes('FINANCEIRO_VER_FATURAS_VENCIDAS');
}

/** Pode ver faturas em aberto (a vencer) */
export function canVerFaturasAVencer(permissions: string[]): boolean {
  if (isAdmin(permissions)) return true;
  return permissions.includes('FINANCEIRO_VER_FATURAS_A_VENCER');
}

/** Pode enviar cobrança manual */
export function canEnviarCobranca(permissions: string[]): boolean {
  if (isAdmin(permissions)) return true;
  return permissions.includes('FINANCEIRO_ENVIAR_COBRANCA');
}

/** @deprecated Use canBloquearVeiculo() */
export function canEnviarComandoSms(permissions: string[]): boolean {
  return canBloquearVeiculo(permissions);
}

/** Pode simular rotas no Skyeyer */
export function canSimularSkyeyer(permissions: string[]): boolean {
  if (isAdmin(permissions)) return true;
  return permissions.includes('SKYEYER_SIMULAR');
}

/** Pode monitorar telemetria real de clientes no Skyeyer */
export function canMonitorarRealSkyeyer(permissions: string[]): boolean {
  if (isAdmin(permissions)) return true;
  return permissions.includes('SKYEYER_MONITORAR_REAL');
}

/** Pode acionar protocolo de emergência do Skyeyer */
export function canAcionarEmergenciaSkyeyer(permissions: string[]): boolean {
  if (isAdmin(permissions)) return true;
  return permissions.includes('SKYEYER_PROTOCOLO_EMERGENCIA');
}

/** Pode acionar alerta de risco do Skyeyer */
export function canAcionarAlertaSkyeyer(permissions: string[]): boolean {
  if (isAdmin(permissions)) return true;
  return permissions.includes('SKYEYER_ALERTA_RISCO');
}

/** Pode acessar saúde da frota */
export function canAccessSaudeFrota(permissions: string[]): boolean {
  if (isAdmin(permissions)) return true;
  return permissions.includes('MONITORAMENTO_SAUDE_FROTA');
}


export function getHomePath(permissions: string[]): string {
  if (isAdmin(permissions)) return '/admin/dashboard';
  if (permissions.includes('INBOX')) return '/inbox';
  if (permissions.includes('FINANCEIRO')) return '/financeiro';
  if (permissions.includes('COBRANCA')) return '/cobranca';
  if (permissions.includes('MONITORAMENTO')) return '/monitoramento';
  return '/login';
}

export function roleLabel(permissions: string[]): string {
  if (isAdmin(permissions)) return 'Administrador';
  if (permissions.includes('FINANCEIRO')) return 'Financeiro';
  if (permissions.includes('COBRANCA')) return 'Cobrança';
  if (permissions.includes('MONITORAMENTO')) return 'Monitoramento';
  return 'Atendente';
}
