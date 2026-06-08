import { apiFetchJSON } from '@/modules/core/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export type AiContext = {
  id: string;
  title: string;
  content: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AiPlan = {
  id: string;
  name: string;
  adesao: string;
  mensalidade: string;
  detalhes: string;
  faq?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AiAuditLog = {
  id: string;
  status: string;
  mode: string;
  botState: unknown;
  contact: {
    id: string;
    name: string;
    phone: string;
  };
  messages: {
    id: string;
    content: string;
    fromMe: boolean;
    createdAt: string;
  }[];
  createdAt: string;
  updatedAt: string;
};

export const iaApi = {
  async getContexts(): Promise<AiContext[]> {
    return apiFetchJSON<AiContext[]>(`${API_URL}/api/ai/contexts`);
  },

  async createContext(data: { title: string; content: string; isActive?: boolean }): Promise<AiContext> {
    return apiFetchJSON<AiContext>(`${API_URL}/api/ai/contexts`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateContext(id: string, data: { title?: string; content?: string; isActive?: boolean }): Promise<AiContext> {
    return apiFetchJSON<AiContext>(`${API_URL}/api/ai/contexts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteContext(id: string): Promise<void> {
    await apiFetchJSON(`${API_URL}/api/ai/contexts/${id}`, { method: 'DELETE' });
  },

  async getPlans(): Promise<AiPlan[]> {
    return apiFetchJSON<AiPlan[]>(`${API_URL}/api/ai/plans`);
  },

  async createPlan(data: { name: string; adesao: string; mensalidade: string; detalhes: string; faq?: string; isActive?: boolean }): Promise<AiPlan> {
    return apiFetchJSON<AiPlan>(`${API_URL}/api/ai/plans`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updatePlan(id: string, data: { name?: string; adesao?: string; mensalidade?: string; detalhes?: string; faq?: string; isActive?: boolean }): Promise<AiPlan> {
    return apiFetchJSON<AiPlan>(`${API_URL}/api/ai/plans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deletePlan(id: string): Promise<void> {
    await apiFetchJSON(`${API_URL}/api/ai/plans/${id}`, { method: 'DELETE' });
  },

  async clearSessions(): Promise<void> {
    await apiFetchJSON(`${API_URL}/api/ai/clear-sessions`, { method: 'POST' });
  },

  async getAuditLogs(): Promise<AiAuditLog[]> {
    return apiFetchJSON<AiAuditLog[]>(`${API_URL}/api/ai/audit`);
  },
};
