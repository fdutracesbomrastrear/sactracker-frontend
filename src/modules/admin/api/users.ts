import { apiFetch } from '@/modules/core/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export interface UserItem {
  id: string;
  name: string;
  email: string;
  permissions: string[]; // ModulePermission | SubPermission
  active: boolean;
  createdAt: string;
};

export async function fetchUsers(): Promise<UserItem[]> {
  const res = await apiFetch(`${API_URL}/api/users`);
  if (!res.ok) throw new Error('Falha ao carregar usuários');
  return res.json();
}

export async function createUser(data: any): Promise<UserItem> {
  const res = await apiFetch(`${API_URL}/api/users`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Falha ao criar usuário');
  }
  return res.json();
}

export async function updateUser(id: string, data: any): Promise<UserItem> {
  const res = await apiFetch(`${API_URL}/api/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Falha ao atualizar usuário');
  }
  return res.json();
}
