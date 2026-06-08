import { apiFetchJSON, apiFetch } from '@/modules/core/lib/api';

export interface QuickResponseItem {
  id: string;
  shortcut: string;
  text: string;
  createdAt: string;
  updatedAt: string;
}

export async function fetchQuickResponses(): Promise<QuickResponseItem[]> {
  return apiFetchJSON<QuickResponseItem[]>('/api/quick-responses');
}

export async function createQuickResponse(payload: { shortcut: string; text: string }): Promise<QuickResponseItem> {
  return apiFetchJSON<QuickResponseItem>('/api/quick-responses', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateQuickResponse(id: string, payload: { shortcut: string; text: string }): Promise<QuickResponseItem> {
  return apiFetchJSON<QuickResponseItem>(`/api/quick-responses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteQuickResponse(id: string): Promise<void> {
  await apiFetch(`/api/quick-responses/${id}`, {
    method: 'DELETE',
  });
}
