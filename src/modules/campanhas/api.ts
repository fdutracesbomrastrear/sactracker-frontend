import { apiFetch } from '@/modules/core/lib/api';

export type CampaignMessage = {
  id: string;
  phone: string;
  content: string;
  status: 'PENDING' | 'SENT' | 'FAILED';
  error: string | null;
  sentAt: string | null;
};

export type Campaign = {
  id: string;
  name: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'PAUSED';
  totalCount: number;
  sentCount: number;
  failedCount: number;
  createdAt: string;
  createdBy?: { name: string };
  messages?: CampaignMessage[];
};

export async function fetchCampaigns(): Promise<Campaign[]> {
  const res = await apiFetch('/api/campanhas');
  return res.json();
}

export async function fetchCampaignById(id: string): Promise<Campaign> {
  const res = await apiFetch(`/api/campanhas/${id}`);
  return res.json();
}

export async function createCampaign(name: string, messages: { phone: string; content: string }[]): Promise<Campaign> {
  const res = await apiFetch('/api/campanhas', {
    method: 'POST',
    body: JSON.stringify({ name, messages }),
  });
  return res.json();
}

export async function updateCampaignStatus(id: string, status: string): Promise<Campaign> {
  const res = await apiFetch(`/api/campanhas/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
  return res.json();
}
