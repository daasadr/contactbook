import { apiClient } from './client'
import type { ContactList, TemplateMeta } from '@/types'

export const listsApi = {
  getAll: () => apiClient.get<{ lists: ContactList[] }>('/lists'),

  getTemplates: () => apiClient.get<{ templates: TemplateMeta[] }>('/lists/templates'),

  getOne: (id: string) => apiClient.get<{ list: ContactList }>(`/lists/${id}`),

  create: (data: {
    name: string
    description?: string
    template_type: string
    icon?: string
    color?: string
  }) => apiClient.post<{ list: ContactList }>('/lists', data),

  update: (id: string, data: Partial<{ name: string; description: string; icon: string; color: string }>) =>
    apiClient.patch<{ list: ContactList }>(`/lists/${id}`, data),

  delete: (id: string) => apiClient.delete(`/lists/${id}`),
}
